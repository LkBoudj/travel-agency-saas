import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppUserIdentityService } from '../auth/app-user-identity.service.js';
import { isRoleValidForAgency } from '../authorization/agency-permissions.service.js';
import type { InternalAuthUser } from '../auth/auth-user.js';
import {
  generateMemberInvitationCode,
  generateMemberInvitationToken,
  hashMemberInvitationToken,
} from './member-invitation-token.js';
import { MemberInvitationDeliveryService } from './member-invitation-delivery.js';
import type {
  AcceptMemberInvitationBody,
  CreateMemberInvitationBody,
  ListMemberInvitationsQuery,
} from './member-invitations.schemas.js';
import {
  MEMBER_INVITATION_SELECT,
  type MemberInvitationResponse,
  type MemberInvitationInspectResponse,
  type MemberInvitationAcceptResponse,
  type MemberInvitationRow,
} from './member-invitations.types.js';

const ACTIVE = 'ACTIVE';

/**
 * Consent-based member invitations for ONE agency.
 *
 * The invariants that shape this file:
 *
 * 1. Invitations are keyed to an EMAIL and never resolve a target account at
 *    creation time ("is this address on the platform?" must not be answerable
 *    through this surface). The only membership probe allowed is against THIS
 *    agency: an inviter may already see this agency's member list, so "already
 *    a member here" is not new information.
 * 2. The public inspect/accept endpoints are uniform for every valid token and
 *    take the invitee's email from the INVITATION, never from the request.
 * 3. The plaintext redemption token lives only in the delivery channel. It is
 *    stored as a SHA-256 hash, never returned, and never logged.
 * 4. Acceptance is ONE interactive transaction gated by a conditional update
 *    (`WHERE status='PENDING' AND expires_at > now()`), so a token can be
 *    redeemed exactly once and two competing acceptances serialize instead of
 *    double-provisioning a membership.
 * 5. Memberships are always created ACTIVE with `membershipType = EMPLOYEE` and
 *    the roles the invitation offered (re-validated through the tenancy rule).
 *    OWNER is never granted; platform roles are never assigned.
 */
