import { z } from 'zod';

export const agencyStatusCodeSchema = z.enum(['ACTIVE', 'SUSPENDED']);

export const listAgenciesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: agencyStatusCodeSchema.optional(),
});

export type ListAgenciesQuery = z.infer<typeof listAgenciesQuerySchema>;

const agencyNameSchema = z.string().trim().min(1).max(200);
const countrySchema = z.string().trim().min(1).max(100).nullish();
const descriptionSchema = z.string().trim().min(1).max(5000).nullish();

const optionalOwnerNameSchema = z.string().trim().min(1).max(100).nullish();

/**
 * Owner of the agency being created, as a discriminated union.
 *
 * EXISTING points at an account that is already on the platform; NEW brings the
 * owner's identity into existence in the same transaction as the agency. Either
 * way the ownership structure itself is backend-owned: `membershipType`, the
 * canonical system role, role keys/ids and account status are never accepted
 * from a client (`.strict()` rejects them outright).
 */
const existingOwnerSchema = z
  .object({
    type: z.literal('EXISTING'),
    appUserCode: z.string().trim().min(1).max(24),
  })
  .strict();

const newOwnerSchema = z
  .object({
    type: z.literal('NEW'),
    email: z.email().trim().toLowerCase(),
    password: z.string().min(8).max(72),
    firstName: optionalOwnerNameSchema,
    lastName: optionalOwnerNameSchema,
  })
  .strict();

export const agencyOwnerSchema = z.discriminatedUnion('type', [
  existingOwnerSchema,
  newOwnerSchema,
]);

export type AgencyOwnerInput = z.infer<typeof agencyOwnerSchema>;

/**
 * Platform-side manual agency creation.
 *
 * The agency and its owner are one business operation: the agency, the ACTIVE
 * OWNER membership and the owner's canonical role assignment are always written
 * together, and for a NEW owner the account is created in that same
 * transaction. `code` and `status` are backend-owned and rejected if present;
 * an agency is always created ACTIVE with exactly one ACTIVE OWNER.
 */
export const createAgencySchema = z
  .object({
    name: agencyNameSchema,
    owner: agencyOwnerSchema,
    country: countrySchema,
    description: descriptionSchema,
  })
  .strict();

export type CreateAgencyBody = z.infer<typeof createAgencySchema>;

/**
 * Profile edit owns the descriptive fields only. `code`, `status` and ownership
 * are never accepted here; status has a dedicated endpoint and ownership
 * transfer is a later slice.
 */
export const updateAgencySchema = z
  .object({
    name: agencyNameSchema.optional(),
    country: countrySchema.optional(),
    description: descriptionSchema.optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.name !== undefined ||
      data.country !== undefined ||
      data.description !== undefined,
    { message: 'At least one field must be provided' },
  );

export type UpdateAgencyBody = z.infer<typeof updateAgencySchema>;

/**
 * Suspend / reactivate the BUSINESS. This never touches membership status: the
 * OWNER membership stays ACTIVE while the agency is SUSPENDED.
 */
export const setAgencyStatusSchema = z
  .object({
    status: agencyStatusCodeSchema,
  })
  .strict();

export type SetAgencyStatusBody = z.infer<typeof setAgencyStatusSchema>;
