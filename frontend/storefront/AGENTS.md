<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# AGENTS.md — Storefront

App-local instructions for `frontend/storefront/`.

Repository-wide architecture, workflow, safety, dependency policy, Git policy,
and general verification rules live in the root `AGENTS.md` and apply here automatically.

Do not duplicate root rules in this file.

## 1. Purpose

`frontend/storefront/` is the public single-Agency storefront application for the Travel SaaS platform.

It is a standalone Next.js App Router application.

One Storefront application serves many Agencies.

The Storefront is responsible for rendering one Agency's public website using that Agency's data and selected Theme.

Conceptually:

```text
Request
  ↓
Resolve Agency
  ↓
Load public Agency + Trip data
  ↓
Read agency.themeId
  ↓
Theme Registry
  ↓
Selected Theme
  ↓
Render Storefront
````

Do not create:

* one application per Agency
* one Next.js application per Theme
* Marketplace functionality inside Storefront

`frontend/marketplace/` is a separate public product surface for multi-Agency discovery.

## 2. Source-of-Truth Boundaries

The Storefront consumes public/read representations of platform data.

It does not become a new business-data source of truth.

Preserve these boundaries:

```text
Backend / Platform
→ business/domain truth

Storefront platform layer
→ tenant resolution
→ routing
→ public data loading
→ locale
→ SEO
→ preview context

Theme
→ presentation
```

Themes must never duplicate or own:

* Agency business data
* Trip business data
* pricing rules
* tenant membership logic
* authentication rules
* backend URLs
* SEO source of truth

If a Theme needs data, extend the appropriate Storefront read/view model rather than bypassing the platform boundary.

## 3. Next.js Rules

This application uses the installed Next.js version as the authority.

Before implementing or changing framework-sensitive behavior:

1. inspect the relevant guide in:

```text
node_modules/next/dist/docs/
```

2. verify the API/convention against the installed version
3. heed deprecation notices
4. do not rely on remembered Next.js behavior when local documentation differs

Prefer the installed framework's current documented behavior over model training knowledge.

## 4. Framework-Native Tooling

When Next.js provides an official supported command or migration path for framework-owned initialization, generation, or migration work, prefer it over manually recreating generated files.

Workflow:

```text
Inspect version
→ Read local Next.js docs
→ Use official tooling when appropriate
→ Inspect generated output
→ Adapt to project architecture
→ Verify
```

Do not manually imitate framework-generated boilerplate merely because its structure is known.

Manual scaffolding is acceptable only when the official tool is unsafe, destructive, unavailable, or unsuitable for the existing application structure.

If deviating from official tooling, state the technical reason.

## 5. App Router Conventions

Use App Router conventions supported by the installed Next.js version.

Prefer Server Components by default.

Use `"use client"` only when genuine browser-side interaction requires it.

Typical valid client boundaries include:

* interactive search controls
* filter controls
* mobile navigation
* interactive galleries
* browser-only widgets

Do not turn entire pages or layouts into Client Components for convenience.

Keep client boundaries as small and local as practical.

## 6. Storefront Platform Layer

The Storefront platform layer owns:

* Agency / tenant resolution
* route interpretation
* locale resolution
* public data loading
* public vs preview mode
* Theme selection
* metadata generation
* canonical URLs
* alternate-language URLs
* structured data
* not-found behavior
* public URL generation

Theme code must not take over these responsibilities.

Preferred flow:

```text
Route
  ↓
Platform resolver / loader
  ↓
Storefront view model
  ↓
Theme template
```

Avoid:

```text
Theme component
  ↓
fetch API
  ↓
resolve tenant
  ↓
generate SEO
```

## 7. Theme Architecture

Themes are platform-owned presentation systems.

A Theme may conceptually expose:

```ts
interface StorefrontTheme {
  id: string;
  nameKey: string;

  Layout: React.ComponentType<ThemeLayoutProps>;
  HomeTemplate: React.ComponentType<HomeTemplateProps>;
  TripsTemplate: React.ComponentType<TripsTemplateProps>;
  TripDetailTemplate: React.ComponentType<TripDetailTemplateProps>;
}
```

The exact contract must follow the current implementation.

Do not create a plugin engine unless explicitly requested.

Do not implement:

* runtime ZIP themes
* arbitrary third-party code execution
* one app per Theme
* duplicated routing per Theme

A new Theme should ideally be addable through:

```text
Theme implementation
+
Theme Registry entry
```

without rewriting routing, SEO, tenant resolution, locale handling, or public data loading.

## 8. Theme Component Rules

Theme templates are Server Components by default.

Themes receive Storefront data through props.

Theme code owns presentation logic only.

Allowed inside Theme code:

* formatting presentation values
* choosing visual variants
* arranging content
* deriving display-only labels
* conditional rendering
* small interactive Client Components where required

Theme code must not own:

* tenant resolution
* platform data fetching
* authentication
* backend/API configuration
* canonical URL logic
* metadata generation
* structured-data ownership
* business source-of-truth logic

Do not treat "presentation-only" as "no logic whatsoever".

Local presentation transformations are valid.

## 9. Public and Preview Rendering

Public and Preview must use the same Theme renderer.

Correct:

```text
Public context
      ↓
Theme Renderer
      ↓
Theme

Preview context
      ↓
Theme Renderer
      ↓
