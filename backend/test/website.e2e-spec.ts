import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { Prisma } from '../src/generated/prisma/client.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/setup-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AUTH_COOKIE_NAME } from '../src/auth/auth.constants.js';
import { AGENCY_ADMIN_SYSTEM_KEY } from '../src/rbac/rbac.constants.js';
import { AUDIT_ACTIONS } from '../src/security/audit.service.js';
import { verifyWebsitePreviewToken } from '../src/website/website-preview.js';
import {
  WEBSITE_NOT_PUBLISHED,
  WEBSITE_PREVIEW_TOKEN_INVALID,
} from '../src/website/website.error-codes.js';

const hex = () => randomBytes(6).toString('hex').toUpperCase();
const code = (prefix: string) => `${prefix}-${hex()}`;

const NAME_PREFIX = 'Website E2E';
const EMAIL_PREFIX = 'website.e2e.';

interface OwnerAgency {
  agencyId: bigint;
  agencyCode: string;
  ownerId: bigint;
  cookie: string;
}

/**
 * Real-PostgreSQL proof of the production website flow (T8):
 *
 *   dashboard API (PATCH content/theme → publish → preview)
 *     → public boundary (published → draft w/ token)
 *
 * Runs against the LIVE database (Neon), like the other `*.e2e-spec` suites.
 * Covers: draft ensure-once, content/theme key-group isolation (400 on
 * cross-group bodies), publish atomicity + audit, preview minting, the
 * token-gated draft boundary, the permission matrix, featured ordering +
 * derived price at compose, and the cross-table slug-conflict guard.
 */
