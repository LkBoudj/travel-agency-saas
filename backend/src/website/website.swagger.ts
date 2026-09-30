/**
 * OpenAPI schemas for the website slice. Hand-written JSON schemas mirroring
 * the dashboard-facing DTOs so `/docs` matches what the client actually uses.
 */

const SLUG_PROPERTY = { type: 'string', example: 'demo' };
const THEME_ID_PROPERTY = { type: 'string', nullable: true, example: 'starter' };

const NAV_LINK_SCHEMA = {
  type: 'object',
  properties: { label: { type: 'string' }, href: { type: 'string' } },
};

const CONTENT_SCHEMA = {
  type: 'object',
  description:
    'Agency-owned marketing content. Known keys are typed; unknown keys are preserved.',
  properties: {
    hero: { type: 'object', description: 'image, title, subtitle' },
    trustPoints: { type: 'array', description: 'icon, title, text' },
    promotion: { type: 'object', description: 'eyebrow, title, text, image, ctaLabel, ctaHref' },
    testimonials: { type: 'array', description: 'quote, author, location' },
    finalCta: { type: 'object', description: 'title, subtitle, ctaLabel, ctaHref' },
    featuredTourCodes: {
      type: 'array',
      items: SLUG_PROPERTY,
      description: 'Ordered featured picks, resolved against PUBLISHED tours at compose',
      example: ['TUR-3F2A91C7B4D0'],
    },
  },
};

const BRANDING_SCHEMA = {
  type: 'object',
  description: 'Agency-owned brand copy (name/tagline/about/logo/contact).',
};

const NAVIGATION_SCHEMA = {
  type: 'array',
  description: 'Ordered navigation links',
  items: { type: 'object', properties: { label: { type: 'string' }, href: { type: 'string' } } },
};

const FOOTER_SCHEMA = { type: 'object', description: 'Agency-owned footer copy.' };

export const WEBSITE_DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    slug: SLUG_PROPERTY,
    locale: { type: 'string', example: 'en' },
    themeId: THEME_ID_PROPERTY,
    themeSettings: { type: 'object', description: 'Opaque theme settings; schema lives in the theme registry' },
    content: CONTENT_SCHEMA,
    branding: BRANDING_SCHEMA,
    navigation: NAVIGATION_SCHEMA,
    footer: FOOTER_SCHEMA,
  },
};

export const WEBSITE_PUBLISHED_SCHEMA = {
  type: 'object',
  properties: {
    ...WEBSITE_DRAFT_SCHEMA.properties,
    publishedAt: { type: 'string', format: 'date-time', description: 'Last publish timestamp' },
  },
};

const PATCH_BODY_GROUP = {
  content: CONTENT_SCHEMA,
  branding: BRANDING_SCHEMA,
  navigation: NAVIGATION_SCHEMA,
  footer: FOOTER_SCHEMA,
};

export const WEBSITE_CONTENT_PATCH_BODY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  description:
    'Strict: theme keys (`themeId`, `themeSettings`) are rejected. Content/branding/footer ' +
    'groups are deep-merged; navigation replaces the whole list.',
  properties: {
    locale: { type: 'string', example: 'en' },
    ...PATCH_BODY_GROUP,
  },
};

export const WEBSITE_THEME_PATCH_BODY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  description: 'Strict: content keys are rejected. themeSettings is opaque JSON.',
  properties: {
    themeId: THEME_ID_PROPERTY,
    themeSettings: { type: 'object', description: 'Opaque theme settings; schema lives in the theme registry' },
  },
};

export const WEBSITE_PREVIEW_BODY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    page: { type: 'string', enum: ['home', 'trips'], description: 'Defaults to home' },
  },
};

export const WEBSITE_PREVIEW_SCHEMA = {
  type: 'object',
  properties: {
    previewUrl: {
      type: 'string',
      example: 'http://localhost:4321/_lab/starter/home?t=…',
      description: 'Signed, short-lived Theme Lab preview link for the draft',
    },
  },
};

export const WEBSITE_TOUR_CATALOG_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      code: SLUG_PROPERTY,
      name: { type: 'string' },
      coverImageUrl: { type: 'string', nullable: true },
      shortDescription: { type: 'string', nullable: true },
    },
  },
};

// Public read boundary (T4) — mirrors `StorefrontData` (storefront contract).
const IMAGE_REF_SCHEMA = {
  type: 'object',
  properties: { src: { type: 'string' }, alt: { type: 'string' } },
};

const TOUR_PUBLIC_SCHEMA = {
  type: 'object',
  properties: {
    slug: { type: 'string', description: 'Stable tour code (`TUR-…`)' },
    title: { type: 'string' },
    excerpt: { type: 'string' },
    price: {
      type: 'object',
      nullable: true,
      description: 'Cheapest OPEN-departure price; null when none exists',
      properties: { amount: { type: 'number' }, currency: { type: 'string' } },
    },
    durationDays: { type: 'number' },
    image: { ...IMAGE_REF_SCHEMA, nullable: true },
    destinations: { type: 'array', items: { type: 'string' } },
    featured: { type: 'boolean' },
    description: { type: 'string' },
    highlights: { type: 'array', items: { type: 'string' } },
    includes: { type: 'array', items: { type: 'string' } },
    excludes: { type: 'array', items: { type: 'string' } },
    itinerary: {
      type: 'array',
      items: {
        type: 'object',
        properties: { day: { type: 'number' }, title: { type: 'string' }, description: { type: 'string' } },
      },
    },
  },
};

export const STOREFRONT_DATA_SCHEMA = {
  type: 'object',
  description:
    'Storefront-shaped whitelist DTO for the public edge. Mirrors the storefront `StorefrontData` contract.',
  properties: {
    config: {
      type: 'object',
      properties: {
        tenantSlug: SLUG_PROPERTY,
        locale: { type: 'string', example: 'en' },
        themeId: THEME_ID_PROPERTY,
        branding: {
          type: 'object',
          description: 'composed branding (name, logo, tagline, colors)',
        },
        navigation: { type: 'array', items: NAV_LINK_SCHEMA },
        footer: {
          type: 'object',
          description: 'composed footer (description, columns, legal)',
        },
        settings: { type: 'object', description: 'Opaque theme settings' },
      },
    },
    hero: {
      type: 'object',
      description: 'composed hero (title, subtitle, image)',
    },
    tours: { type: 'array', items: TOUR_PUBLIC_SCHEMA },
    trustPoints: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, icon: { type: 'string' } },
      },
    },
    promotion: { type: 'object', description: 'composed promotion (eyebrow, title, description, cta)' },
    testimonials: {
      type: 'array',
      items: {
        type: 'object',
        properties: { quote: { type: 'string' }, author: { type: 'string' }, role: { type: 'string' } },
      },
    },
    finalCta: { type: 'object', description: 'composed final CTA (title, description, primaryCta)' },
  },
};