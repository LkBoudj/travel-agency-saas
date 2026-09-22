import { z } from 'zod';

/** An empty role selection is deliberate and valid (backend accepts it). */
export const manageRolesSchema = z
  .object({
    roleKeys: z.array(z.string().min(1)).max(50),
  })
  .strict();

export type ManageRolesFormValues = z.infer<typeof manageRolesSchema>;
export type ManageRolesField = keyof ManageRolesFormValues;
