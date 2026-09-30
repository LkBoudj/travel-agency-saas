import { z } from 'zod';

export interface TrustPointRowFormValue {
  icon: string;
  title: string;
  text: string;
}

export interface TestimonialRowFormValue {
  quote: string;
  author: string;
  location: string;
}

export interface NavigationRowFormValue {
  label: string;
  href: string;
}

export interface FooterColumnFormValue {
  title: string;
  links: NavigationRowFormValue[];
}

export type WebsiteFormValues = z.infer<typeof websiteFormSchema>;

const navigationRowSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: z.string().trim().min(1).max(500),
});

export const websiteFormSchema = z.object({
  locale: z.enum(['en', 'ar']),
  hero: z.object({
    // A brand-new draft is empty by contract (`ensureDraft` stores `{}`, and the
    // public composer falls back to the agency name — `website-compose.ts`
    // `composeHero`). Incompleteness must never block saving the rest, so the
    // headline only has a length ceiling; the storefront renders the fallback.
    title: z.string().trim().max(120),
    subtitle: z.string().trim().max(300),
    image: z.string().trim().max(2048),
  }),
  trustPoints: z
    .array(
      z.object({
        icon: z.string().trim().max(40),
        title: z.string().trim().min(1).max(80),
        text: z.string().trim().max(500),
      })
    )
    .max(6),
  promotion: z.object({
    eyebrow: z.string().trim().max(80),
    title: z.string().trim().max(120),
    text: z.string().trim().max(500),
    ctaLabel: z.string().trim().max(40),
    ctaHref: z.string().trim().max(500),
  }),
  testimonials: z
    .array(
      z.object({
        quote: z.string().trim().min(1).max(1000),
        author: z.string().trim().min(1).max(120),
        location: z.string().trim().max(120),
      })
    )
    .max(8),
  finalCta: z.object({
    title: z.string().trim().max(120),
    subtitle: z.string().trim().max(300),
    ctaLabel: z.string().trim().max(40),
    ctaHref: z.string().trim().max(500),
  }),
  featuredTourCodes: z.array(z.string()).max(30),
  branding: z.object({
    // Same as the headline: an empty draft has no brand name yet and must stay
    // saveable.
    name: z.string().trim().max(120),
    tagline: z.string().trim().max(240),
    logo: z.string().trim().max(2048),
  }),
  navigation: z.array(navigationRowSchema).max(20),
  footer: z.object({
    description: z.string().trim().max(500),
    columns: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(60),
          links: z.array(navigationRowSchema).max(12),
        })
      )
      .max(6),
    legal: z.array(navigationRowSchema).max(12),
  }),
});

export const SUPPORTED_WEBSITE_LOCALES = ['en', 'ar'] as const;
