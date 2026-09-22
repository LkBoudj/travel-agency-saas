export class ApiError extends Error {
  readonly status: number;
  /** Machine-readable backend errorCode, when present (e.g. "AGENCY_CUSTOMER_ALREADY_ARCHIVED"). */
  readonly code?: string;
  /** Backend error metadata (e.g. publish blockers), when present. */
  readonly metadata?: Record<string, unknown>;

  constructor(message: string, status: number, code?: string, metadata?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.metadata = metadata;
  }
}

type NormalizedErrorBody = {
  message: string;
  code?: string;
  metadata?: Record<string, unknown>;
};

/** Pure body mapper — safe to test under `node --test` without touching the network. */
export function parseErrorBody(body: unknown): NormalizedErrorBody {
  if (body === null || typeof body !== 'object') {
    return { message: 'Request failed' };
  }

  const record = body as Record<string, unknown>;
  const rawMessage = record.message;
  const rawCode = record.errorCode;
  const rawMetadata = record.metadata;

  return {
    message:
      typeof rawMessage === 'string' && rawMessage.trim().length > 0
        ? rawMessage
        : 'Request failed',
    ...(typeof rawCode === 'string' && rawCode.length > 0 ? { code: rawCode } : {}),
    ...(isObjectRecord(rawMetadata) ? { metadata: rawMetadata } : {}),
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
