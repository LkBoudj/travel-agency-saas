import { z } from 'zod';

export const AGENCY_APPLICATION_STATUSES = [
  'PENDING',
  'NEEDS_INFO',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
] as const;

export type AgencyApplicationStatus = (typeof AGENCY_APPLICATION_STATUSES)[number];

export const agencyApplicationStatusCodeSchema = z.enum(AGENCY_APPLICATION_STATUSES);

const agencyNameSchema = z.string().trim().min(1).max(200);

const optionalCountrySchema = z.string().trim().min(1).max(100).nullish();

const optionalWebsiteSchema = z
  .string()
  .trim()
  .max(255)
  .nullish()
  .refine((value) => value == null || /^https?:\/\/\S+$/.test(value) || /^[^\s]+$/.test(value), {
    message: 'Website must be a valid URL',
  });

const optionalDescriptionSchema = z.string().trim().max(5000).nullish();

/**
 * Agency application submission. The applicant identity is owned by the
 * backend (derived from the JWT); `applicantUserId` and any status/review
 * field are backend-owned and rejected when present (`.strict()`).
 */
export const createAgencyApplicationSchema = z
  .object({
    agencyName: agencyNameSchema,
    country: optionalCountrySchema,
    website: optionalWebsiteSchema,
    description: optionalDescriptionSchema,
  })
  .strict();

export type CreateAgencyApplicationBody = z.infer<typeof createAgencyApplicationSchema>;

/** NEEDS_INFO request. `reviewNote` explains what information is missing. */
export const requestAgencyApplicationInfoSchema = z
  .object({
    reviewNote: z.string().trim().min(1).max(5000),
  })
  .strict();

export type RequestAgencyApplicationInfoBody = z.infer<typeof requestAgencyApplicationInfoSchema>;

/** Rejection. `reviewNote` carries the reason. */
export const rejectAgencyApplicationSchema = z
  .object({
    reviewNote: z.string().trim().min(1).max(5000),
  })
  .strict();

export type RejectAgencyApplicationBody = z.infer<typeof rejectAgencyApplicationSchema>;

export const listAgencyApplicationsQuerySchema = z.object({
  status: agencyApplicationStatusCodeSchema.optional(),
  search: z.string().trim().max(100).optional(),
});

export type ListAgencyApplicationsQuery = z.infer<typeof listAgencyApplicationsQuerySchema>;
