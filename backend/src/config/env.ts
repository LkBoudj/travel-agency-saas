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