@Injectable()
export class MemberInvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly identity: AppUserIdentityService,
    private readonly delivery: MemberInvitationDeliveryService,
  ) {}

  /**
   * Creates (or idempotently returns) a PENDING invitation for an email address.
   *
   * Idempotency: an unexpired PENDING invitation for the same email in THIS
   * agency is returned as-is (same 201), so double-clicking "invite" does not
   * multiply rows — the partial unique index
   * `agency_member_invitation_pending_agency_email_key` is the backstop.
   * Revoked/expired/ACCEPTED invitations free the address for a new invite.
   */
  async create(
    actorId: bigint,
    agency: { id: bigint; code: string; name: string },
    input: CreateMemberInvitationBody,
  ): Promise<MemberInvitationResponse> {
    const email = input.email;
    const expiresAt = this.invitationExpiresAt();

    // Only an in-agency membership check is allowed here; it reveals exactly
    // what the member list already shows this caller.
    const alreadyMember = await this.prisma.agencyMembership.findFirst({
      where: { agencyId: agency.id, appUser: { is: { email } } },
      select: { id: true },
    });
    if (alreadyMember) throw alreadyAgencyMemberError();

    const pending = await this.prisma.agencyMemberInvitation.findFirst({
      where: { agencyId: agency.id, email, status: 'PENDING' },
      select: MEMBER_INVITATION_SELECT,
    });
    if (pending) {
      if (this.isExpired(pending)) {
        // A dangling PENDING row is transitioned eagerly, never left to rot.
        await this.prisma.agencyMemberInvitation.update({
          where: { id: pending.id },
          data: { status: 'EXPIRED' },
        });
      } else {
        // Idempotent reuse: the same invitation is returned, not recreated.
        return toResponse(pending);
      }
    }

    const roleKeys = [...new Set(input.roleKeys)];
    const { token, tokenHash } = generateMemberInvitationToken();

    let created: MemberInvitationRow;
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const roleIds = await this.resolveInvitationRoleIds(tx, agency.id, roleKeys);
        return tx.agencyMemberInvitation.create({
          data: {
            code: generateMemberInvitationCode(),
            agencyId: agency.id,
            email,
            tokenHash,
            expiresAt,
            createdByUserId: actorId,
            roles: roleIds.length > 0
              ? { create: roleIds.map((roleId) => ({ roleId })) }
              : undefined,
          },
          select: MEMBER_INVITATION_SELECT,
        });
      });
    } catch (error) {
      // A concurrent invitation for the same email won the partial unique
      // index; if it produced a live pending row, hand that one back.
      const raced = await this.prisma.agencyMemberInvitation.findFirst({
        where: { agencyId: agency.id, email, status: 'PENDING' },
        select: MEMBER_INVITATION_SELECT,
      });
      if (raced && !this.isExpired(raced)) return toResponse(raced);
      if (this.isPendingUniqueConflict(error)) {
        throw new ConflictException({
          statusCode: 409,
          message: 'That address already has an outstanding invitation in this agency',
          errorCode: 'INVITATION_ALREADY_EXISTS',
        });
      }
      throw error;
    }

    const response = toResponse(created);
    await this.delivery.deliver({
      inviteeEmail: response.email,
      agencyName: agency.name,
      agencyCode: agency.code,
      token,
      expiresAt,
    });
    return response;
  }

  /** Lists invitations for one agency, newest first, with eager expiry. */
  async list(agencyId: bigint, query: ListMemberInvitationsQuery): Promise<MemberInvitationResponse[]> {
    const now = new Date();
    await this.prisma.agencyMemberInvitation.updateMany({
      where: { agencyId, status: 'PENDING', expiresAt: { lte: now } },
      data: { status: 'EXPIRED' },
    });

    const rows = await this.prisma.agencyMemberInvitation.findMany({
      where: { agencyId, ...(query.status ? { status: query.status } : {}) },
      select: MEMBER_INVITATION_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map(toResponse);
  }

  /**
   * Revokes a PENDING invitation. Only PENDING can be revoked; anything else is
   * "not actionable here" and gets the same 404, so an invitation's lifecycle
   * cannot be probed through this endpoint.
   */
  async revoke(agencyId: bigint, invitationCode: string): Promise<void> {
    const result = await this.prisma.agencyMemberInvitation.updateMany({
      where: { agencyId, code: invitationCode, status: 'PENDING' },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    if (result.count === 0) throw invitationNotFoundError();
  }

  /**
   * Public inspect for the token holder. Minimal by design: confirms the
   * invitation exists and is (still) live, and when it runs out. Unknown tokens
   * get the same 404 as every other missing resource.
   */
  async inspect(token: string): Promise<MemberInvitationInspectResponse> {
    const row = await this.findByToken(token);
    if (!row) throw invitationNotFoundError();

    const status = this.effectiveStatus(row);
    if (status === 'EXPIRED') await this.persistExpired(row);

    return {
      agency: { code: row.agency.code, name: row.agency.name },
      status,
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  /**
   * Redeems a token and provisions the membership in ONE interactive
   * transaction. See the class doc for the gate and the invariants.
   */
  async accept(
    token: string,
    caller: InternalAuthUser | null,
    body: AcceptMemberInvitationBody,
  ): Promise<MemberInvitationAcceptResponse> {
    const row = await this.findByToken(token);
    if (!row) throw invitationNotFoundError();

    // Classify fast-fail states OUTSIDE the transaction so nothing is written
    // and expired-pending rows are transitioned even though a throw inside the
    // transaction would roll back its own fixes.
    const preStatus = this.effectiveStatus(row);
    if (preStatus === 'ACCEPTED') throw invitationAlreadyAcceptedError();
    if (preStatus === 'REVOKED') throw invitationRevokedError();
    if (preStatus === 'EXPIRED') {
      await this.persistExpired(row);
      throw invitationExpiredError();
    }

    return this.prisma.$transaction(async (tx) => {
      // The atomic gate. Only one acceptance can flip this row to ACCEPTED; a
      // concurrent second redemption matches zero rows and falls into the
      // classification below. Rolling back the whole transaction also rolls
      // back this update, so a failed provisioning never consumes the token.
      const gate = await tx.agencyMemberInvitation.updateMany({
        where: { tokenHash: row.tokenHash, status: 'PENDING', expiresAt: { gt: new Date() } },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });
      if (gate.count !== 1) {
        const raced = await this.requireRow(tx, row.tokenHash);
        if (raced.status === 'ACCEPTED') throw invitationAlreadyAcceptedError();
        if (raced.status === 'REVOKED') throw invitationRevokedError();
        throw invitationExpiredError();
      }

      // Fresh above; re-read inside the transaction to work with consistent
      // rows and the offered roles.
      const invitation = await this.requireRow(tx, row.tokenHash);
      const agency = invitation.agency;
      if (agency.status !== ACTIVE) {
        throw new ForbiddenException({
          statusCode: 403,
          message: 'This agency is suspended and cannot accept members',
          errorCode: 'INVITATION_AGENCY_SUSPENDED',
        });
      }

      const invitedUserId = await this.resolveOrCreateAccount(tx, invitation, caller, body);
      if (invitedUserId === null) throw invitationPasswordRequiredError();

      const membership = await tx.agencyMembership
        .create({
          data: { agencyId: agency.id, appUserId: invitedUserId, membershipType: 'EMPLOYEE', status: ACTIVE },
          select: { id: true, createdAt: true },
        })
        .catch((error: unknown) => {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // Someone joined this agency between the invitation and this
            // acceptance; the work here is done by them already.
            throw alreadyAgencyMemberError();
          }
          throw error;
        });

      // The roles the invitation offered, re-validated through the tenancy rule
      // (the trigger `agency_member_invitation_role_scope` is the first lock;
      // this filter is the second).
      const validRoleIds = invitation.roles
        .map((link) => link.role)
        .filter((role) => isRoleValidForAgency(role, agency.id))
        .map((role) => role.id);
      if (validRoleIds.length > 0) {
        await tx.agencyRoleAssignment.createMany({
          data: validRoleIds.map((roleId) => ({ membershipId: membership.id, roleId })),
          skipDuplicates: true,
        });
      }

      return {
        status: 'ACCEPTED',
        agency: { code: agency.code, name: agency.name },
        membershipType: 'EMPLOYEE',
        membershipStatus: ACTIVE,
        roles: toRoles(invitation, agency.id),
        joinedAt: membership.createdAt.toISOString(),
      };
    });
  }

  // ------------------------------------------------------------------ helpers

  /**
   * The identity behind the invited email: its existing account, or a NEW one
   * created here from the invitation's own email and the accepted password.
   * Returns null when a new account is needed but no password was provided.
   */
  private async resolveOrCreateAccount(
    tx: Prisma.TransactionClient,
    invitation: MemberInvitationRow,
    caller: InternalAuthUser | null,
    body: AcceptMemberInvitationBody,
  ): Promise<bigint | null> {
    const existing = await tx.appUser.findUnique({
      where: { email: invitation.email },
      select: { id: true, status: true },
    });

    if (existing) {
      if (!caller) {
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Sign in as the invited account to accept this invitation',
          errorCode: 'INVITATION_AUTH_REQUIRED',
        });
      }
      if (BigInt(caller.id) !== existing.id) {
        throw new ForbiddenException({
          statusCode: 403,
          message: 'This invitation belongs to a different account',
          errorCode: 'INVITATION_EMAIL_MISMATCH',
        });
      }
      if (existing.status !== ACTIVE) {
        throw new ForbiddenException({
          statusCode: 403,
          message: 'This account is suspended and cannot join an agency',
          errorCode: 'INVITATION_ACCOUNT_SUSPENDED',
        });
      }
      return existing.id;
    }

    // No account yet: the password is the identity the invitee chooses, and the
    // email comes from the invitation and only from it.
    if (!body.password) return null;

    const prepared = await this.identity.prepare({
      email: invitation.email,
      password: body.password,
      firstName: body.firstName ?? null,
      lastName: body.lastName ?? null,
    });

    try {
      const created = await this.identity.create(tx, prepared);
      return created.id;
    } catch (error) {
      // Same-moment email race: a self-registration or agency creation won the
      // address while this invitation was being accepted.
      await this.identity.rethrowAsIdentityConflict(
        error,
        invitation.email,
        (email) => tx.appUser.findUnique({ where: { email } }).then((u) => u !== null),
      );
      throw error;
    }
  }

  /**
   * Resolves role keys to ids, accepting only roles assignable in THIS agency.
   * Same error contract as member role replacement: unknown keys and PLATFORM
   * or foreign-agency roles are distinct and explicit.
   */
  private async resolveInvitationRoleIds(
    tx: Prisma.TransactionClient,
    agencyId: bigint,
    roleKeys: string[],
  ): Promise<bigint[]> {
    if (roleKeys.length === 0) return [];

    const roles = await tx.role.findMany({
      where: { key: { in: roleKeys } },
      select: { id: true, key: true, scope: true, agencyId: true },
    });

    const assignable = roles.filter((role) => isRoleValidForAgency(role, agencyId));
    const assignableByKey = new Map(assignable.map((role) => [role.key, role]));

    const notAssignable = roles
      .filter((role) => !assignableByKey.has(role.key))
      .map((role) => role.key);
    if (notAssignable.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'One or more roles cannot be assigned in this agency',
        errorCode: 'ROLE_NOT_ASSIGNABLE_IN_AGENCY',
        roleKeys: notAssignable,
      });
    }

    const unknownKeys = roleKeys.filter((key) => !assignableByKey.has(key));
    if (unknownKeys.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Unknown agency role keys',
        errorCode: 'UNKNOWN_AGENCY_ROLE_KEYS',
        unknownKeys,
      });
    }

    return assignable.map((role) => role.id);
  }

  private async findByToken(token: string): Promise<MemberInvitationRow | null> {
    return this.prisma.agencyMemberInvitation.findUnique({
      where: { tokenHash: hashMemberInvitationToken(token) },
      select: MEMBER_INVITATION_SELECT,
    });
  }

  private async requireRow(
    tx: Prisma.TransactionClient,
    tokenHash: string,
  ): Promise<MemberInvitationRow> {
    const row = await tx.agencyMemberInvitation.findUnique({
      where: { tokenHash },
      select: MEMBER_INVITATION_SELECT,
    });
    if (!row) throw invitationNotFoundError();
    return row;
  }

  private async persistExpired(row: MemberInvitationRow): Promise<void> {
    await this.prisma.agencyMemberInvitation.update({
      where: { id: row.id },
      data: { status: 'EXPIRED' },
    });
  }

  /** Derived status: a PENDING row past its expiry behaves as EXPIRED. */
  private effectiveStatus(row: MemberInvitationRow): string {
    return this.isExpired(row) ? 'EXPIRED' : row.status;
  }

  private isExpired(row: MemberInvitationRow): boolean {
    return row.status === 'PENDING' && row.expiresAt.getTime() <= Date.now();
  }

  private isPendingUniqueConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      return false;
    }
    const target = error.meta?.target;
    if (typeof target === 'string') return target.includes('email');
    return Array.isArray(target) && target.some((t) => String(t).includes('email'));
  }

  private invitationExpiresAt(now = new Date()): Date {
    const hours = Number(this.config.get<string>('MEMBER_INVITE_EXPIRES_HOURS', '72'));
    const safe = Number.isFinite(hours) && hours > 0 ? hours : 72;
    return new Date(now.getTime() + safe * 3600_000);
  }
}

