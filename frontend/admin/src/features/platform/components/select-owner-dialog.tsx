import { useEffect, useState } from "react"
import { CheckIcon, Loader2Icon, SearchIcon, UsersIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { APP_USER_SEARCH_MIN_LENGTH } from "../api/app-users.api"
import { useAppUserSearch } from "../hooks/use-app-user-search"
import { appUserOptionLabel, isSelectableOwner } from "../lib/app-user"
import type { AppUserOption } from "../types/app-user.types"

export type SelectOwnerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (account: AppUserOption) => void
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-2">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Focused dialog for picking an existing account as the agency owner.
 *
 * Search is the whole interface: the operator types a name or an email and
 * clicks a result. The account code travels back invisibly, so it never has to
 * be known or typed. Suspended accounts are shown but disabled, so a missing
 * option is explained rather than silently absent.
 */
export function SelectOwnerDialog({
  open,
  onOpenChange,
  onSelect,
}: SelectOwnerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select owner</DialogTitle>
          <DialogDescription>
            Search the accounts already on the platform.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so each open starts from an empty search
            without resetting state in an effect. */}
        {open ? (
          <OwnerSearch
            onPick={(account) => {
              onSelect(account)
              onOpenChange(false)
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function OwnerSearch({ onPick }: { onPick: (account: AppUserOption) => void }) {
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const query = useAppUserSearch(search)
  const term = search.trim()
  const tooShort = term.length < APP_USER_SEARCH_MIN_LENGTH
  const results = query.data ?? []

  return (
    <>
      <div className="relative shrink-0">
        <label htmlFor="select-owner-search" className="sr-only">
          Search accounts by name or email
        </label>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="select-owner-search"
          type="search"
          className="pl-8"
          placeholder="Search by name or email..."
          autoFocus
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>

      <DialogBody className="min-h-32">
        {tooShort ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <UsersIcon className="size-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Type at least {APP_USER_SEARCH_MIN_LENGTH} characters to search.
            </p>
          </div>
        ) : null}

        {!tooShort && query.isPending ? <ResultsSkeleton /> : null}

        {!tooShort && query.isError ? (
          <div className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-destructive">Could not search accounts.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {!tooShort && !query.isPending && !query.isError && results.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-8 text-center">
            <p className="text-sm font-medium">No account matches “{term}”</p>
            <p className="text-sm text-muted-foreground">
              Close this and choose “Create new user” instead.
            </p>
          </div>
        ) : null}

        {!tooShort && !query.isError && results.length > 0 ? (
          <ul className="-mx-2 flex flex-col">
            {results.map((option) => {
              const selectable = isSelectableOwner(option)
              return (
                <li key={option.code}>
                  <button
                    type="button"
                    disabled={!selectable}
                    onClick={() => onPick(option)}
                    className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                      {appUserOptionLabel(option).slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {appUserOptionLabel(option)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {option.email}
                        {selectable ? "" : " · suspended"}
                      </span>
                    </span>
                    <CheckIcon className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}

        {!tooShort && query.isFetching && !query.isPending ? (
          <p className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            <Loader2Icon className="size-3 animate-spin" />
            Searching…
          </p>
        ) : null}
      </DialogBody>
    </>
  )
}
