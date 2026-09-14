name: forms-with-zod
description: >-
  Dashboard conventions for building forms with react-hook-form and Zod. Use when creating
  or editing any dashboard form, or when the user mentions "form", "validation", or "Zod schema".

---
# Forms with Zod

## Workflow

1. Zod schema owns validation. Place it in the feature's schemas folder:

   ```text
   features/<feature>/schemas/<feature>.schema.ts   # e.g. trip.schema.ts, agency.schemas.ts
   ```

   Do not co-locate schemas in component files.

2. Infer the type: `type TripFormValues = z.infer<typeof tripSchema>`.
3. Wire with `useForm({ resolver: zodResolver(schema) })` (via `@hookform/resolvers`).
4. Render with shadcn/ui `<Form>` primitives (`FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`) plus the Resolver's `setValue`, `watch`, `formState` — never a raw `<input>` styled by hand when a form primitive exists.

## Structure

Non-trivial forms follow the dashboard split:

```text
Page  → Feature Hook (use-<thing>.ts) → Form Component → Zod Schema
```

```tsx
// features/trips/schemas/trip.schema.ts
export const tripSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  price: z.number().positive("Price must be positive"),
  departureDate: z.date({ required_error: "Departure date is required" }),
});
export type TripFormValues = z.infer<typeof tripSchema>;
```

```tsx
// features/trips/hooks/use-trip-form.ts
export function useTripForm() {
  const form = useForm<TripFormValues>({ resolver: zodResolver(tripSchema) });
  const submit = async (values: TripFormValues) => { /* mutation */ };
  return { form, submit };
}
```

```tsx
// features/trips/components/trip-form.tsx
export function TripForm() {
  const { form, submit } = useTripForm();
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </form>
    </Form>
  );
}
```

## Do NOT

- Put validation logic inside `onSubmit` — the schema owns validation.
- Create a giant schema file shared across features — keep schemas feature-owned.
- Fake "server validation" (email/subdomain availability) before a real API exists.
- Use inline styles or default exports.