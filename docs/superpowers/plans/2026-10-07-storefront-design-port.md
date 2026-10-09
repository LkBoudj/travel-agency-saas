# Implementation Plan: Port Approved Storefront Design to Theme Agency

Date: 2026-10-07
Source: `origin/feat/tours-module:frontend/storefront`
Target: `frontend/theme-agency`

## Objectives
Port the approved visual design from the old Next.js storefront (`frontend/storefront` in `feat/tours-module`) into `frontend/theme-agency` (Astro), strictly preserving `theme-agency`'s backend contracts, data loading, dynamic agency content, theme architecture, and routing.

## Proposed Changes

### T1 — Shared design tokens and primitives
- Update `themes/starter/tokens.ts` with the approved color palette:
  - Brand: `#0f766e` (primary), brand-strong: `#115e59`, brand-soft: `#f0fdfa`
  - Neutral / Dark: surface-inverse `#0f172a`, surface-subtle `#f7f9f9`, border `#e4e4e7`
  - Typography: modern clean sans-serif (`Inter`, `Plus Jakarta Sans`, system fallbacks) for headings and body (replacing serif)
- Update `themes/starter/Layout.astro` with font links, global typography, container tokens, skip link
- Update `themes/starter/components/Icon.astro` with missing icons (`heart`, `crown`, `flame`, `mail`, `phone`, `message-circle`, `menu`, `close`, `chevron-down`, `search`)
- Update `themes/starter/components/Section.astro` to support approved container widths (`1440px`), padding rhythm (`96px`/`120px`), and centered headers

### T2 — Header + Hero
- Update `themes/starter/components/Header.astro`:
  - Transparent-over-hero state at top of page, transitions to solid blurred background on scroll
  - Full desktop layout: Logo/Wordmark, Navigation links (`text-[16px]`), primary CTA button (`h-[54px] rounded-full`)
  - Mobile hamburger toggle + animated slide/fade mobile drawer
  - Keyboard accessibility (ESC to close) and focus outlines
- Update `themes/starter/components/Hero.astro`:
  - Full-width hero container with image fill and subtle overlay gradient
  - Eyebrow (`text-[12px] uppercase tracking-[0.24em] text-white/80`)
  - Title (`text-[42px] sm:text-[56px] lg:text-[70px] font-bold text-white leading-[1.0]`)
  - Description text (`text-white/90 text-[17px] sm:text-[19px]`)
  - Primary pill button + secondary pill outline button
  - Trust items row with circular icons and divide lines
  - Integrated Search Panel matching the approved card (`rounded-[18px] bg-white shadow-xl` with destination, dates, travelers, search button)

### T3 — Tours / Journeys
- Update `themes/starter/components/FeaturedTours.astro`:
  - Centered header: eyebrow in primary, title, subtitle
  - 3-column responsive grid
  - "View All Tours" pill button
- Update `themes/starter/components/TourCard.astro`:
  - Aspect ratio 3/2 with hover zoom
  - Badges (Best Seller, Featured, Limited Availability, duration)
  - Favorite heart button
  - Title, destination with MapPin, duration, star rating + reviews count
  - Price formatting: "From $1,250 / person" or "Price on request" fallback
  - "View Tour" outline pill button with arrow

### T4 — Destinations
- Update `themes/starter/components/FeaturedDestinations.astro`:
  - Centered header: eyebrow, title, description
  - 12-column Bento Grid (large 7 cols x 2 rows, small 5 cols x 1 row, small 5 cols x 1 row, wide 12 cols x 1 row)
  - Destination card with full-bleed image, dark gradient, destination name, country, and `X Tours ->`
  - "Explore All Destinations" text link with arrow translation

### T5 — Trust / Story sections
- Update `themes/starter/components/WhyUs.astro`:
  - Centered header: eyebrow, title, description
  - 4-column card grid
  - Card: `rounded-[20px] border border-slate-200/80 bg-white px-6 py-10 text-center`
  - Soft brand icon container (`h-14 w-14 rounded-[14px] bg-primary-soft text-primary`), bold title, muted description

### T6 — Testimonials + CTA + Footer
- Update `themes/starter/components/PromotionalBanner.astro`:
  - `rounded-[24px]` card with cover image and dark gradient
  - Eyebrow, badge, title, description
  - White CTA pill button
- Update `themes/starter/components/Testimonials.astro`:
  - Background `bg-surface-subtle` (`#f7f9f9`)
  - Centered header
  - Asymmetric layout (`1.3fr : 1fr`): main testimonial on left, stacked testimonials on right
  - 5 stars, quote mark, quote text, avatar + name + role/verified badge
- Update `themes/starter/components/FinalCta.astro`:
  - `rounded-[24px] bg-surface-inverse` (`#0f172a`)
  - Eyebrow, title, description
  - Primary pill button + secondary outline pill button
- Update `themes/starter/components/Footer.astro`:
  - `bg-surface-inverse` (`#0f172a`)
  - 12-column top grid: Brand (5 cols), Explore (2 cols), Company (2 cols), Contact with icons (3 cols)
  - Social media pills
  - Bottom bar with copyright and legal links

### T7 — Responsive + RTL + accessibility
- Verify and refine styling for 1440px, 1024px, 768px, 375px
- Ensure full RTL support using logical CSS properties
- Check WCAG contrast, aria attributes, keyboard navigation

### T8 — Visual QA + build verification
- Run `npm test`, `npm run check`, `npm run lint`, `npm run theme:check`, `npm run theme:test`, `npm run build`
- Take screenshots at 1440px, 1024px, 375px
- Verify visual parity with approved storefront
