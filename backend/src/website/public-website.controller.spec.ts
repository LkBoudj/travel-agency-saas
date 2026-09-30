import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { configureApp } from '../setup-app.js';
import { PublicWebsiteController } from './public-website.controller.js';
import { signWebsitePreviewToken } from './website-preview.js';
import { WebsiteService } from './website.service.js';

/**
 * Public read boundary spec (T4): no auth guards by construction, published
 * compose is a whitelist (tours pick PUBLISHED + OPEN prices, no internal
 * fields leak), and the draft variant is fail-closed on the shared preview
 * token (signature, expiry, slug binding) with 404 falling back to
 * `WEBSITE_DRAFT_NOT_FOUND` so the storefront `draft()` can fall back.
 */

const SECRET = 'test-shared-secret';

type AgencyRef = { id: bigint; name: string };

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
};

type PublishedRow = DraftRow & { publishedAt: Date };

type TourRow = {
  agencyId: bigint;
  code: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  coverImageUrl: string | null;
  days: number | null;
  nights: number | null;
  hours: number | null;
  highlights: unknown;
  included: unknown;
  notIncluded: unknown;
  status: string;
  createdAt: Date;
  destinations: { position: number; place: string | null; locality: string | null }[];
  itinerary: { position: number; title: string; description: string }[];
  departures: { status: string; prices: { amount: number; currency: string }[] }[];
};

function draftRow(agencyId: bigint, overrides: Partial<DraftRow> = {}): DraftRow {
  return {
    id: agencyId,
    agencyId,
    slug: 'demo',
    locale: 'en',
    themeId: null,
    themeSettings: {},
    content: {},
    branding: {},
    navigation: [],
    footer: {},
    ...overrides,
  };
}

function baseTour(agencyId: bigint, code: string, name: string): TourRow {
  return {
    agencyId,
    code,
    name,
    shortDescription: `${name} excerpt`,
    description: `${name} long description`,
    coverImageUrl: `https://cdn.test/${code}.jpg`,
    days: 3,
    nights: null,
    hours: null,
    highlights: ['Campfire', 'Dunes'],
    included: ['Guide'],
    notIncluded: ['Insurance'],
    status: 'PUBLISHED',
    createdAt: new Date('2026-09-01T00:00:00Z'),
    destinations: [{ position: 1, place: 'Djanet', locality: null }],
    itinerary: [{ position: 1, title: 'Arrival', description: 'Meet at the airport' }],
    departures: [],
  };
}

function createPrismaDouble() {
  const drafts = new Map<string, DraftRow>();
  const published = new Map<string, PublishedRow>();
  const agencies = new Map<string, AgencyRef>();
  const tours: TourRow[] = [];

  const prisma = {
    agencyWebsite: {
      findFirst: vi.fn(async ({ where }: { where: { slug: string } }) => {
        const row = published.get(where.slug) ?? null;
        if (!row) return null;
        const agency = agencies.get(String(row.agencyId));
        return { ...row, agency: { id: row.agencyId, name: agency?.name ?? 'Unknown' } };
      }),
    },
    agencyWebsiteDraft: {
      findFirst: vi.fn(async ({ where }: { where: { slug: string } }) => {
        const row = drafts.get(where.slug) ?? null;
        if (!row) return null;
        const agency = agencies.get(String(row.agencyId));
        return { ...row, agency: { id: row.agencyId, name: agency?.name ?? 'Unknown' } };
      }),
    },
    tour: {
      findMany: vi.fn(async ({ where }: { where: { agencyId: bigint; status: string } }) =>
        tours
          .filter((tour) => tour.agencyId === where.agencyId && tour.status === where.status)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map(({ status: _status, ...tour }) => ({
            ...tour,
            destinations: [...tour.destinations].sort((a, b) => a.position - b.position),
            itinerary: [...tour.itinerary].sort((a, b) => a.position - b.position),
            departures: tour.departures
              .filter((departure) => departure.status === 'OPEN') // matches the service include filter
              .map((departure) => ({
                prices: departure.prices.map((price) => ({
                  amount: price.amount,
                  pricingOption: { currency: price.currency },
                })),
              })),
          })),
      ),
    },
  } as unknown as PrismaService;

  return { prisma, drafts, published, tours, agencies };
}

const mockConfig = {
  get: (key: string) =>
    ({ PREVIEW_TOKEN_SECRET: SECRET, STOREFRONT_BASE_URL: 'http://store.test' })[key],
};

function tokenFor(tenantSlug: string, themeId: string, options: { nowMs?: number } = {}): string {
  return signWebsitePreviewToken({ tenantSlug, themeId }, SECRET, options);
}

function seedSahara(): { agencyId: bigint; name: string } {
  return { agencyId: 5n, name: 'Sahara' };
}

