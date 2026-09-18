import { apiRequest } from "@/lib/api"
import type { AppUserOption } from "../types/app-user.types"

const APP_USERS_SEARCH_PATH = "/v1/app-users/search"

/** The backend rejects anything shorter, so the client does not even ask. */
export const APP_USER_SEARCH_MIN_LENGTH = 2

export const appUserSearchRootQueryKey = ["app-users", "search"] as const

export function appUserSearchQueryKey(search: string) {
  return [...appUserSearchRootQueryKey, search] as const
}

/**
 * Searches every account by name, email or code so an agency owner can be
 * picked. Platform Users is not usable for this: it only returns accounts that
 * hold a platform role, which an agency owner normally does not.
 */
export function searchAppUsers(search: string): Promise<AppUserOption[]> {
  const query = `?search=${encodeURIComponent(search.trim())}`
  return apiRequest<AppUserOption[]>(`${APP_USERS_SEARCH_PATH}${query}`)
}
