export type AppEnv = {
  /** Origin of the NestJS API, no trailing slash, no /v1 prefix. */
  apiBaseUrl: string;
  /** Port `npm run dev` binds (strictPort). */
  devPort: number;
  /** Domain suffix used by the future guest agency-creation flow. */
  platformDomain?: string;
};

type EnvRecord = Record<string, string | undefined>;

function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw.trim().length === 0) {
    return 5175;
  }

  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid VITE_DEV_PORT "${raw}": expected an integer port between 1 and 65535`);
  }

  return port;
}

function parseApiBaseUrl(raw: string | undefined): string {
  if (raw === undefined || raw.trim().length === 0) {
    throw new Error('Missing VITE_API_BASE_URL (required)');
  }

  const url = raw.trim();
  if (!/^https?:\/\/[^/]+$/.test(url)) {
    throw new Error(
      `Invalid VITE_API_BASE_URL "${raw}": expected an http(s) origin without a path (no trailing slash, no /v1)`
    );
  }

  return url;
}

/** Pure parser — safe to load and test under `node --test` (no `import.meta.env`). */
export function parseEnv(record: EnvRecord): AppEnv {
  const apiBaseUrl = parseApiBaseUrl(record.VITE_API_BASE_URL);
  const devPort = parsePort(record.VITE_DEV_PORT);
  const platformDomain = record.VITE_PLATFORM_DOMAIN?.trim();
  const env: AppEnv = {
    apiBaseUrl,
    devPort,
    ...(platformDomain && platformDomain.length > 0 ? { platformDomain } : {}),
  };

  return Object.freeze(env);
}

/** The frozen app env. Reads `import.meta.env` only here — never elsewhere in src. */
let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (cached === undefined) {
    cached = parseEnv(import.meta.env as EnvRecord);
  }
  return cached;
}
