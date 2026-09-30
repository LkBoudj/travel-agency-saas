import { z } from 'zod';

/**
 * Website draft patch schemas.
 *
 * The content ⇄ theme-settings separation is a hard invariant: each `PATCH`
 * body is `.strict()` so a content body can never smuggle `themeId` /
 * `themeSettings` and a theme body can never smuggle content keys. Known keys
 * are type-checked; unknown inner keys are preserved untouched (forward
 * compatible) so the backend never silently drops agency data.
 */

const tourCodePattern = /^TUR-[A-Za-z0-9]+$/;

const heroSchema = z.object({
  image: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
});

const trustPointSchema = z.object({
  icon: z.string().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
});

const promotionSchema = z.object({
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
  image: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
});

const testimonialSchema = z.object({
  quote: z.string().optional(),
  author: z.string().optional(),
  location: z.string().optional(),
});

const finalCtaSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
});

export const websiteContentSchema = z
  .object({
    hero: heroSchema.optional(),
    trustPoints: z.array(trustPointSchema).optional(),
    promotion: promotionSchema.optional(),
    testimonials: z.array(testimonialSchema).optional(),
    finalCta: finalCtaSchema.optional(),
    featuredTourCodes: z
      .array(z.string().regex(tourCodePattern, 'Must look like TUR-…'))
      .max(30)
      .optional(),
  })
  .catchall(z.unknown());

const brandingSchema = z
  .object({
    name: z.string().max(120).optional(),
    tagline: z.string().max(240).optional(),
    about: z.string().max(2000).optional(),
    logo: z.string().optional(),
    contact: z
      .object({
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        mapEmbedUrl: z.string().optional(),
      })
      .catchall(z.unknown())
      .optional(),
  })
  .catchall(z.unknown());

const navigationLinkSchema = z
  .object({
    label: z.string().min(1).max(80),
    href: z.string().min(1).max(500),
  })
  .catchall(z.unknown());

export const websiteContentPatchSchema = z
  .object({
    locale: z.string().regex(/^[a-z]{2}$/).optional(),
    content: websiteContentSchema.partial().optional(),
    branding: brandingSchema.partial().optional(),
    navigation: z.array(navigationLinkSchema).max(20).optional(),
    footer: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const websiteThemePatchSchema = z
  .object({
    themeId: z
      .string()
      .regex(/^(?!.*--)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/)
      .nullable()
      .optional(),
    themeSettings: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const websitePreviewBodySchema = z
  .object({
    page: z.enum(['home', 'trips']).optional(),
  })
  .strict();

export type WebsiteContentPatch = z.infer<typeof websiteContentPatchSchema>;
export type WebsiteThemePatch = z.infer<typeof websiteThemePatchSchema>;
export type WebsitePreviewBody = z.infer<typeof websitePreviewBodySchema>;