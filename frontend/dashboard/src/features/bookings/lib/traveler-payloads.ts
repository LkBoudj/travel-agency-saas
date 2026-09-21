import type { TravelerWritePayload } from "../types/bookings.types"

/**
 * The traveler form's raw values (mirrors `TravelerFormValues`; declared here
 * so this module stays pure and loadable by `node --test` without pulling in
 * the zod schema).
 */
export type TravelerFormInput = {
  firstName: string
  lastName: string
  email: string
  phone: string
  notes: string
}

/**
 * Turns the traveler form into the write payload.
 *
 * A blank optional field is a stored `null`, never a `""` stub: the backend
 * reads a blank exactly like an omitted value. Names go out trimmed — they are
 * required, so there is always real content. No codes or amounts leave here:
 * the backend generates the traveler's `TRV-...` code.
 */
export function buildTravelerWritePayload(
  input: TravelerFormInput
): TravelerWritePayload {
  const optional = (value: string): string | null => {
    const trimmed = value.trim()
    return trimmed.length === 0 ? null : trimmed
  }

  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: optional(input.email),
    phone: optional(input.phone),
    notes: optional(input.notes),
  }
}

/**
 * Whether a booking's traveler manifest is complete enough to confirm.
 *
 * Confirmation is server-side gated on the record count equalling the
 * booking's immutable `reservedSeats` — this is the same arithmetic shown to
 * the operator before they confirm, never a substitute for the backend's
 * row-locked check.
 */
export function travelerManifestComplete(
  travelerCount: number,
  reservedSeats: number
): boolean {
  return travelerCount === reservedSeats
}