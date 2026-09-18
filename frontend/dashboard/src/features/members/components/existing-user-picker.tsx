import { SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  CANDIDATE_SEARCH_MIN_LENGTH,
  isCandidateSearchLongEnough,
  useMemberCandidates,
} from "../hooks/use-member-candidates"
import { useDebouncedValue } from "../hooks/use-debounced-value"
import { getMemberErrorMessage } from "../lib/member-error-adapter"
import {
  candidateBlockedReason,
  isCandidateSelectable,
  memberDisplayName,
  memberInitials,
} from "../lib/member-display"
import type { MemberCandidate } from "../types/members.types"

type ExistingUserPickerProps = {
  agencyCode: string
  search: string
  onSearchChange: (value: string) => void
  selected: MemberCandidate | null
  onSelect: (candidate: MemberCandidate | null) => void
  disabled?: boolean
}

/**
 * Finds an existing account by name or email.
 *
 * The operator never types an account code: codes are for machines, and asking a
 * human to copy one is how the wrong person gets added. A candidate who is
 * already a member, or whose account is not active, is listed with the reason
 * and cannot be picked — the backend would reject it, so saying so here turns a
 * failed submit into an explanation.
 */
export function ExistingUserPicker({
  agencyCode,
  search,
  onSearchChange,
  selected,
  onSelect,
  disabled,
}: ExistingUserPickerProps) {
  const debouncedSearch = useDebouncedValue(search, 300)
  const query = useMemberCandidates(agencyCode, debouncedSearch)
  const tooShort = !isCandidateSearchLongEnough(debouncedSearch)
  const candidates = query.data ?? []

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          disabled={disabled}
          onChange={(event) => {
            onSearchChange(event.target.value)
            if (selected) onSelect(null)
          }}
          placeholder="Search by name or email"
          aria-label="Search for an existing account"
          className="ps-8"
        />
      </div>

      {selected ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 p-2.5">
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {memberDisplayName(selected)}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {selected.email}
            </span>
          </span>
          <button
            type="button"
            className="shrink-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            onClick={() => onSelect(null)}
          >
            Change
          </button>
        </div>
      ) : (
        <div className="min-h-[3rem] rounded-lg border">
          {tooShort ? (
            <p className="p-3 text-xs text-muted-foreground">
              Type at least {CANDIDATE_SEARCH_MIN_LENGTH} characters to search.
            </p>
          ) : query.isPending ? (
            <p className="p-3 text-xs text-muted-foreground">Searching…</p>
          ) : query.isError ? (
            <p className="p-3 text-xs text-destructive">
              {getMemberErrorMessage(query.error)}
            </p>
          ) : candidates.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">
              No accounts match “{debouncedSearch.trim()}”. Use “New user” to
              create one.
            </p>
          ) : (
            <ul className="max-h-48 overflow-y-auto p-1">
              {candidates.map((candidate) => {
                const blocked = candidateBlockedReason(candidate)
                const selectable = isCandidateSelectable(candidate)
                return (
                  <li key={candidate.code}>
                    <button
                      type="button"
                      disabled={!selectable || disabled}
                      onClick={() => onSelect(candidate)}
                      className="flex w-full items-center gap-2.5 rounded-md p-2 text-start transition-colors enabled:hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                        {memberInitials(candidate)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {memberDisplayName(candidate)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {candidate.email}
                        </span>
                      </span>
                      {blocked ? (
                        <span className="shrink-0 text-[10px] whitespace-nowrap text-muted-foreground">
                          {blocked}
                        </span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