describe('Agency website e2e (live PostgreSQL)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let secret: string;
  let adminRoleId: bigint;
  let tenant: OwnerAgency;
  let outsiderCookie: string;
  let tourACode: string;
  let tourBCode: string;

  const createOwnerAgency = async (
    name: string,
    firstName: string,
  ): Promise<OwnerAgency> => {
    const owner = await prisma.appUser.create({
      data: {
        code: code('USR'),
        email: `${EMAIL_PREFIX}${hex().toLowerCase()}@test.local`,
        passwordHash: 'website-e2e-test-only',
        firstName,
        lastName: 'Tester',
      },
      select: { id: true },
    });
    const agencyCode = code('AGY');
    let agencyId: bigint;
    await prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({
        data: { code: agencyCode, name },
        select: { id: true },
      });
      agencyId = agency.id;
      const membership = await tx.agencyMembership.create({
        data: {
          agencyId: agency.id,
          appUserId: owner.id,
          membershipType: 'OWNER',
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      await tx.agencyRoleAssignment.create({
        data: { membershipId: membership.id, roleId: adminRoleId },
      });
    });
    const token = await jwt.signAsync({ sub: String(owner.id) });
    return {
      agencyId: agencyId as bigint,
      agencyCode,
      ownerId: owner.id,
      cookie: `${AUTH_COOKIE_NAME}=${token}`,
    };
  };

  const base = (agencyCode: string) => `/v1/agencies/${agencyCode}/website`;
  const slugOf = (agencyCode: string) => agencyCode.toLowerCase();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
    secret = app.get(ConfigService).getOrThrow<string>('PREVIEW_TOKEN_SECRET');

    // Self-heal any rows left by a previously aborted run.
    await prisma.agency.deleteMany({ where: { name: { startsWith: NAME_PREFIX } } });
    await prisma.appUser.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });

    const existing = await prisma.role.findFirst({
      where: { systemKey: AGENCY_ADMIN_SYSTEM_KEY, scope: 'AGENCY', agencyId: null },
      select: { id: true },
    });
    adminRoleId =
      existing?.id ??
      (
        await prisma.role.create({
          data: {
            key: 'AGENCY_OWNER',
            name: 'Agency Owner',
            scope: 'AGENCY',
            agencyId: null,
            systemKey: AGENCY_ADMIN_SYSTEM_KEY,
            description: 'Global agency role (website e2e fallback when the seed is absent)',
          },
          select: { id: true },
        })
      ).id;

    tenant = await createOwnerAgency(`${NAME_PREFIX} ${hex()}`, 'Website');

    const outsider = await prisma.appUser.create({
      data: {
        code: code('USR'),
        email: `${EMAIL_PREFIX}${hex().toLowerCase()}@test.local`,
        passwordHash: 'website-e2e-test-only',
        firstName: 'Outsider',
        lastName: 'Tester',
      },
      select: { id: true },
    });
    outsiderCookie = `${AUTH_COOKIE_NAME}=${await jwt.signAsync({ sub: String(outsider.id) })}`;

    const tourA = await prisma.tour.create({
      data: {
        code: code('TUR'),
        agencyId: tenant.agencyId,
        name: `Published A ${hex()}`,
        status: 'PUBLISHED',
        format: 'experience',
        geographicScope: 'domestic',
        availabilityMode: 'scheduled',
      },
      select: { code: true },
    });
    const tourB = await prisma.tour.create({
      data: {
        code: code('TUR'),
        agencyId: tenant.agencyId,
        name: `Published B ${hex()}`,
        status: 'PUBLISHED',
        format: 'experience',
        geographicScope: 'domestic',
        availabilityMode: 'scheduled',
      },
      select: { code: true },
    });
    tourACode = tourA.code;
    tourBCode = tourB.code;
    await prisma.tour.create({
      data: {
        code: code('TUR'),
        agencyId: tenant.agencyId,
        name: `Draft ${hex()}`,
        status: 'DRAFT',
        format: 'experience',
        geographicScope: 'domestic',
        availabilityMode: 'scheduled',
      },
    });

    const option = await prisma.pricingOption.create({
      data: {
        code: code('PRC'),
        tourId: (await prisma.tour.findUniqueOrThrow({ where: { code: tourACode } })).id,
        name: `Option ${hex()}`,
        basis: 'per_person',
        currency: 'DZD',
      },
      select: { id: true },
    });
    const departure = await prisma.departure.create({
      data: {
        code: code('DEP'),
        tourId: (await prisma.tour.findUniqueOrThrow({ where: { code: tourACode } })).id,
        status: 'OPEN',
        startAt: new Date(Date.now() + 86_400_000 * 30),
        endAt: new Date(Date.now() + 86_400_000 * 35),
        capacity: 8,
      },
      select: { id: true },
    });
    await prisma.departurePrice.create({
      data: {
        departureId: departure.id,
        pricingOptionId: option.id,
        amount: new Prisma.Decimal(10000),
      },
    });
  }, 60_000);

  it('draft is ensure-once with empty defaults and the site is unpublished', async () => {
    const draft = await request(app.getHttpServer())
      .get(`${base(tenant.agencyCode)}/draft`)
      .set('Cookie', tenant.cookie)
      .expect(200);
    expect(draft.body).toMatchObject({
      slug: slugOf(tenant.agencyCode),
      locale: 'en',
      themeId: null,
      themeSettings: {},
      content: {},
      branding: {},
      navigation: [],
      footer: {},
      publishedAt: null,
    });
    expect(typeof draft.body.updatedAt).toBe('string');

    await request(app.getHttpServer())
      .get(`${base(tenant.agencyCode)}`)
      .set('Cookie', tenant.cookie)
      .expect(404)
      .expect((res) => expect(res.body.errorCode).toBe(WEBSITE_NOT_PUBLISHED));
  });

  it('content patch persists, leaves theme untouched, and merges per group', async () => {
    const first = await request(app.getHttpServer())
      .patch(`${base(tenant.agencyCode)}/draft/content`)
      .set('Cookie', tenant.cookie)
      .send({
        content: { hero: { title: 'Live title', eyebrow: 'Eyebrow' } },
        branding: { name: 'Agency One' },
      })
      .expect(200);
    expect(first.body.content.hero.title).toBe('Live title');
    expect(first.body.branding.name).toBe('Agency One');
    expect(first.body.themeId).toBeNull();

    // Second patch: adds promotion + featured picks, must keep earlier groups.
    const second = await request(app.getHttpServer())
      .patch(`${base(tenant.agencyCode)}/draft/content`)
      .set('Cookie', tenant.cookie)
      .send({
        content: {
          promotion: { title: 'Promo' },
          // Deliberately reverse of the natural newest-first order.
          featuredTourCodes: [tourACode, tourBCode],
        },
      })
      .expect(200);
    expect(second.body.content.hero.title).toBe('Live title');
    expect(second.body.content.promotion.title).toBe('Promo');
    expect(second.body.content.featuredTourCodes).toEqual([tourACode, tourBCode]);
  });

  it('content and theme key-groups are disjoint (strict body, 400)', async () => {
    await request(app.getHttpServer())
      .patch(`${base(tenant.agencyCode)}/draft/content`)
      .set('Cookie', tenant.cookie)
      .send({ content: { hero: { title: 'X' } }, themeSettings: { 'layout.theme': 'dark' } })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`${base(tenant.agencyCode)}/draft/theme`)
      .set('Cookie', tenant.cookie)
      .send({ themeId: 'starter', content: { hero: { title: 'X' } } })
      .expect(400);
  });

  it('theme patch persists theme settings and never touches content', async () => {
    const res = await request(app.getHttpServer())
      .patch(`${base(tenant.agencyCode)}/draft/theme`)
      .set('Cookie', tenant.cookie)
      .send({ themeId: 'starter', themeSettings: { 'layout.theme': 'dark' } })
      .expect(200);
    expect(res.body.themeId).toBe('starter');
    expect(res.body.themeSettings['layout.theme']).toBe('dark');
    expect(res.body.content.hero.title).toBe('Live title');
  });

  it('tour catalog lists PUBLISHED tours only, minimal whitelist', async () => {
    const res = await request(app.getHttpServer())
      .get(`${base(tenant.agencyCode)}/tour-catalog`)
      .set('Cookie', tenant.cookie)
      .expect(200);
    expect(res.body).toHaveLength(2);
    for (const card of res.body) {
      expect(Object.keys(card).sort()).toEqual(['code', 'coverImageUrl', 'name', 'shortDescription']);
    }
  });

  it('publish is explicit, atomic, audited, and stamps publishedAt', async () => {
    const res = await request(app.getHttpServer())
      .post(`${base(tenant.agencyCode)}/publish`)
      .set('Cookie', tenant.cookie)
      .expect(200);
    expect(res.body.slug).toBe(slugOf(tenant.agencyCode));
    expect(res.body.themeId).toBe('starter');
    expect(typeof res.body.publishedAt).toBe('string');

    const audit = await prisma.auditLog.findFirst({
      where: { action: AUDIT_ACTIONS.agencyWebsitePublished },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).not.toBeNull();

    // One tenant, two rows: the published copy keeps its draft alive under the
    // same slug. This is the state the cross-table slug guard must allow.
    const [publishedRows, draftRows] = await prisma.$transaction([
      prisma.agencyWebsite.findMany({ where: { slug: slugOf(tenant.agencyCode) } }),
      prisma.agencyWebsiteDraft.findMany({ where: { slug: slugOf(tenant.agencyCode) } }),
    ]);
    expect(publishedRows).toHaveLength(1);
    expect(draftRows).toHaveLength(1);
    expect(publishedRows[0].agencyId).toBe(draftRows[0].agencyId);

    await request(app.getHttpServer())
      .get(`${base(tenant.agencyCode)}`)
      .set('Cookie', tenant.cookie)
      .expect(200)
      .expect((r) => {
        expect(r.body.publishedAt).toBe(res.body.publishedAt);
        expect(r.body.content.hero.title).toBe('Live title');
      });
  });

  it('draft edits after publish do not leak into the published aggregate', async () => {
    await request(app.getHttpServer())
      .patch(`${base(tenant.agencyCode)}/draft/content`)
      .set('Cookie', tenant.cookie)
      .send({ content: { hero: { title: 'Draft-only title' } } })
      .expect(200);

    const published = await request(app.getHttpServer())
      .get(`${base(tenant.agencyCode)}`)
      .set('Cookie', tenant.cookie)
      .expect(200);
    expect(published.body.content.hero.title).toBe('Live title');

    const draft = await request(app.getHttpServer())
      .get(`${base(tenant.agencyCode)}/draft`)
      .set('Cookie', tenant.cookie)
      .expect(200);
    expect(draft.body.content.hero.title).toBe('Draft-only title');
  });

  it('preview mints a signed lab URL verifying with the shared secret', async () => {
    const res = await request(app.getHttpServer())
      .post(`${base(tenant.agencyCode)}/preview`)
      .set('Cookie', tenant.cookie)
      .send({ page: 'home' })
      .expect(201);

    const url = new URL(res.body.previewUrl);
    expect(url.origin).toBe('http://localhost:4321');
    expect(url.pathname).toBe('/_lab/starter/home');
    const claims = verifyWebsitePreviewToken(url.searchParams.get('t'), secret);
    expect(claims?.tenantSlug).toBe(slugOf(tenant.agencyCode));
    expect(claims?.themeId).toBe('starter');
  });

  it('permission matrix: no membership and cross-tenant are both blocked', async () => {
    await request(app.getHttpServer())
      .get(`${base(tenant.agencyCode)}`)
      .set('Cookie', outsiderCookie)
      .expect(403);

    const otherTenant = await createOwnerAgency(`${NAME_PREFIX} ${hex()}`, 'Other');
    await request(app.getHttpServer())
      .get(`${base(tenant.agencyCode)}`)
      .set('Cookie', otherTenant.cookie)
      .expect(403);
  });

  it('public boundary: storefront DTO whitelist, featured-first order, derived price', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/public/website/${slugOf(tenant.agencyCode)}`)
      .expect(200);

    expect(Object.keys(res.body).sort()).toEqual([
      'config',
      'finalCta',
      'hero',
      'pages',
      'promotion',
      'testimonials',
      'tours',
      'trustPoints',
    ]);
    const { config, hero, tours } = res.body;
    expect(config.tenantSlug).toBe(slugOf(tenant.agencyCode));
    expect(config.themeId).toBe('starter');
    expect(config.branding.name).toBe('Agency One');
    expect(hero.title).toBe('Live title');

    expect(tours).toHaveLength(2);
    // Featureds override the natural newest-first order.
    expect(tours[0].slug).toBe(tourACode);
    expect(tours[0].featured).toBe(true);
    expect(tours[1].slug).toBe(tourBCode);
    expect(tours[1].featured).toBe(true);
    // Cheapest OPEN-departure price derived for the seeded tour; none for B.
    expect(tours[0].price).toEqual({ amount: 10000, currency: 'DZD' });
    expect(tours[1].price).toBeNull();
    // Internal fields never cross the boundary.
    expect(tours[0]).not.toHaveProperty('id');
    expect(tours[0]).not.toHaveProperty('internalRef');
    expect(config.branding).not.toHaveProperty('agencyId');
    expect(res.body).not.toHaveProperty('agencyId');

    // Unknown slug — same 404 code, no oracle.
    await request(app.getHttpServer())
      .get('/v1/public/website/does-not-exist-t8')
      .expect(404)
      .expect((r) => expect(r.body.errorCode).toBe(WEBSITE_NOT_PUBLISHED));
  });

  it('public draft boundary is token-gated and honors the theme claim', async () => {
    await request(app.getHttpServer())
      .get(`/v1/public/website/${slugOf(tenant.agencyCode)}/draft`)
      .expect(403)
      .expect((r) => expect(r.body.errorCode).toBe(WEBSITE_PREVIEW_TOKEN_INVALID));

    await request(app.getHttpServer())
      .get(`/v1/public/website/${slugOf(tenant.agencyCode)}/draft`)
      .set('Authorization', 'Bearer not-a-valid-token')
      .expect(403);

    const preview = await request(app.getHttpServer())
      .post(`${base(tenant.agencyCode)}/preview`)
      .set('Cookie', tenant.cookie)
      .send({ page: 'home' })
      .expect(201);
    const token = new URL(preview.body.previewUrl).searchParams.get('t');

    const draftData = await request(app.getHttpServer())
      .get(`/v1/public/website/${slugOf(tenant.agencyCode)}/draft`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(draftData.body.config.themeId).toBe('starter');
    expect(draftData.body.hero.title).toBe('Draft-only title');
  });

  it('a second tenant can never claim a published slug', async () => {
    const other = await createOwnerAgency(`${NAME_PREFIX} ${hex()}`, 'Collider');

    // The published slug is a public key. The draft table's own unique index
    // refuses the duplicate outright, so a collision is unreachable through the
    // API — the deferred cross-table guard is the second line of defence.
    await expect(
      prisma.agencyWebsiteDraft.create({
        data: {
          agencyId: other.agencyId,
          slug: slugOf(tenant.agencyCode),
          locale: 'en',
          themeSettings: {},
          content: {},
          branding: {},
          navigation: [],
          footer: {},
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    // The other tenant keeps its own key and publishes normally.
    await request(app.getHttpServer())
      .post(`${base(other.agencyCode)}/publish`)
      .set('Cookie', other.cookie)
      .expect(200)
      .expect((r) => {
        expect(r.body.slug).toBe(slugOf(other.agencyCode));
      });

    // Two published tenants, two slugs — the boundary never blurs them.
    await request(app.getHttpServer())
      .get(`/v1/public/website/${slugOf(other.agencyCode)}`)
      .expect(200)
      .expect((r) => {
        expect(r.body.config.tenantSlug).toBe(slugOf(other.agencyCode));
      });
  });

  afterAll(async () => {
    await prisma.agency.deleteMany({ where: { name: { startsWith: NAME_PREFIX } } });
    await prisma.appUser.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });
    await app.close();
  });
});