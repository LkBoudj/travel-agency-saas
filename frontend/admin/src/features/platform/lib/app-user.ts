import type { AppUserOption } from "../types/app-user.types"

/**
 * Best-effort label for an account in the owner picker, falling back to the
 * email when the account has no name parts.
 */
export function appUserOptionLabel(option: AppUserOption): string {
  const name = [option.firstName, option.lastName].filter(Boolean).join(" ")
  return name.trim().length > 0 ? name : option.email
}

/**
 * Only an ACTIVE account may become an agency owner — the backend rejects a
 * suspended one, so the picker does not let it be chosen in the first place.
 */
export function isSelectableOwner(option: AppUserOption): boolean {
  return option.status === "ACTIVE"
}
