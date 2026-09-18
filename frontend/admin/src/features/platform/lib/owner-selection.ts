import type { OwnerSelection } from "../components/owner-field"
import type { CreateAgencyFormValues } from "../schemas/agency-form.schema"

/**
 * Narrows the owner chosen in the UI down to what the form actually submits.
 *
 * The UI keeps richer data around so it can render a readable summary row (the
 * picked account's display name, for example). Only the submitted shape crosses
 * into the form value, so display-only data can never reach the request.
 */
export function toOwnerFormValue(
  selection: OwnerSelection
): NonNullable<CreateAgencyFormValues["owner"]> {
  if (selection.type === "EXISTING") {
    return { type: "EXISTING", appUserCode: selection.account.code }
  }
  return {
    type: "NEW",
    firstName: selection.draft.firstName,
    lastName: selection.draft.lastName,
    email: selection.draft.email,
    password: selection.draft.password,
  }
}