Theme
```

Incorrect:

```text
PublicTheme01
PreviewTheme01
```

Preview mode is resolved by the Storefront platform layer.

Preview-specific UI, such as:

* Preview
* Draft
* Back to editor

must render outside Theme presentation.

Preview content must always be `noindex`.

`noindex` is not authorization.

Do not treat frontend preview routing as a security boundary.

## 10. Locale and RTL

Supported Storefront locales currently include:

```text
ar
en
```

Both are first-class product languages.

Use one component tree.

Do not build separate Arabic and English implementations.

Localized public routes live below:

```text
/[locale]
```

The platform layer owns locale routing and localized SEO relationships.

Ensure the rendered document uses the correct:

```text
lang
dir
```

Arabic must use genuine RTL.

Prefer logical CSS properties where direction matters.

Avoid hardcoded `left` / `right` assumptions for directional layout.

Directional icons and navigation behavior must adapt correctly.

Use `Intl` for user-facing:

* currency
* dates
* numbers

Preserve bidi readability for:

* Agency names
* Trip names
* phone numbers
* licence numbers
* technical identifiers

## 11. SEO Contract

Storefront is a public SEO-sensitive application.

SEO is owned by the Storefront platform layer, not individual Themes.

The platform layer may own:

* title
* meta description
* canonical URL
* hreflang / alternates
* Open Graph metadata
* index / noindex behavior
* structured data
* tenant-aware public URLs

Themes must remain SEO-compatible.

Every Theme must:

* render semantic HTML
* use meaningful heading hierarchy
* expose important content in crawlable HTML
* use real links for navigation
* support meaningful image alt text
* avoid hiding primary content behind unnecessary client-only rendering
* preserve platform SEO metadata
* avoid generating competing canonical metadata

Do not choose `h1`, `h2`, etc. purely for visual styling.

## 12. Semantic Structure

Use appropriate semantic elements where they improve meaning:

```html
<header>
<nav>
<main>
<article>
<section>
<footer>
```

Avoid unnecessary wrapper `<div>` structures when semantic elements express the content better.

Accessibility and SEO should reinforce each other rather than be implemented separately.

## 13. Performance

This application is public and performance-sensitive.

Prefer Server Components when appropriate.

Keep client JavaScript limited to genuine interactions.

For media:

* use stable aspect ratios
* avoid unnecessary layout shifts
* lazy-load below-fold imagery where appropriate
* provide meaningful alt text
* use responsive image sizing
* respect existing media boundaries

Do not introduce heavy visual libraries merely for cosmetic effects.

Avoid making the whole Storefront client-rendered.

## 14. Theme Visual Quality

Storefront Themes are public customer-facing products.

UI changes must be evaluated as rendered interfaces, not only as source code.

For meaningful Theme/UI changes, verify:

* desktop
* tablet
* mobile
* English
* Arabic
* RTL
* long content
* missing optional content
* image variation
* price/availability states

Do not use fake tests as a substitute for visual verification of layout and CSS.

Do not invent:

* ratings
* testimonials
* verified badges
* awards
* customer counts
* fake scarcity
* marketing statistics

unless backed by real platform data.

## 15. Accessibility

Public Storefront work must account for:

* keyboard navigation
* visible focus states
* semantic controls
* correct labels
* useful alt text
* accessible navigation
* accessible dialogs/sheets
* sufficient contrast
* touch-target size
* RTL behavior
* meaningful link/button text

Do not defer obvious accessibility defects as visual polish.

## 16. Storefront vs Dashboard

Do not copy Dashboard-specific architecture into Storefront.

Dashboard conventions such as:

* shadcn/ui
* React Hook Form
* Zustand
* TanStack Query
* Axios
* Dashboard feature structure

do not automatically apply here.

Use Storefront requirements and the installed Next.js architecture to decide implementation.

If sharing code becomes justified later, establish a deliberate shared boundary instead of importing Dashboard implementation details directly.

## 17. Storefront vs Marketplace

Storefront:

```text
one Agency
→ its identity
→ its Trips
→ its Theme
```

Marketplace:

```text
many Agencies
→ cross-Agency discovery
→ platform-owned marketplace UX
```

Do not render Storefront Themes inside Marketplace unless explicitly designed as a future cross-app reuse boundary.

Do not copy Theme 01 into Marketplace.

Shared utilities/read models may be extracted later only when genuine reuse is proven.

## 18. Data Honesty

Do not invent backend behavior.

If a public API or tenant-resolution capability does not yet exist:

* use the established development adapter/boundary if available
* keep temporary behavior isolated
* clearly identify the production integration gap

Do not scatter fixture data through Theme components.

Do not make temporary fixture behavior look like a finished production backend capability.

## 19. Current Architecture vs Progress Tracking

This file defines durable operating rules.

Do not use `AGENTS.md` as a progress tracker.

For current implementation state, milestones, completed migrations, and architecture status, inspect the relevant project map and repository state.

If implementation changes invalidate an invariant in this file, update it deliberately.

Do not add temporary milestone notes here.

## 20. Verification

Run verification from:

```text
frontend/storefront/
```

Current package scripts include:

```bash
npm run lint
npm run build
```

There is currently no dedicated:

```bash
npm run typecheck
```

script.

Do not claim a typecheck script exists unless `package.json` actually defines it.

Use the scripts present in the current `package.json` as the source of truth.

For framework-sensitive changes, also validate behavior against the installed Next.js documentation.

For meaningful UI changes, static checks are not sufficient; perform rendered verification when tooling is available.

## 21. Completion Standard

Before considering Storefront work complete, confirm that the change:

* respects platform vs Theme boundaries
* does not duplicate domain truth
* preserves public/preview shared rendering
* preserves locale/RTL behavior
* remains SEO-compatible
* does not leak Dashboard architecture into Storefront
* does not mix Marketplace responsibility into Storefront
* uses installed Next.js conventions
* uses official tooling where appropriate
* passes relevant package verification
* has been visually inspected when UI behavior changed

If any required verification could not be performed, report that explicitly rather than implying success.


