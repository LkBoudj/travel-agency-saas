import { Test } from "@nestjs/testing"
import { INestApplication } from "@nestjs/common"
import request from "supertest"
import { randomBytes } from "node:crypto"
import { Prisma } from "../src/generated/prisma/client.js"
import { AppModule } from "../src/app.module.js"
import { configureApp } from "../src/setup-app.js"
import { PrismaService } from "../src/prisma/prisma.service.js"
import { BookingsService } from "../src/bookings/bookings.service.js"
import { TravelersService } from "../src/travelers/travelers.service.js"
import { RBAC_AGENCY_PAYMENT_GUARDS } from "../src/rbac/rbac.constants.js"
import type { CreateBookingBody } from "../src/bookings/bookings.schemas.js"

/**
 * Module K e2e — Manual Payments (PRD §23).
 *
 * Authority (read byte-truth from the PRD, not the UI):
 * an agency records manual payments against a booking and the server is
 * authoritative for the remaining balance. PRD example arithmetic:
 *   120,000 DZD total  →  50,000 DZD paid  →  70,000 DZD remaining
 * There is NO external payment gateway in the MVP (roadmap future only).
 * Remaining is never fabricated on the client: it is computed server-side as
 * booking.totalAmount − Σ(payment amounts) and returned to the UI.
 *
 * This slice exercises the server-authoritative path end-to-end: seed a
 * Module-J CONFIRMED booking (manifest complete), record a manual payment,
 * assert the server-computed remaining. Mirrors travelers.e2e-spec.ts for
 * seeding heat.
 */
describe("payments (Module K, PRD §23)", () => {
  let app: INestApplication
  let prisma: PrismaService
  let bookings: BookingsService
  let travelers: TravelersService
  let agencyId: bigint
  let bookingCode: string

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    bookings = app.get(BookingsService)
    travelers = app.get(TravelersService)
  })

  beforeEach(async () => {
    agencyId = (
      await prisma.agency.create({
        data: {
          code: `QA-PAY-${randomBytes(4).toString("hex")}`,
          name: "QA Payments Agency",
        },
      })
    ).id
    const customer = await prisma.agencyCustomer.create({
      data: { agencyId, name: "QA Payments Customer" },
    })
    const tour = await prisma.tour.create({
      data: { agencyId, code: `QA-TOUR-${randomBytes(3).toString("hex")}` },
    })
    const departure = await prisma.departure.create({
      data: {
        tourId: tour.id,
        date: new Date("2027-01-15"),
        capacity: 10,
      },
    })
    const priceOption = await prisma.pricingOption.create({
      data: {
        tourId: tour.id,
        code: `QA-PRICE-${randomBytes(3).toString("hex")}`,
        basis: "PER_PERSON",
        amount: new Prisma.Decimal(120000),
        currency: "DZD",
        active: true,
      },
    })
    const body: CreateBookingBody = {
      customerId: customer.id,
      departureId: departure.id,
      reservedSeats: 1,
      pricingOptions: [
        { pricingOptionId: priceOption.id, quantity: 1, basis: "PER_PERSON" },
      ],
    }
    const created = await bookings.createForAgency({
      agencyId,
      body,
      actor: { userId: BigInt(1), agencyId, role: "AGENCY_ADMIN" },
    })
    bookingCode = created.booking.code
    await bookings.confirmForAgency({
      agencyId,
      bookingCode,
      actor: { userId: BigInt(1), agencyId, role: "AGENCY_ADMIN" },
    })
  })

  afterEach(async () => {
    await prisma.agency.delete({ where: { id: agencyId } }).catch(() => undefined)
  })

  afterAll(async () => {
    await app.close()
  })

  it("records a manual payment and returns the server-computed remaining (120000 − 50000 = 70000 DZD)", async () => {
    const res = await request(app.getHttpServer())
      .post(`/v1/bookings/${bookingCode}/payments`)
      .set("x-agency-code", agencyId.toString())
      .send({ amount: 50000, currency: "DZD" })
      .expect(201)

    expect(res.body.paymentAmount).toBe("50000")
    expect(res.body.remaining).toBe("70000")
  })

  it("rejects a payment that would make remaining negative (over-payment)", async () => {
    await request(app.getHttpServer())
      .post(`/v1/bookings/${bookingCode}/payments`)
      .set("x-agency-code", agencyId.toString())
      .send({ amount: 200000, currency: "DZD" })
      .expect(409)
  })

  it("requires an AGENCY_PAYMENT_* role (401 without RBAC guard)", async () => {
    await request(app.getHttpServer())
      .post(`/v1/bookings/${bookingCode}/payments`)
      .send({ amount: 1000, currency: "DZD" })
      .expect(401)
  })
})
