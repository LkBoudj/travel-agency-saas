name: zustand-store-pattern
description: >-
  Dashboard conventions for structuring Zustand client-state stores. Use when creating or
  editing any client-side state store, or when the user mentions "store", "global state",
  or "zustand".

---
# Zustand Store Pattern

## Workflow

1. One store per concern in `src/stores/`, kebab-case filename: `<name>.store.ts` (e.g. `sidebar.store.ts`, `auth.store.ts`, `trip-editor.store.ts`). Never one giant app-wide store.
2. Export a single typed hook per file: `use<Name>Store`.
3. Store only client/UI state (sidebar open/close, selected agency context, UI prefs). Server data belongs in TanStack Query, never Zustand.

## Example

```tsx
// src/stores/sidebar.store.ts
import { create } from "zustand";

interface SidebarState {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

export const useSidebarStore = create<SidebarState>()((set) => ({
  isOpen: false,
  toggle: () => set((prev) => ({ isOpen: !prev.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
```

## Usage

```tsx
import { useSidebarStore } from "@/stores/sidebar.store";

function SidebarToggle() {
  const { isOpen, toggle } = useSidebarStore();
  return <Button onClick={toggle}>{isOpen ? "Close" : "Open"}</Button>;
}
```

## Do NOT

- Put API/server data in a Zustand store (read that via TanStack Query).
- Create a single root store combining unrelated concerns.
- Fetch data inside a store.
- Use default exports.

## Store With What

| Concern | Where |
|---|---|
| Sidebar open/closed, selected tab, UI prefs | Zustand (`src/stores/<name>.store.ts`) |
| Trips, bookings, any server data | TanStack Query (`features/<feature>/queries/`) |

## Naming

- File: `<feature-or-uitopic>.store.ts` (kebab-case)
- Hook: `use<UiTopic>Store` (e.g. `useSidebarStore`, `useTripEditorStore`)