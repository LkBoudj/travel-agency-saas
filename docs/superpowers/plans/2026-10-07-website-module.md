# Website Module End-to-End Implementation Plan

**Date**: 2026-10-07  
**Module**: Website (`Themes`, `Pages`, `Menu`, `Settings`)  
**Scope**: `frontend/agency-dashboard-mantine`  

---

## 1. Goal & Architecture Overview

Make the complete Website module production-ready and fully functional end-to-end:
```
Website
├── Themes   (/:agencyCode/themes)   → ThemesPage (existing, working, preserve)
├── Pages    (/:agencyCode/pages)    → PagesPage (PagesView + CreatePageDialog + EditPageDialog + HomeSectionsDrawer)
├── Menu     (/:agencyCode/menu)     → MenuPage (MenuView + AddMenuItemDialog + EditMenuItemDialog)
└── Settings (/:agencyCode/website)  → WebsitePage (WebsiteView + Branding, Contact, Publishing, Preview)
```

### Invariants & Rules
- **No fake functionality**: Every button, link, dialog, and action performs real state transitions and API calls.
- **Persistence**: Content, custom pages, navigation, branding, and footer persist through real backend endpoints (`GET /v1/agencies/:agencyCode/website/draft`, `PATCH /v1/agencies/:agencyCode/website/draft/content`, `POST /v1/agencies/:agencyCode/website/publish`, `POST /v1/agencies/:agencyCode/website/preview`).
- **Survives reload**: State is query-backed through React Query (`websiteQueryKeys`).
- **Strict page architecture**:
  ```tsx
  export function PagesPage() {
    const controller = usePagesPage();
    return (
      <>
        <PagesView {...controller} />
        <CreatePageDialog opened={controller.isCreateOpen} onClose={controller.closeCreate} ... />
      </>
    );
  }
  ```
- **Permission gating**: All website routes gated behind `AGENCY_WEBSITE_VIEW`. Content editing gated behind `AGENCY_WEBSITE_CONTENT_EDIT`. Publishing gated behind `AGENCY_WEBSITE_PUBLISH`.

---

## 2. File Map & Responsibilities

### Existing Files (Refine/Preserve)
- `src/features/themes/*`: Preserved as-is (already working).
- `src/features/website/api/website.api.ts`: API client functions.
- `src/features/website/queries/website.queries.ts`: Query keys.
- `src/features/website/hooks/use-website.ts`: Shared React Query hooks (`useWebsiteDraft`, `usePublishedWebsite`, `useWebsiteMutations`).
- `src/features/website/hooks/use-website-page.ts`: Settings page controller.
- `src/features/website/pages/website.page.tsx`: Settings composition page.
- `src/features/website/components/website-view.tsx`: Settings view.
- `src/app/router/route-paths.ts`: Add `dashboardPaths.pages` and `dashboardPaths.menu`.
- `src/app/router/routes.tsx`: Register `pages` and `menu` routes.
- `src/app/router/routes.test.ts`: Update route structure assertions.
- `src/app/layouts/hooks/use-nav-items.ts`: Route sidebar navigation directly to `dashboardPaths.pages`, `dashboardPaths.menu`, `dashboardPaths.website`, `dashboardPaths.themes`.

### New Files to Create
- `src/features/website/types/pages.types.ts`: Page definitions, PageKind, custom page shapes.
- `src/features/website/types/menu.types.ts`: Menu item and footer column definitions.
- `src/features/website/hooks/use-pages-page.ts`: Controller hook for Pages management.
- `src/features/website/hooks/use-menu-page.ts`: Controller hook for Menu navigation management.
- `src/features/website/pages/pages.page.tsx`: Thin composition for Pages.
- `src/features/website/pages/menu.page.tsx`: Thin composition for Menu.
- `src/features/website/components/pages/pages-view.tsx`: Visual layout of pages list, status badges, actions.
- `src/features/website/components/pages/create-page-dialog.tsx`: Dialog to create custom website page.
- `src/features/website/components/pages/edit-page-dialog.tsx`: Dialog to edit custom website page.
- `src/features/website/components/pages/edit-home-sections-drawer.tsx`: Drawer to edit home page sections (Hero, Trust Points, Promotion, Testimonials, CTA, Featured Tours).
- `src/features/website/components/menu/menu-view.tsx`: Visual layout of header and footer navigation management.
- `src/features/website/components/menu/add-menu-item-dialog.tsx`: Dialog to add link to header or footer menu.
- `src/features/website/components/menu/edit-menu-item-dialog.tsx`: Dialog to edit existing link.

---

## 3. Tasks & Implementation Steps

- [ ] **Task 1: Routing & Navigation Wiring**
  - Add `pages` and `menu` to `dashboardPaths` in `src/app/router/route-paths.ts`.
  - Wire `use-nav-items.ts` to use real paths (`dashboardPaths.pages`, `dashboardPaths.menu`).
  - Register `pages` and `menu` routes in `src/app/router/routes.tsx` with `RequirePermission permissions={['AGENCY_WEBSITE_VIEW']}`.
  - Update `src/app/router/routes.test.ts` to reflect the updated route list and feature public APIs.

- [ ] **Task 2: Pages Feature Implementation**
  - Define `CustomWebsitePage` and `SystemWebsitePage` types.
  - Implement `usePagesPage()` hook: loads draft, parses `content.pages` and standard pages, manages creation/editing/deletion of custom pages and home page sections, persists via `saveContent.mutate`.
  - Implement `CreatePageDialog`: title, slug, content inputs, validation.
  - Implement `EditPageDialog`: edit title, slug, content for custom pages.
  - Implement `EditHomeSectionsDrawer`: full home page section editor with real persistence.
  - Implement `PagesView`: responsive table/card list of all pages with type (System / Custom), slug, status, last updated, and actions (Edit, Preview, Delete).
  - Implement `PagesPage` thin composition.

- [ ] **Task 3: Menu Feature Implementation**
  - Implement `useMenuPage()` hook: loads draft navigation and footer, manages ordering (move up/down), adding, editing, removing header menu items and footer columns/links, with dirty tracking and persistence.
  - Implement `AddMenuItemDialog` & `EditMenuItemDialog`: label, href, with quick-picker for known pages (Home `/`, Tours `/trips`, and custom pages).
  - Implement `MenuView`: clean drag/up-down list for header nav items and multi-column manager for footer columns.
  - Implement `MenuPage` thin composition.

- [ ] **Task 4: Settings & Go-Live Verification**
  - Ensure `WebsitePage` provides cohesive General Branding, Domain/Slug, Contact Info, and Go-Live publishing controls.
  - Verify `onPublish` calls `POST /v1/agencies/:agencyCode/website/publish` and updates published status.
  - Verify `viewWebsite` mints a live or preview link and opens correctly.

- [ ] **Task 5: End-to-End Tests & Quality Gates**
  - Write unit and component tests for `PagesPage`, `PagesView`, `MenuPage`, `MenuView`.
  - Run `npm run typecheck`, `npm run format:test`, `npm run lint`, `npm run vitest`, `npm run build`.
  - Verify in real browser with screenshots at 1536×1024.
