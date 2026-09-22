import { z } from 'zod';

export const inviteMemberSchema = z
  .object({
    email: z.string().trim().min(1).max(254).email(),
    roleKeys: z.array(z.string().min(1)).max(50),
  })
  .strict();

export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;
export type InviteMemberField = keyof InviteMemberFormValues;
