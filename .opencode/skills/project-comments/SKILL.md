name: project-comments
description: >-
  Repo-wide conventions for writing, organizing, and maintaining code comments across
  the travel-saas apps. Use when adding or updating comments in any file.

---
# Commenting Guidelines

## Purpose

- Comments explain **why**, not **what** — the code already says what it does.
- Use them for complex logic, non-obvious decisions, and context future maintainers need.
- Do not duplicate what the code clearly expresses, and do not comment every line.

## What to Comment

- Complex or surprising logic ("why" + the trade-off / constraint).
- Non-obvious business rules (e.g. canonical URL / hreflang handling, RTL nuance in `ar`).
- `// TODO:`, `// FIXME:`, `// HACK:` markers with a short reason.
- JSDoc for exported functions/types only when the contract is not obvious from the signature.

## Do

```tsx
// UTC timestamp avoids timezone drift on storage
const ts = Date.now();

// Debounce search to reduce API calls (300ms)
useEffect(() => {
  const t = setTimeout(() => setQuery(value), 300);
  return () => clearTimeout(t);
}, [value]);
```

## Don't

```tsx
// DON'T comment what the code obviously does
const price = 100; // set price to 100
let total = 0;     // initialize total
```

- No "OWNER"/"LAST UPDATE" headers — ownership comes from git history.
- No fabricated references to a backend, database, or API that is not in this repo.
- Keep AR/RTL correctness in mind: note bidi behavior thresholds where it matters, don't paper over it.