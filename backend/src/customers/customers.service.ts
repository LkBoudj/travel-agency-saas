import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { generateCustomerCode } from './customer-code.js';
import {
  normalizeCustomerEmail,
  type CreateCustomerBody,
  type ListCustomersQuery,
  type UpdateCustomerBody,
} from './customers.schemas.js';
import {
  CUSTOMER_SELECT,
  toCustomerResponse,
  type CustomerResponse,
  type CustomerRow,
} from './customers.types.js';

/** A customer row widened with its database id for writes. */
type CustomerWithId = CustomerRow & { id: bigint };

/**
 * Agency business customers, scoped to ONE agency.
 *
 * Every method takes the `agencyId` the guard already resolved from the route,
 * and every query is filtered by it, so an operation issued through agency A's
 * route can only ever read or mutate agency A's rows. No method accepts an
 * agency identifier from a request body; the FK to `agency` cascades, so a
 * deleted agency takes its customers with it.
 *
 * A customer is deliberately NOT an identity: it never connects to `app_user`,
 * holds no credentials, and is never forced into the authentication model.
 * Archiving (`status = ARCHIVED`) is the deletion equivalent and is one-way in
 * the current model — there is no restore permission. Archived records stay
 * viewable by code but disappear from the active listing.
 */
@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(agencyId: bigint, query: ListCustomersQuery): Promise<CustomerResponse[]> {
    const search = query.search?.trim();
    const contains = search ? { contains: search, mode: 'insensitive' as const } : undefined;

    const customers = await this.prisma.customer.findMany({
      where: {
        agencyId,
        status: 'ACTIVE',
        ...(contains
          ? {
              OR: [
                { code: contains },
                { firstName: contains },
                { lastName: contains },
                { email: contains },
                { phone: contains },
              ],
            }
          : {}),
      },
      select: CUSTOMER_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return customers.map(toCustomerResponse);
  }

  async getByCode(agencyId: bigint, code: string): Promise<CustomerResponse> {
    return toCustomerResponse(await this.requireCustomer(agencyId, code));
  }

  async create(agencyId: bigint, input: CreateCustomerBody): Promise<CustomerResponse> {
    const customer = await this.prisma.customer.create({
      data: {
        agencyId,
        code: generateCustomerCode(),
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        email: normalizeCustomerEmail(input.email) ?? null,
        phone: input.phone ?? null,
        notes: input.notes ?? null,
      },
      select: CUSTOMER_SELECT,
    });

    return toCustomerResponse(customer);
  }

  /**
   * Partial update: fields the client omits are left untouched, `null` (or a
   * blank string, normalized by the schema) clears them. The email is
   * normalized again here so a stored value stays canonical even when the
   * caller bypassed the schema.
   */
  async update(
    agencyId: bigint,
    code: string,
    input: UpdateCustomerBody,
  ): Promise<CustomerResponse> {
    const customer = await this.requireCustomer(agencyId, code);

    const updated = await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: normalizeCustomerEmail(input.email),
        phone: input.phone,
        notes: input.notes,
      },
      select: CUSTOMER_SELECT,
    });

    return toCustomerResponse(updated);
  }

  /**
   * One-way soft-delete. There is deliberately no restore path in the current
   * permission vocabulary: `AGENCY_CUSTOMER_ARCHIVE` feeds this endpoint and
   * nothing undoes it. Archived records leave the active listing but can still
   * be read by code, so a stored link keeps working.
   */
  async archive(agencyId: bigint, code: string): Promise<CustomerResponse> {
    const customer = await this.requireCustomer(agencyId, code);

    if (customer.status === 'ARCHIVED') {
      throw new ConflictException({
        statusCode: 409,
        message: 'This customer is already archived',
        errorCode: 'CUSTOMER_ALREADY_ARCHIVED',
      });
    }

    const updated = await this.prisma.customer.update({
      where: { id: customer.id },
      data: { status: 'ARCHIVED' },
      select: CUSTOMER_SELECT,
    });

    return toCustomerResponse(updated);
  }

  // ------------------------------------------------------------------ helpers

  /**
   * Always scoped by `agencyId`, so another agency's customer (or a stale
   * `CUS-...` code) is a 404 here and never leaks existence.
   */
  private async requireCustomer(agencyId: bigint, code: string): Promise<CustomerWithId> {
    const customer = await this.prisma.customer.findFirst({
      where: { agencyId, code },
      select: { ...CUSTOMER_SELECT, id: true },
    });
    if (!customer) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'That customer was not found in this agency',
        errorCode: 'CUSTOMER_NOT_FOUND',
      });
    }
    return customer;
  }
}