const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000"

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
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
    try {
      const body = (await response.json()) as { message?: string }
      if (typeof body?.message === "string" && body.message.trim().length > 0) {
        message = body.message
      }
    } catch {
      // Ignore non-JSON error bodies.
    }

    throw new ApiError(message, response.status)
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