async function createTestApp() {
  const { prisma, drafts, published, tours, agencies } = createPrismaDouble();

  const moduleRef = await Test.createTestingModule({
    controllers: [PublicWebsiteController],
    providers: [
      WebsiteService,
      { provide: PrismaService, useValue: prisma },
      { provide: ConfigService, useValue: mockConfig },
    ],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication>();
  configureApp(app);
  await app.init();
  return { app, prisma, drafts, published, tours, agencies };
}

describe('PublicWebsiteController', () => {
  beforeAll(() => {
    vi.restoreAllMocks();
  });

  it('is not behind any auth guard (no guards metadata on class or handlers)', () => {
    const prototype = PublicWebsiteController.prototype as unknown as Record<string, unknown>;
    expect(Reflect.getMetadata('__guards__', PublicWebsiteController)).toBeUndefined();
    expect(Reflect.getMetadata('__guards__', prototype['getPublished'])).toBeUndefined();
    expect(Reflect.getMetadata('__guards__', prototype['getDraft'])).toBeUndefined();
  });

  describe('GET /v1/public/website/:slug', () => {
    it('composes the published storefront DTO from the published row + published tours', async () => {
      const { app, published, tours, agencies } = await createTestApp();
      const { agencyId, name } = seedSahara();
      agencies.set(String(agencyId), { id: agencyId, name });

      published.set(
        'demo',
        draftRow(agencyId, {
          slug: 'demo',
          themeId: 'starter',
          themeSettings: { primaryColor: '#b45309' },
          branding: { name: 'Sahara Tours', tagline: 'Desert adventures' },
          navigation: [{ label: 'Home', href: '/' }],
          footer: { description: 'Footer copy' },
          content: {
            hero: { title: 'Into the dunes' },
            trustPoints: [{ icon: 'shield', title: 'Licensed', text: 'Fully licensed operator' }],
            promotion: { title: 'Summer deals' },
            testimonials: [{ quote: 'Amazing', author: 'Yacine', location: 'Algiers' }],
            finalCta: { title: 'Book now', subtitle: 'Before seats run out' },
            featuredTourCodes: ['TUR-B'],
            internalSecret: 'must-not-leak',
          },
          publishedAt: new Date('2026-09-29T09:00:00Z'),
        }),
      );

      tours.push(
        baseTour(agencyId, 'TUR-B', 'Biskra Nights'),
        baseTour(agencyId, 'TUR-A', 'Tassili Gorges'),
        { ...baseTour(agencyId, 'TUR-D', 'Draft Tour'), status: 'DRAFT' },
        { ...baseTour(agencyId, 'TUR-AR', 'Archived Tour'), status: 'ARCHIVED' },
      );
      tours[0].createdAt = new Date('2026-09-20T00:00:00Z'); // TUR-B older
      tours[1].createdAt = new Date('2026-09-25T00:00:00Z'); // TUR-A newer
      tours[1].departures = [
        { status: 'CANCELLED', prices: [{ amount: 1, currency: 'DZD' }] },
        { status: 'OPEN', prices: [{ amount: 12000, currency: 'DZD' }] },
      ];
      tours[1].days = null;
      tours[1].nights = 4;
      tours[2].departures = [
        { status: 'CLOSED', prices: [{ amount: 999, currency: 'DZD' }] },
      ];

      const res = await request(app.getHttpServer()).get('/v1/public/website/demo').expect(200);
      const body = res.body as Record<string, any>;

      expect(body.config.tenantSlug).toBe('demo');
      expect(body.config.locale).toBe('en');
      expect(body.config.themeId).toBe('starter');
      expect(body.config.settings).toEqual({ primaryColor: '#b45309' });
      expect(body.config.branding).toEqual({
        name: 'Sahara Tours',
        tagline: 'Desert adventures',
        logo: null,
        colors: {},
      });
      expect(body.config.navigation).toEqual([{ label: 'Home', href: '/' }]);
      expect(body.config.footer.description).toBe('Footer copy');

      expect(body.hero).toEqual({ title: 'Into the dunes' });
      expect(body.trustPoints).toEqual([
        { id: 't0', title: 'Licensed', description: 'Fully licensed operator', icon: 'shield' },
      ]);
      expect(body.promotion.title).toBe('Summer deals');
      expect(body.testimonials).toEqual([
        { quote: 'Amazing', author: 'Yacine', role: 'Algiers' },
      ]);
      expect(body.finalCta.title).toBe('Book now');

      // Home ordering: featured first, then newest.
      expect(body.tours.map((tour: any) => tour.slug)).toEqual(['TUR-B', 'TUR-A']);
      expect(body.tours.filter((tour: any) => tour.featured)).toEqual(
        body.tours.filter((tour: any) => tour.slug === 'TUR-B'),
      );
      // Draft tour never composes.
      expect(body.tours.map((tour: any) => tour.slug)).not.toContain('TUR-D');
      // ARCHIVED tour never composes either (only PUBLISHED is visible).
      expect(body.tours.map((tour: any) => tour.slug)).not.toContain('TUR-AR');

      const featured = body.tours[0];
      expect(featured.slug).toBe('TUR-B');
      expect(featured.title).toBe('Biskra Nights');
      expect(featured.excerpt).toBe('Biskra Nights excerpt');
      expect(featured.durationDays).toBe(3);
      expect(featured.price).toBeNull();

      const priced = body.tours[1];
      // CANCELLED and CLOSED departure prices never count toward the price.
      expect(priced.price).toEqual({ amount: 12000, currency: 'DZD' });
      expect(priced.durationDays).toBe(4); // nights fallback
      expect(priced.image).toEqual({ src: `https://cdn.test/TUR-A.jpg`, alt: 'Tassili Gorges' });
      expect(priced.destinations).toEqual(['Djanet']);
      expect(priced.itinerary).toEqual([{ day: 1, title: 'Arrival', description: 'Meet at the airport' }]);

      // Whitelist: no internal fields cross the boundary.
      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain('internalSecret');
      expect(serialized).not.toContain('status');
      expect(priced).not.toHaveProperty('departures');
      expect(priced).not.toHaveProperty('code');
    });

    it('falls back to the agency name for missing branding/content titles', async () => {
      const { app, published, agencies } = await createTestApp();
      const { agencyId, name } = seedSahara();
      agencies.set(String(agencyId), { id: agencyId, name });
      published.set('demo', { ...draftRow(agencyId, { slug: 'demo' }), publishedAt: new Date() });

      const res = await request(app.getHttpServer()).get('/v1/public/website/demo').expect(200);
      const body = res.body as Record<string, any>;

      expect(body.config.branding.name).toBe(name);
      expect(body.config.branding.logo).toBeNull();
      expect(body.hero.title).toBe(name);
      expect(body.promotion.title).toBe(name);
      expect(body.finalCta.title).toBe(name);
      expect(body.tours).toEqual([]);
    });

    it('404 WEBSITE_NOT_PUBLISHED for an unknown slug', async () => {
      const { app } = await createTestApp();
      const res = await request(app.getHttpServer()).get('/v1/public/website/ghost').expect(404);
      expect(res.body.errorCode).toBe('WEBSITE_NOT_PUBLISHED');
    });

    it('404 WEBSITE_NOT_PUBLISHED for a known agency that never published', async () => {
      const { app, drafts, agencies } = await createTestApp();
      const { agencyId, name } = seedSahara();
      agencies.set(String(agencyId), { id: agencyId, name });
      drafts.set('demo', draftRow(agencyId, { slug: 'demo' }));

      const res = await request(app.getHttpServer()).get('/v1/public/website/demo').expect(404);
      expect(res.body.errorCode).toBe('WEBSITE_NOT_PUBLISHED');
    });

    it('never leaks another tenant’s data when multiple sites are published', async () => {
      const { app, published, agencies } = await createTestApp();
      const sahara = seedSahara();
      agencies.set(String(sahara.agencyId), { id: sahara.agencyId, name: sahara.name });
      const atlasId = 9n;
      agencies.set(String(atlasId), { id: atlasId, name: 'Atlas' });

      published.set('demo', {
        ...draftRow(sahara.agencyId, {
          slug: 'demo',
          content: { hero: { title: 'Sahara hero' } },
          branding: { name: 'Sahara Tours' },
        }),
        publishedAt: new Date(),
      });
      published.set('atlas', {
        ...draftRow(atlasId, {
          slug: 'atlas',
          content: { finalCta: { title: 'Atlas CTA' } },
          branding: { name: 'Atlas Expeditions' },
        }),
        publishedAt: new Date(),
      });

      const res = await request(app.getHttpServer()).get('/v1/public/website/demo').expect(200);
      const body = res.body as Record<string, any>;
      expect(body.config.tenantSlug).toBe('demo');
      expect(body.config.branding.name).toBe('Sahara Tours');
      expect(body.hero.title).toBe('Sahara hero');
      expect(JSON.stringify(body)).not.toContain('Atlas');
    });
  });

  describe('GET /v1/public/website/:slug/draft', () => {
    it('403 fail-closed without a token', async () => {
      const { app, published, agencies } = await createTestApp();
      const { agencyId, name } = seedSahara();
      agencies.set(String(agencyId), { id: agencyId, name });
      published.set('demo', { ...draftRow(agencyId, { slug: 'demo' }), publishedAt: new Date() });

      const res = await request(app.getHttpServer()).get('/v1/public/website/demo/draft').expect(403);
      expect(res.body.errorCode).toBe('WEBSITE_PREVIEW_TOKEN_INVALID');
    });

    it('403 for a malformed/unreadable token', async () => {
      const { app } = await createTestApp();
      const res = await request(app.getHttpServer())
        .get('/v1/public/website/demo/draft')
        .set('Authorization', 'Bearer not-a-token')
        .expect(403);
      expect(res.body.errorCode).toBe('WEBSITE_PREVIEW_TOKEN_INVALID');
    });

    it('403 for a token signed with a different secret', async () => {
      const { app } = await createTestApp();
      const token = signWebsitePreviewToken({ tenantSlug: 'demo', themeId: 'desert' }, 'wrong-secret');
      const res = await request(app.getHttpServer())
        .get('/v1/public/website/demo/draft')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(res.body.errorCode).toBe('WEBSITE_PREVIEW_TOKEN_INVALID');
    });

    it('403 when the token claim slug differs from the route slug', async () => {
      const { app } = await createTestApp();
      const token = tokenFor('demo', 'desert');
      const res = await request(app.getHttpServer())
        .get('/v1/public/website/other/draft')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(res.body.errorCode).toBe('WEBSITE_PREVIEW_TOKEN_INVALID');
    });

    it('403 for an expired token', async () => {
      const { app } = await createTestApp();
      const nowMs = Date.now();
      const token = tokenFor('demo', 'desert', { nowMs: nowMs - 901_000 });
      const res = await request(app.getHttpServer())
        .get('/v1/public/website/demo/draft')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(res.body.errorCode).toBe('WEBSITE_PREVIEW_TOKEN_INVALID');
    });

    it('404 WEBSITE_DRAFT_NOT_FOUND for a valid token with no draft row (storefront falls back)', async () => {
      const { app, published, agencies } = await createTestApp();
      const { agencyId, name } = seedSahara();
      agencies.set(String(agencyId), { id: agencyId, name });
      published.set('demo', { ...draftRow(agencyId, { slug: 'demo' }), publishedAt: new Date() });

      const token = tokenFor('demo', 'desert');
      const res = await request(app.getHttpServer())
        .get('/v1/public/website/demo/draft')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(res.body.errorCode).toBe('WEBSITE_DRAFT_NOT_FOUND');
    });

    it('composes the DRAFT row and honors the token theme claim', async () => {
      const { app, drafts, tours, agencies } = await createTestApp();
      const { agencyId, name } = seedSahara();
      agencies.set(String(agencyId), { id: agencyId, name });

      drafts.set(
        'demo',
        draftRow(agencyId, {
          slug: 'demo',
          themeId: null, // never activated
          themeSettings: { primaryColor: '#0f766e' },
          branding: { name: 'Draft Brand' },
          content: { hero: { title: 'Draft hero' }, finalCta: { title: 'Draft CTA' } },
          navigation: [{ label: 'Lab', href: '/lab' }],
        }),
      );
      tours.push(baseTour(agencyId, 'TUR-C', 'Preview Tour'));
      tours[0].departures = [
        { status: 'CLOSED', prices: [{ amount: 1, currency: 'DZD' }] },
        { status: 'OPEN', prices: [{ amount: 9000, currency: 'DZD' }] },
      ];

      const token = tokenFor('demo', 'desert');
      const res = await request(app.getHttpServer())
        .get('/v1/public/website/demo/draft')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const body = res.body as Record<string, any>;

      // themeId comes from the claims (the lab route), not the stored draft.
      expect(body.config.themeId).toBe('desert');
      expect(body.config.branding.name).toBe('Draft Brand');
      expect(body.hero.title).toBe('Draft hero');
      expect(body.finalCta.title).toBe('Draft CTA');
      expect(body.config.navigation).toEqual([{ label: 'Lab', href: '/lab' }]);
      expect(body.tours).toHaveLength(1);
      expect(body.tours[0].price).toEqual({ amount: 9000, currency: 'DZD' });
      // Draft slug claim bound to the route; stored draft row is the one used.
      expect(body.config.tenantSlug).toBe('demo');
    });

    it('accepts a lower-cased Bearer scheme (header parsing is case-insensitive)', async () => {
      const { app, drafts, agencies } = await createTestApp();
      const { agencyId, name } = seedSahara();
      agencies.set(String(agencyId), { id: agencyId, name });
      drafts.set('demo', draftRow(agencyId, { slug: 'demo' }));

      const token = tokenFor('demo', 'starter');
      await request(app.getHttpServer())
        .get('/v1/public/website/demo/draft')
        .set('Authorization', `bearer ${token}`)
        .expect(200);
    });
  });
});