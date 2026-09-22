export class ApiError extends Error {
  readonly status: number;
  /** Machine-readable backend errorCode, when present (e.g. "AGENCY_CUSTOMER_ALREADY_ARCHIVED"). */
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type NormalizedErrorBody = {
  message: string;
  code?: string;
};

/** Pure body mapper — safe to test under `node --test` without touching the network. */
export function parseErrorBody(body: unknown): NormalizedErrorBody {
  if (body === null || typeof body !== 'object') {
    return { message: 'Request failed' };
  }

  const record = body as Record<string, unknown>;
  const rawMessage = record.message;
  const rawCode = record.errorCode;

  return {
    message:
      typeof rawMessage === 'string' && rawMessage.trim().length > 0
        ? rawMessage
        : 'Request failed',
    ...(typeof rawCode === 'string' && rawCode.length > 0 ? { code: rawCode } : {}),
  };
}
