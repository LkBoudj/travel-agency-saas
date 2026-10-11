import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import {
  AGENCY_ACCESS_REQUEST_KEY,
  type AgencyAccessContext,
} from '../authorization/agency-access.js';
import { AgencyPermissionGuard } from '../authorization/agency-permission.guard.js';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../security/audit.service.js';
import { configureApp } from '../setup-app.js';
import { WebsiteController } from './website.controller.js';
import { WebsiteService } from './website.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';

/**
 * Website controller spec (T3): schema strictness, ensure-once, publish
 * atomicity + audit, preview token shared-format compatibility, and the
 * route → permission matrix. The guards are stubbed out (their execution is
 * covered by the shared guard suites); what is asserted here is the mapping
 * each route declares and the hard content ⇄ theme invariant.
 */

type DraftRow = {
  id: bigint;
  agencyId: bigint;
  slug: string;
  locale: string;
  themeId: string | null;
  themeSettings: unknown;
  content: unknown;
  branding: unknown;
  navigation: unknown;
  footer: unknown;
  updatedAt: Date;
};

type PublishedRow = DraftRow & { publishedAt: Date };

const SAHARA_ID = 5n;
const SAHARA_CODE = 'AGY-SAHARA00001';

function draftRow(agencyId: bigint, overrides: Partial<DraftRow> = {}): DraftRow {
  return {
    id: agencyId, // 1:1 — id mirrors agency id in the double
    agencyId,
    slug: 'demo',
    locale: 'en',
    themeId: null,
    themeSettings: {},
    content: {},
    branding: {},
    navigation: [],
    footer: {},
    updatedAt: new Date('2026-09-29T00:00:00Z'),
    ...overrides,
  };
}

function createPrismaDouble() {
  const drafts = new Map<string, DraftRow>();
  const published = new Map<string, PublishedRow>();
  const tours: Array<{ code: string; name: string; coverImageUrl: string | null; shortDescription: string | null; status: string; createdAt: Date }> = [];

  const prisma = {
    agencyWebsiteDraft: {
      findFirst: vi.fn(async ({ where }: { where: { agencyId: bigint } }) => drafts.get(String(where.agencyId)) ?? null),
      create: vi.fn(async ({ data }: { data: { agencyId: bigint } & Partial<DraftRow> }) => {
        const row = draftRow(data.agencyId, data);
        drafts.set(String(row.agencyId), row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: bigint }; data: Partial<DraftRow> }) => {
        const existing = [...drafts.values()].find((row) => row.id === where.id);
        if (!existing) throw new Error('draft.update unknown id');
        const row = { ...existing, ...data, agencyId: existing.agencyId };
        drafts.set(String(existing.agencyId), row);
        return row;
      }),
    },
    agencyWebsite: {
      findFirst: vi.fn(async ({ where }: { where: { agencyId: bigint } }) => published.get(String(where.agencyId)) ?? null),
      upsert: vi.fn(async ({ create, update }: { create: DraftRow & { publishedAt: Date }; update: Partial<DraftRow> & { publishedAt: Date } }) => {
        const slug = (update.slug ?? create.slug) as string;
        const tenantRows = [...drafts, ...published];
        const collides = tenantRows.some(
          ([key, row]) => row.slug === slug && key !== String(create.agencyId),
        );
        if (collides) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed on website slug', {
            code: 'P2002',
            clientVersion: 'test-double',
          });
        }
        const row: PublishedRow = { ...create, ...update, updatedAt: new Date('2026-09-29T00:00:00Z') };
        published.set(String(create.agencyId), row);
        return row;
      }),
    },
    tour: {
      findMany: vi.fn(async ({ where }: { where: { agencyId: bigint; status?: string } }) =>
        tours
          .filter((tour) => tour.agencyId === where.agencyId && tour.status === where.status)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map(({ status: _status, createdAt: _createdAt, agencyId: _agencyId, ...rest }) => rest),
      ),
    },
  } as unknown as PrismaService & { overrideMap: typeof tours };

  return { prisma, drafts, published, tours };
}

