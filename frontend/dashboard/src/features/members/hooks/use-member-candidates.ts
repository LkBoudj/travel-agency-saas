import { useQuery } from "@tanstack/react-query"
import { ApiError } from "@/lib/api"
import { listMemberCandidates, membersQueryKeys } from "../api/members.api"

/** The backend requires at least 2 characters before it will answer. */
export const CANDIDATE_SEARCH_MIN_LENGTH = 2

export function isCandidateSearchLongEnough(search: string): boolean {
  return search.trim().length >= CANDIDATE_SEARCH_MIN_LENGTH
}

/**
 * Looks up accounts matching what was typed.
 *
 * It answers "who matches this?", never "list everyone" — which is why it stays
 * disabled until the term is long enough, rather than fetching a directory.
 */
export function useMemberCandidates(agencyCode: string, search: string) {
  const term = search.trim()

  return useQuery({
    queryKey: membersQueryKeys.candidates(agencyCode, term),
    queryFn: () => listMemberCandidates(agencyCode, term),
    enabled: agencyCode.length > 0 && isCandidateSearchLongEnough(term),
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status < 500 ? false : failureCount < 2,
  })
}
