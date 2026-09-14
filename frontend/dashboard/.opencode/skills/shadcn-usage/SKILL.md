name: shadcn-usage
description: >-
  Dashboard conventions for shadcn/ui: when to reuse primitives, how to add a new component,
  and where components live. Use for any shadcn/ui related task in this app.

---
# shadcn/ui Usage

## Key Facts

- shadcn/ui is **already installed** in this app (preset + primitives in `src/components/ui/`). Do not re-run the init, do not replace the preset, do not rewrite generated primitives without a clear reason.
- Add new components with the official CLI only, when the user approves it:
  `npx shadcn@latest add <component>`
- Reuse existing primitives before building custom UI. Do not add another UI library.

## Where Things Live

```text
src/components/ui/       # shadcn primitives + base UI components (button, input, dialog, card, ...)
src/components/shared/   # components genuinely reused across unrelated features (bidi-text, confirm-dialog, page-header, ...)
features/<feature>/components/   # feature-specific components (e.g. trips/components/, NOT trips/ui/)
```

Do not promote a component to `shared/` just because it's reused several times inside one feature.

## Styling

- Use the existing design system tokens + Tailwind utility classes — not arbitrary hardcoded colors.
- Dark/light are managed by the theme provider (`src/components/theme-provider.tsx`) and CSS variables; respect `[data-theme]`/`.dark` where used.
- AR content: keep RTL/bidi correctness (`bidi-text` handles bidirectional text where needed).

## Editing a Primitive

Only when the task requires it: keep the shadcn structure and naming (Radix slot pattern), edit in place, no export/preset drift. Verify with `npm run typecheck`.