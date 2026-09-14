import { create } from "zustand"
import type { TripFormValues } from "../features/trips/schemas/trip.schema"
import { cloneDraft, draftsEqual } from "../features/trips/utils/draft"

/**
 * Trip editor session state (SANCTIONED Zustand exception — see
 * PROJECT_MAP_DASHBOARD STATE_MANAGEMENT). Owns the canonical draft and the
 * last-saved snapshot for THIS editor session. The query cache is NOT the
 * dirty baseline: a background refetch never silently redefines the draft or
 * snapshot while dirty. React Hook Form mirrors this draft.
 */

type TripEditorState = {
  tripId: string | null
  isInitialized: boolean
  savedSnapshot: TripFormValues | null
  draft: TripFormValues | null
  /** True when draft differs from the last saved snapshot. */
  isDirty: boolean
  initialize: (tripId: string, draft: TripFormValues) => void
  /** Mirror the RHF form values into the canonical draft. */
  syncDraft: (next: TripFormValues) => void
  /** After a successful save: snapshot becomes the canonical response. */
  rebase: (canonical: TripFormValues) => void
  /** Discard unsaved edits: draft reverts to the saved snapshot. */
  discard: () => void
  /** Clear editor state (e.g. when leaving the editor). */
  reset: () => void
}

export const useTripEditorStore = create<TripEditorState>()((set) => ({
  tripId: null,
  isInitialized: false,
  savedSnapshot: null,
  draft: null,
  isDirty: false,

  initialize: (tripId, draft) =>
    set(() => {
      const canonical = cloneDraft(draft)
      return {
        tripId,
        isInitialized: true,
        savedSnapshot: canonical,
        draft: canonical,
        isDirty: false,
      }
    }),

  syncDraft: (next) =>
    set((state) => {
      if (!state.draft || draftsEqual(state.draft, next)) return {}
      return {
        draft: cloneDraft(next),
        isDirty: !draftsEqual(cloneDraft(next), state.savedSnapshot ?? next),
      }
    }),

  rebase: (canonical) =>
    set(() => {
      const next = cloneDraft(canonical)
      return {
        savedSnapshot: next,
        draft: next,
        isDirty: false,
      }
    }),

  discard: () =>
    set((state) => {
      if (!state.savedSnapshot) return {}
      return {
        draft: cloneDraft(state.savedSnapshot),
        isDirty: false,
      }
    }),

  reset: () =>
    set({ tripId: null, isInitialized: false, savedSnapshot: null, draft: null, isDirty: false }),
}))