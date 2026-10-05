import { z } from 'zod';

export const registerSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(72),
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
});

export type RegisterBody = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});

export type LoginBody = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

export type ChangePasswordBody = z.infer<typeof changePasswordSchema>;

