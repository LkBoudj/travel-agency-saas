const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000"

export class ApiError extends Error {
  readonly status: number
  /** Machine-readable code from the backend body, when present. */
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    credentials: "include",
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    let code: string | undefined
    try {
      const body = (await response.json()) as {
        message?: string
        errorCode?: string
      }
      if (typeof body?.message === "string" && body.message.trim().length > 0) {
        message = body.message
      }
      if (typeof body?.errorCode === "string" && body.errorCode.length > 0) {
        code = body.errorCode
      }
    } catch {
      // Ignore non-JSON error bodies.
    }

    throw new ApiError(message, response.status, code)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  if (text.trim().length === 0) {
    return undefined as T
  }

  return JSON.parse(text) as T
}