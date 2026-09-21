import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { hash } from 'argon2';
import { Prisma } from '../src/generated/prisma/client.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/setup-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AGENCY_ADMIN_SYSTEM_KEY } from '../src/rbac/rbac.constants.js';
import { BookingsService } from '../src/bookings/bookings.service.js';
import { TravelersService } from '../src/travelers/travelers.service.js';

const write = (s: string) => process.stdout.write(s + '\n');
const hex = () => randomBytes(6).toString('hex').toUpperCase();
const code = (prefix: string) => `${prefix}-${hex()}`;

it('seed UI QA scenario', async () => { /* ctor cfg */ void configureApp; void PrismaService; void AppModule; void BookingsService; void TravelersService;

  const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication();
  configureApp(app);
  await app.init();

  const prisma = app.get(PrismaService);
  const bookings = app.get(BookingsService);
  const travelers = app.get(TravelersService);

  await prisma.agency.deleteMany({ where: { name: { startsWith: 'UI QA' } } });
  await prisma.appUser.deleteMany({ where: { email: { startsWith: 'qa.travelers.' } } });

  const passwordHash = await hash('QA-Travelers-Pass-1!');
  const owner = await prisma.appUser.create({
    data: {
      code: code('USR'),
      email: `qa.travelers.${hex()}.${hex()}@test.local`.toLowerCase(),
      passwordHash,
      firstName: 'QA',
      lastName: 'Traveler Agent',
    },
    select: { id: true, email: true },
  });
  const ownerEmail = owner.email;

  const agencyId = await prisma.$transaction(async (tx) => {
    const existing = await tx.role.findFirst({
      where: { systemKey: AGENCY_ADMIN_SYSTEM_KEY, scope: 'AGENCY', agencyId: null },
      select: { id: true },
    });
    const roleId =
      existing?.id ??
      (await tx.role.create({
        data: {
          key: 'AGENCY_OWNER',
          name: 'Agency Owner',
          scope: 'AGENCY',
          agencyId: null,
          systemKey: AGENCY_ADMIN_SYSTEM_KEY,
          description: 'Canonical global agency role (UI QA seed fallback)',
        },
        select: { id: true },
      })).id;

    const agency = await tx.agency.create({
      data: { code: code('AGY'), name: `UI QA Travelers ${hex()}` },
      select: { id: true, code: true },
    });
    const membership = await tx.agencyMembership.create({
      data: { agencyId: agency.id, appUserId: owner.id, membershipType: 'OWNER', status: 'ACTIVE' },
      select: { id: true },
    });
    await tx.agencyRoleAssignment.create({ data: { membershipId: membership.id, roleId } });
    return agency;
  });

  const customer = await prisma.customer.create({
    data: {
      code: code('CUS'), agencyId: agencyId.id,
      firstName: 'Live', lastName: 'Tester', status: 'ACTIVE',
    },
    select: { code: true },
  });

  const tour = await prisma.tour.create({
    data: {
      code: code('TUR'), agencyId: agencyId.id,
      name: `UI QA Tour ${hex()}`, status: 'PUBLISHED', format: 'experience',
      geographicScope: 'domestic', availabilityMode: 'scheduled',
    },
    select: { id: true },
  });

  const option = await prisma.pricingOption.create({
    data: { code: code('PRC'), tourId: tour.id, name: `QA Option ${hex()}`, basis: 'per_person' },
    select: { id: true, code: true },
  });

  const now = Date.now();
  const departure = await prisma.departure.create({
    data: {
      code: code('DEP'), tourId: tour.id, status: 'OPEN',
      startAt: new Date(now + 86_400_000 * 30), endAt: new Date(now + 86_400_000 * 35),
      capacity: 10,
    },
    select: { id: true, code: true },
  });
  await prisma.departurePrice.create({
    data: { departureId: departure.id, pricingOptionId: option.id, amount: new Prisma.Decimal(12000) },
  });

  const bookingFor = (seats: number) => ({
    customerCode: customer.code,
    departureCode: departure.code,
    reservedSeats: seats,
    pricingSelections: [option.code],
  });

  const pending = await bookings.create(agencyId.id, bookingFor(2), 'QA-SEED');
  const pendingTraveler = await travelers.add(agencyId.id, pending.code, {
    firstName: 'Amel', lastName: 'Benali', email: 'amel@example.com',
  });

  const confirmed = await bookings.create(agencyId.id, bookingFor(2), 'QA-SEED');
  await travelers.add(agencyId.id, confirmed.code, { firstName: 'Nour', lastName: 'Saidi' });
  await travelers.add(agencyId.id, confirmed.code, { firstName: 'Idir', lastName: 'Haddad' });
  const confirmedDone = await bookings.confirm(agencyId.id, confirmed.code, 'QA-SEED');

  const cancelled = await bookings.create(agencyId.id, bookingFor(1), 'QA-SEED');
  await travelers.add(agencyId.id, cancelled.code, { firstName: 'Lyès', lastName: 'Bouzid' });
  const cancelledDone = await bookings.cancel(agencyId.id, cancelled.code, 'QA-SEED', 'QA cleanup order');

  write('QA_LOGIN=' + ownerEmail);
  write('QA_PASSWORD=QA-Travelers-Pass-1!');
  write('QA_AGENCY_CODE=' + agencyId.code);
  write('QA_PENDING=' + pending.code);
  write('QA_PENDING_TRAVELER=' + pendingTraveler.code);
  write('QA_CONFIRMED=' + confirmedDone.code);
  write('QA_CANCELLED=' + cancelledDone.code);
  write('QA_CLEANUP=agency-id:' + agencyId.id + ',user-id:' + owner.id);

  await app.close();
}, 120_000);
