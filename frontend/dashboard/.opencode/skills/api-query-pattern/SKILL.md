name: api-query-pattern
description: >-
  Dashboard conventions for data fetching with TanStack Query and the feature API layer.
  Use when creating or editing any API call, query key, or mutation, or when the user mentions
  "fetch", "query", "mutation", or "API call".

---
# API + Query Pattern

## Workflow

1. API functions live in `features/<feature>/api/<feature>.api.ts`; query hooks + query keys in `features/<feature>/queries/<feature>.queries.ts`. Components never call `fetch` directly.
2. Flow: `Component → feature hook → useQuery/useMutation → api layer`.
3. Auth is **session cookies** — the api layer uses `fetch(url, { credentials: "include" })`. No axios, no `Authorization: Bearer`, no localStorage tokens (the auth boundary belongs to the platform/backend).
4. Query keys are a typed const per feature so invalidation stays consistent.
5. On mutation success, invalidate the related query key — do not manually patch cache.
6. Normalize errors in the api layer to `{ status: number; message: string; fields?: Record<string, string> }`, thrown/returned so hooks stay transport-agnostic.

## Query Keys + API

```tsx
// features/trips/queries/trips.queries.ts
export const tripKeys = {
  all: ["trips"] as const,
  lists: () => [...tripKeys.all, "lists"] as const,
  list: (filters?: TripFilters) => [...tripKeys.lists(), filters] as const,
  details: () => [...tripKeys.all, "details"] as const,
  detail: (id: string) => [...tripKeys.details(), id] as const,
};
```

## Query Hook

```tsx
export function useTrips(filters?: TripFilters) {
  return useQuery({
    queryKey: tripKeys.list(filters),
    queryFn: () => fetchTrips(filters),
    enabled: !!filters,
  });
}
```

## Mutation Hook

```tsx
export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTripData) => createTrip(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripKeys.lists() }),
  });
}
```

## Do NOT

- Call fetch/axios inside a page or component when an api/query boundary exists.
- Ad hoc string query keys — typed key structure keeps invalidation reliable.
- Mirror server state in Zustand; `useQuery` owns cache.
- Invent endpoints or request shapes — build clean integration boundaries only (backend is a separate system).

## Best Practices

- `select` to transform data without touching cache; `enabled` for conditional queries.
- Handle errors via normalized api-layer errors / `onError` / mutation `error` state.
- Group related queries and mutations in the feature's `queries/` folder.