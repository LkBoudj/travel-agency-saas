import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default('15m'),
  CORS_ORIGINS: z
    .string()
    .optional()
    .describe('Comma-separated allowed browser origins (required in production)'),

  // Rate limits. Each protected route reads a LIMIT/WINDOW pair named after its
  // scope, so an operator can tighten a limit without a code change. A limit of
  // 0 disables that route's quota, which is what the test environment uses.
  RATE_LIMIT_LOGIN_LIMIT: z.coerce
    .number()
    .int()
    .min(0)
    .default(10)
    .describe('Login attempts per window, counted per IP and per email'),
  RATE_LIMIT_LOGIN_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_APP_USER_SEARCH_LIMIT: z.coerce
    .number()
    .int()
    .min(0)
    .default(60)
    .describe('Platform AppUser searches per window, counted per actor and per IP'),
  RATE_LIMIT_APP_USER_SEARCH_WINDOW_SECONDS: z.coerce.number().int().positive().default(3600),

  // Member invitations.
  // How long an invitation stays redeemable. `MEMBER_INVITE_DELIVERY` picks the
  // out-of-band channel: `none` (default — invitation persists but nothing is
  // sent) or `dev` (log the accept link; refused in production). A real email
  // provider will attach to MemberInvitationDeliveryService when one exists.
  MEMBER_INVITE_EXPIRES_HOURS: z.coerce.number().int().positive().default(72),
  MEMBER_INVITE_DELIVERY: z.enum(['none', 'dev']).default('none'),
  RATE_LIMIT_MEMBER_INVITE_CREATE_LIMIT: z.coerce
    .number()
    .int()
    .min(0)
    .default(30)
    .describe('Invitations created per window, counted per actor and per IP'),
  RATE_LIMIT_MEMBER_INVITE_CREATE_WINDOW_SECONDS: z.coerce.number().int().positive().default(3600),
  RATE_LIMIT_MEMBER_INVITE_INSPECT_LIMIT: z.coerce
    .number()
    .int()
    .min(0)
    .default(60)
    .describe('Token inspections per window, counted per IP'),
  RATE_LIMIT_MEMBER_INVITE_INSPECT_WINDOW_SECONDS: z.coerce.number().int().positive().default(3600),
  RATE_LIMIT_MEMBER_INVITE_ACCEPT_LIMIT: z.coerce
    .number()
    .int()
    .min(0)
    .default(30)
    .describe('Token redemptions per window, counted per IP'),
  RATE_LIMIT_MEMBER_INVITE_ACCEPT_WINDOW_SECONDS: z.coerce.number().int().positive().default(3600),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return parsed.data;
}