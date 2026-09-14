name: theme-management
description: >-
  Dashboard conventions for themes and UI appearance: the local look-mode theme provider and
  CSS-variable tokens. Use when changing colors, dark/light mode, or UI appearance in this app.
  NOTE: storefront website themes live in the frontend/storefront app, not here.

---
# Theme Management

## Overview

The dashboard's theme is a **local look-mode** only (light/dark appearance). It is NOT a storefront website theme.

- Website/theme management (a storefront's visual identity) belongs to `frontend/storefront` (theme registry: `agency.themeId` → theme descriptor with `Layout`, `HomeTemplate`, `TripsTemplate`, `TripDetailTemplate`). Do not re-implement storefront theming here.
- The dashboard colors/palette are set by the shadcn preset + CSS variables. Consistent design across components.

## Files

```text
src/components/theme-provider.tsx    # React context provider wiring light/dark (class on <html>)
src/styles/…                         # any design-token CSS (verify before referencing a guess)
src/index.css                        # Tailwind base + token definitions (verify)
```

Verify the actual path before editing — do not assume `tailwind.config.js` / `tailwind.tokens.js` exist; this app uses Vite + Tailwind v4 style token configuration.

## Approach

- Toggle the `.dark` class (or equivalent) via the theme provider hook; components keep a single palette driven by CSS variables.
- Add new UI: use existing tokens (e.g. `bg-background`, `text-foreground`, `border`) instead of hardcoded hex values.
- Do not create a parallel "theme system" in the dashboard — reuse the provider + tokens.

## Do NOT

- Treat dashboard theme as a multi-theme registry (that is the storefront's job).
- Add new hardcoded colors; extend the token set when genuinely needed.
- Use an arbitrary lib/`apiClient`/`useThemeStore` theme flow invented elsewhere — the provider owns this.