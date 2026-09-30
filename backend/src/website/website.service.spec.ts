import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { WEBSITE_NOT_PUBLISHED } from './website.error-codes.js';
import { WebsiteService } from './website.service.js';

/**
 * Data-layer scaffold unit tests (T2): ensure-once draft creation and tenant
 * scoping. The in-memory Prisma double models the two website tables only and
 * records every query, so the tests can assert both behavior and scoping.
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

type PublishedRow = Omit<DraftRow, 'themeId'> & { themeId: string | null; publishedAt: Date };

function draftRow(agencyId: bigint, overrides: Partial<DraftRow> = {}): DraftRow {
  return {
    id: 1n,
    agencyId,
    slug: '',
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

const mockConfig = {
  get: (key: string) =>
    ({ PREVIEW_TOKEN_SECRET: 'test-shared-secret', STOREFRONT_BASE_URL: 'http://store.test' })[key],
} as unknown as ConfigService;

function makeService(prisma: PrismaService): WebsiteService {
  return new WebsiteService(prisma, mockConfig);
}

function createPrismaDouble() {
  const drafts = new Map<string, DraftRow>();
  const published = new Map<string, PublishedRow>();
  const queryLog: Array<{ delegate: 'draft' | 'published'; operation: string; agencyId: bigint }> = [];

  const prisma = {
    agencyWebsiteDraft: {
      findFirst: vi.fn(async (args: { where: { agencyId: bigint } }) => {
        queryLog.push({ delegate: 'draft', operation: 'findFirst', agencyId: args.where.agencyId });
        return drafts.get(String(args.where.agencyId)) ?? null;
      }),
      create: vi.fn(async (args: { data: Omit<DraftRow, 'id'> }) => {
        queryLog.push({ delegate: 'draft', operation: 'create', agencyId: args.data.agencyId });
        const row = draftRow(args.data.agencyId, args.data as Partial<DraftRow>);
        drafts.set(String(row.agencyId), row);
        return row;
      }),
    },
    agencyWebsite: {
      findFirst: vi.fn(async (args: { where: { agencyId: bigint } }) => {
        queryLog.push({ delegate: 'published', operation: 'findFirst', agencyId: args.where.agencyId });
        return published.get(String(args.where.agencyId)) ?? null;
      }),
    },
  } as unknown as PrismaService;

  return { prisma, drafts, published, queryLog };
}

describe('WebsiteService (data-layer scaffold, T2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('ensureDraft', () => {
    it('creates the draft on first access with defaults derived from the agency code', async () => {
      const { prisma, drafts } = createPrismaDouble();
      const service = makeService(prisma);

      const draft = await service.ensureDraft(5n, 'AGY-SAHARA00001');

      expect(draft.slug).toBe('agy-sahara00001');
      expect(draft.locale).toBe('en');
      expect(draft.themeId).toBeNull();
      expect(draft.themeSettings).toEqual({});
      expect(draft.content).toEqual({});
      expect(draft.branding).toEqual({});
      expect(draft.navigation).toEqual([]);
      expect(draft.footer).toEqual({});
      expect(drafts.has('5')).toBe(true);
    });

    it('returns the existing draft on subsequent access without creating a second row', async () => {
      const { prisma, queryLog } = createPrismaDouble();
      const service = makeService(prisma);

      const first = await service.ensureDraft(5n, 'AGY-SAHARA00001');
      const second = await service.ensureDraft(5n, 'AGY-SAHARA00001');

      expect(second).toBe(first);
      expect(queryLog.filter((entry) => entry.delegate === 'draft' && entry.operation === 'create')).toHaveLength(1);
    });
  });

  describe('getPublished', () => {
    it('returns the published row when the site has been published', async () => {
      const { prisma, published } = createPrismaDouble();
      const service = makeService(prisma);
      published.set(
        '5',
        { ...draftRow(5n, { slug: 'demo' }), themeId: null, publishedAt: new Date('2026-09-29T00:00:00Z') } as PublishedRow,
      );

      const row = await service.getPublished(5n);

      expect(row.slug).toBe('demo');
      expect(typeof row.publishedAt).toBe('string');
    });

    it('throws WEBSITE_NOT_PUBLISHED when the site has never been published', async () => {
      const { prisma } = createPrismaDouble();
      const service = makeService(prisma);

      await expect(service.getPublished(5n)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.getPublished(5n)).rejects.toMatchObject({
        response: { statusCode: 404, errorCode: WEBSITE_NOT_PUBLISHED },
      });
    });
  });

  describe('tenant scoping', () => {
    it('scopes every draft and published lookup to the exact agency passed in', async () => {
      const { prisma, drafts, published, queryLog } = createPrismaDouble();
      const service = makeService(prisma);

      await service.ensureDraft(5n, 'AGY-SAHARA00001');
      drafts.set(
        '9',
        draftRow(9n, { slug: 'other-agency' }),
      );

      const other = await service.ensureDraft(9n, 'AGY-ATLAS000001');
      published.set('5', { ...draftRow(5n, { slug: 'demo' }), themeId: null, publishedAt: new Date('2026-09-29T00:00:00Z') } as PublishedRow);
      await service.getPublished(5n);

      // Agency 9 gets its own row, never agency 5's, and it is found without a create.
      expect(other.agencyId).toBe(9n);
      expect(other.slug).toBe('other-agency');
      expect(queryLog.filter((entry) => entry.delegate === 'draft' && entry.operation === 'create')).toHaveLength(1);
      expect(queryLog.some((entry) => entry.agencyId === 5n)).toBe(true);
      expect(queryLog.filter((entry) => entry.delegate === 'draft' && entry.operation === 'findFirst'))
        .toHaveLength(2);
      expect(
        queryLog.filter(
          (entry) =>
            entry.delegate === 'draft' && entry.operation === 'findFirst' && entry.agencyId === 5n,
        ),
      ).toHaveLength(1);
    });
  });
});