import { useQuery } from "@tanstack/react-query"

import {
  APP_USER_SEARCH_MIN_LENGTH,
  appUserSearchQueryKey,
  searchAppUsers,
} from "../api/app-users.api"

/**
 * Owner lookup. Stays idle until the term is long enough, so an empty picker
 * never fires a request the backend would reject.
 */
export function useAppUserSearch(search: string) {
  const term = search.trim()
  const enabled = term.length >= APP_USER_SEARCH_MIN_LENGTH

  return useQuery({
    queryKey: appUserSearchQueryKey(term),
    queryFn: () => searchAppUsers(term),
    enabled,
  })
}