const mockConfig = {
  get: (key: string) =>
    ({ PREVIEW_TOKEN_SECRET: 'test-shared-secret', STOREFRONT_BASE_URL: 'http://store.test' })[key],
};

async function createTestApp() {
  const { prisma, drafts, published, tours } = createPrismaDouble();
  const audit = { record: vi.fn(async () => undefined) };

  const agencyAccess: AgencyAccessContext = {
    agency: { id: SAHARA_ID, code: SAHARA_CODE, name: 'Sahara', status: 'ACTIVE' },
    membership: { id: 1n, membershipType: 'EMPLOYEE', status: 'ACTIVE' },
    roles: [{ key: 'AGENCY_OWNER', name: 'Owner' }],
    permissionKeys: [],
  };

  const moduleRef = await Test.createTestingModule({
    controllers: [WebsiteController],
    providers: [
      WebsiteService,
      { provide: PrismaService, useValue: prisma },
      { provide: ConfigService, useValue: mockConfig },
      { provide: AuditService, useValue: audit },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: (context: { switchToHttp: () => { getRequest: () => { user?: unknown } } }) => {
        context.switchToHttp().getRequest().user = { code: 'test-actor' };
        return true;
      },
    })
    .overrideGuard(AgencyPermissionGuard)
    .useValue({
      canActivate: (context: { switchToHttp: () => { getRequest: () => unknown } }) => {
        const request = context.switchToHttp().getRequest() as {
          [AGENCY_ACCESS_REQUEST_KEY]: AgencyAccessContext;
        };
        request[AGENCY_ACCESS_REQUEST_KEY] = agencyAccess;
        return true;
      },
    })
    .compile();

  const app = moduleRef.createNestApplication<INestApplication>();
  configureApp(app);
  await app.init();
  return { app, prisma, drafts, published, tours, audit };
}

// The storefront's verifyPreviewToken, re-implemented verbatim (crypto.subtle
// HMAC) so a minted token proves shared-format compatibility.
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
function base64UrlDecode(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/u.test(value) || value.length % 4 === 1) return null;
  const base64 = value.replace(/-/gu, '+').replace(/_/gu, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

function permissionKeys(target: object, method: string): string[] {
  return Reflect.getMetadata('requireAgencyPermissions', target[method]) ?? [];
}

describe('WebsiteController', () => {
  beforeAll(() => {
    vi.restoreAllMocks();
  });

  describe('permission matrix (route → AGENCY_WEBSITE_* key)', () => {
    const controller = WebsiteController.prototype;

    it('GET /website requires VIEW', () => {
      expect(permissionKeys(controller, 'getPublished')).toEqual(['AGENCY_WEBSITE_VIEW']);
    });
    it('GET /website/draft requires VIEW', () => {
      expect(permissionKeys(controller, 'getDraft')).toEqual(['AGENCY_WEBSITE_VIEW']);
    });
    it('PATCH /website/draft/content requires CONTENT_EDIT', () => {
      expect(permissionKeys(controller, 'updateContent')).toEqual(['AGENCY_WEBSITE_CONTENT_EDIT']);
    });
    it('PATCH /website/draft/theme requires THEME_UPDATE', () => {
      expect(permissionKeys(controller, 'updateTheme')).toEqual(['AGENCY_WEBSITE_THEME_UPDATE']);
    });
    it('POST /website/publish requires PUBLISH', () => {
      expect(permissionKeys(controller, 'publish')).toEqual(['AGENCY_WEBSITE_PUBLISH']);
    });
    it('POST /website/preview requires VIEW', () => {
      expect(permissionKeys(controller, 'preview')).toEqual(['AGENCY_WEBSITE_VIEW']);
    });
    it('GET /website/tour-catalog requires VIEW (not AGENCY_TOUR_VIEW)', () => {
      expect(permissionKeys(controller, 'tourCatalog')).toEqual(['AGENCY_WEBSITE_VIEW']);
    });
  });

  describe('schema strictness (content ⇄ theme separation)', () => {
    it('content patch rejects theme keys (400)', async () => {
      const { app } = await createTestApp();
      await request(app.getHttpServer())
        .patch('/v1/agencies/AGY-SAHARA00001/website/draft/content')
        .set('x-test', '1')
        .send({ themeSettings: { color: 'red' } })
        .expect(400);
      await app.close();
    });

    it('theme patch rejects content keys (400)', async () => {
      const { app } = await createTestApp();
      await request(app.getHttpServer())
        .patch('/v1/agencies/AGY-SAHARA00001/website/draft/theme')
        .send({ branding: { name: 'x' } })
        .expect(400);
      await app.close();
    });

    it('content patch percolates content/branding/footer but never theme fields', async () => {
      const { app, drafts } = await createTestApp();
      const res = await request(app.getHttpServer())
        .patch('/v1/agencies/AGY-SAHARA00001/website/draft/content')
        .send({ content: { hero: { title: 'Sahara' }, featuredTourCodes: ['TUR-ABC'] }, branding: { tagline: 'Discover' }, footer: { copyright: '© 2026' } })
        .expect(200);

      expect(res.body.content.hero.title).toBe('Sahara');
      expect(res.body.content.featuredTourCodes).toEqual(['TUR-ABC']);
      expect(res.body.branding.tagline).toBe('Discover');
      expect(res.body.footer.copyright).toBe('© 2026');
      expect(res.body.themeId).toBeNull();
      expect(drafts.has('5')).toBe(true);
      await app.close();
    });

    it('theme patch percolates themeId + settings but never content', async () => {
      const { app } = await createTestApp();
      const res = await request(app.getHttpServer())
        .patch('/v1/agencies/AGY-SAHARA00001/website/draft/theme')
        .send({ themeId: 'desert', themeSettings: { accent: '#b45309' } })
        .expect(200);

      expect(res.body.themeId).toBe('desert');
      expect(res.body.themeSettings).toEqual({ accent: '#b45309' });
      expect(res.body.content).toEqual({});
      await app.close();
    });
  });

  describe('draft ensure-once', () => {
    it('first read auto-creates the draft with a slug defaulted from the agency code', async () => {
      const { app, drafts } = await createTestApp();
      const res = await request(app.getHttpServer())
        .get('/v1/agencies/AGY-SAHARA00001/website/draft')
        .expect(200);

      expect(res.body.slug).toBe('agy-sahara00001');
      expect(res.body.locale).toBe('en');
      expect(drafts.has('5')).toBe(true);
      await app.close();
    });
  });

  describe('publish', () => {
    it('copies the draft into the published row, stamps publishedAt, and audits', async () => {
      const { app, drafts, published, audit } = await createTestApp();
      await request(app.getHttpServer())
        .patch('/v1/agencies/AGY-SAHARA00001/website/draft/content')
        .send({ content: { hero: { title: 'Sahara' } }, branding: { tagline: 'Discover' } })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post('/v1/agencies/AGY-SAHARA00001/website/publish')
        .expect(200);

      expect(res.body.content.hero.title).toBe('Sahara');
      expect(res.body.branding.tagline).toBe('Discover');
      expect(res.body.publishedAt).toBeTypeOf('string');
      expect(published.has('5')).toBe(true);
      expect(published.get('5')?.slug).toBe(drafts.get('5')?.slug);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AGENCY_WEBSITE_PUBLISHED', targetCode: 'agy-sahara00001' }),
      );
      await app.close();
    });

    it('is idempotent for an already-published site', async () => {
      const { app, audit } = await createTestApp();
      await request(app.getHttpServer())
        .post('/v1/agencies/AGY-SAHARA00001/website/publish')
        .expect(200);
      await request(app.getHttpServer())
        .post('/v1/agencies/AGY-SAHARA00001/website/publish')
        .expect(200);
      expect(audit.record).toHaveBeenCalledTimes(2);
      await app.close();
    });

    it('reports 409 WEBSITE_SLUG_CONFLICT when another tenant owns the same slug', async () => {
      const { app, drafts } = await createTestApp();
      // Tenant 5 defaults to slug "agy-sahara00001"; force the same slug onto
      // tenant 9 so the cross-table deferred uniqueness would reject a publish.
      drafts.set('9', draftRow(9n, { slug: 'agy-sahara00001' }));

      const res = await request(app.getHttpServer())
        .post('/v1/agencies/AGY-SAHARA00001/website/publish')
        .expect(409);
      expect(res.body.errorCode).toBe('WEBSITE_SLUG_CONFLICT');
      await app.close();
    });
  });

  describe('preview minting (shared-format compatibility)', () => {
    it('returns a signed lab URL whose token verifies with the storefront verifier', async () => {
      const { app, drafts } = await createTestApp();
      await request(app.getHttpServer())
        .patch('/v1/agencies/AGY-SAHARA00001/website/draft/theme')
        .send({ themeId: 'desert' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post('/v1/agencies/AGY-SAHARA00001/website/preview')
        .send({ page: 'trips' })
        .expect(201);

      const url = new URL(res.body.previewUrl);
      expect(url.origin + url.pathname).toBe('http://store.test/_lab/desert/trips');
      expect(url.searchParams.has('t')).toBe(true);

      const token = url.searchParams.get('t');
      const [payload, signature] = (token as string).split('.');
      const signatureBytes = base64UrlDecode(signature) as Uint8Array;
      const key = await globalThis.crypto.subtle.importKey(
        'raw',
        textEncoder.encode('test-shared-secret'),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      const valid = await globalThis.crypto.subtle.verify(
        'HMAC',
        key,
        signatureBytes,
        textEncoder.encode(payload),
      );
      expect(valid).toBe(true);

      const claims = JSON.parse(textDecoder.decode(base64UrlDecode(payload) as Uint8Array)) as {
        tenantSlug: string;
        themeId: string;
        iat: number;
        exp: number;
      };
      expect(claims).toMatchObject({ tenantSlug: drafts.get('5')?.slug, themeId: 'desert' });
      expect(claims.exp - claims.iat).toBe(900);
      expect(claims.exp * 1000).toBeGreaterThan(Date.now());
      await app.close();
    });

    it('defaults to the starter theme and home page when nothing is set', async () => {
      const { app } = await createTestApp();
      const res = await request(app.getHttpServer())
        .post('/v1/agencies/AGY-SAHARA00001/website/preview')
        .send({})
        .expect(201);
      expect(new URL(res.body.previewUrl).pathname).toBe('/_lab/starter/home');
      await app.close();
    });

    it('allows previewing a specific requested theme without modifying the draft theme', async () => {
      const { app, drafts } = await createTestApp();
      const res = await request(app.getHttpServer())
        .post('/v1/agencies/AGY-SAHARA00001/website/preview')
        .send({ themeId: 'luxury', page: 'home' })
        .expect(201);

      expect(new URL(res.body.previewUrl).pathname).toBe('/_lab/luxury/home');
      // Draft theme is untouched
      expect(drafts.get('5')?.themeId).toBeNull();
      await app.close();
    });
  });

  describe('tour catalog', () => {
    it('lists only PUBLISHED tours with the minimal card fields', async () => {
      const { app, tours } = await createTestApp();
      tours.push(
        { code: 'TUR-PUB1', name: 'Published', coverImageUrl: 'https://img/x.jpg', shortDescription: 'ok', status: 'PUBLISHED', createdAt: new Date('2026-09-01T00:00:00Z'), agencyId: SAHARA_ID },
        { code: 'TUR-PUB2', name: 'Older', coverImageUrl: null, shortDescription: null, status: 'PUBLISHED', createdAt: new Date('2026-08-01T00:00:00Z'), agencyId: SAHARA_ID },
      );

      const res = await request(app.getHttpServer()).get('/v1/agencies/AGY-SAHARA00001/website/tour-catalog').expect(200);
      expect(res.body).toEqual([
        { code: 'TUR-PUB1', name: 'Published', coverImageUrl: 'https://img/x.jpg', shortDescription: 'ok' },
        { code: 'TUR-PUB2', name: 'Older', coverImageUrl: null, shortDescription: null },
      ]);
      await app.close();
    });
  });
});