/** Projects a row onto the http contract, re-filtering offered roles. */
export function toResponse(row: MemberInvitationRow): MemberInvitationResponse {
  return {
    code: row.code,
    email: row.email,
    status: row.status,
    roles: toRoles(row, row.agency.id),
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function toRoles(row: MemberInvitationRow, agencyId: bigint) {
  return row.roles
    .map((link) => link.role)
    .filter((role) => isRoleValidForAgency(role, agencyId))
    .map((role) => ({ key: role.key, name: role.name }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function alreadyAgencyMemberError(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    message: 'This address is already a member of the agency',
    errorCode: 'ALREADY_AGENCY_MEMBER',
  });
}

function invitationNotFoundError(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    message: 'Invitation not found',
    errorCode: 'INVITATION_NOT_FOUND',
  });
}

function invitationExpiredError(): HttpException {
  return new HttpException(
    {
      statusCode: HttpStatus.GONE,
      message: 'This invitation has expired',
      errorCode: 'INVITATION_EXPIRED',
    },
    HttpStatus.GONE,
  );
}

function invitationRevokedError(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    message: 'This invitation has been revoked',
    errorCode: 'INVITATION_REVOKED',
  });
}

function invitationAlreadyAcceptedError(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    message: 'This invitation has already been accepted',
    errorCode: 'INVITATION_ALREADY_ACCEPTED',
  });
}

function invitationPasswordRequiredError(): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    message: 'A password is required to create your account',
    errorCode: 'INVITATION_PASSWORD_REQUIRED',
  });
}