import { z } from 'zod';

export const listAgenciesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});

export type ListAgenciesQuery = z.infer<typeof listAgenciesQuerySchema>;
