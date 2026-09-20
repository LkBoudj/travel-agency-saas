import { zodResolver } from "@hookform/resolvers/zod"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { useAgencyContext } from "@/features/agency-context/hooks/use-agency-context"
import { appToastManager } from "@/components/ui/toast"
import { useTour } from "./use-tour"
import {
  useArchiveTour,
  usePublishTour,
  useUnpublishTour,
  useUpdateTour,
} from "./use-tour-mutations"
import { buildTourPayload, toTourStatus, toTripFormValues } from "../lib/tour-payloads"
import { getTourErrorMessage } from "../lib/tour-error-adapter"
import {
  createTripFormSchema,
  type TripFormValues,
} from "../schemas/trip.schema"
import type { TourStatus } from "../types/tour.types"
import { useTripEditorStore } from "@/stores/trip-editor.store"
import { cloneDraft, createEmptyDraft } from "../utils/draft"

export type TripEditorSection =
  "overview" | "itinerary" | "departures" | "details" | "media" | "booking"

export const TRIP_EDITOR_SECTIONS: {
  id: TripEditorSection
  labelKey: string
}[] = [
  { id: "overview", labelKey: "trips:editor.sections.overview" },
  { id: "itinerary", labelKey: "trips:editor.sections.itinerary" },
  { id: "departures", labelKey: "trips:editor.sections.departures" },
  { id: "details", labelKey: "trips:editor.sections.details" },
  { id: "media", labelKey: "trips:editor.sections.media" },
  { id: "booking", labelKey: "trips:editor.sections.booking" },
]

/**
 * Trip editor orchestration against the real Tours API.
 *
 * The tour loads from `GET /tours/:tourCode`; RHF is the validation/input
 * layer and the trip-editor store remains the canonical draft + saved snapshot.
 * Saving PUTs the full aggregate, then runs the explicit status transition the
 * user asked for (publish / unpublish / archive) — the UI never fabricates a
 * status the backend would not grant, and a failed transition toast leaves the
 * tour as the server now actually holds it (usually DRAFT).
 */
export function useTripEditor(tourCode?: string) {
  const { t } = useTranslation()
  const { agency } = useAgencyContext()
  const [activeSection, setActiveSection] =
    useState<TripEditorSection>("overview")

  const initialize = useTripEditorStore((state) => state.initialize)
  const syncDraft = useTripEditorStore((state) => state.syncDraft)
  const rebase = useTripEditorStore((state) => state.rebase)
  const discardDraft = useTripEditorStore((state) => state.discard)
  const resetStore = useTripEditorStore((state) => state.reset)
  const isDirty = useTripEditorStore((state) => state.isDirty)

  const resolver = useMemo(() => zodResolver(createTripFormSchema(t)), [t])

  const form = useForm<TripFormValues>({
    resolver,
    defaultValues: createEmptyDraft(),
  })

  const { control, setValue, handleSubmit } = form

  const name = useWatch({ name: "name", control })
  const status = useWatch({ name: "status", control })
  const days = useWatch({ name: "days", control })
  const shortDescription = useWatch({ name: "shortDescription", control })
  const format = useWatch({ name: "format", control })
  const availabilityMode = useWatch({ name: "availabilityMode", control })
  const guidanceType = useWatch({ name: "guidanceType", control })

  const destinations = useFieldArray({ control, name: "destinations" })
  const highlights = useFieldArray({ control, name: "highlights" })
  const itinerary = useFieldArray({ control, name: "itinerary" })
  const included = useFieldArray({ control, name: "included" })
  const notIncluded = useFieldArray({ control, name: "notIncluded" })
  const extras = useFieldArray({ control, name: "extras" })
  const gallery = useFieldArray({ control, name: "gallery" })

  const shortDescriptionChars = shortDescription?.length ?? 0

  const [nightsEdited, setNightsEdited] = useState(false)
  const setNightsTouched = () => setNightsEdited(true)

  const tourQuery = useTour(agency.code, tourCode)
  const loadedTour = tourQuery.data

  // Reset editor session state only when leaving the editor or switching codes,
  // never on a background refetch of the same tour.
  useEffect(() => {
    return () => resetStore()
  }, [tourCode, resetStore])

  // Load the canonical tour into the store once, and re-baseline from the
  // server after anything succeeded (a clean draft never overwrites unsaved
  // edits, so a background refetch cannot silently eat work-in-progress).
  useEffect(() => {
    if (!tourCode || !loadedTour) return
    if (useTripEditorStore.getState().isDirty) return
    initialize(tourCode, toTripFormValues(loadedTour))
    form.reset(cloneDraft(toTripFormValues(loadedTour)))
  }, [tourCode, loadedTour, initialize, form])

  // Mirror: RHF remains the input layer; the store owns the canonical draft.
  // Every form.reset() targets the same values as the store draft, so the
  // sync is a safe no-op in those cases (no "reset" event type to skip).
  useEffect(() => {
    return form.subscribe({
      callback: (data) => {
        syncDraft(data.values)
      },
    })
  }, [form, syncDraft])

  // Suggest "nights = days - 1" until the user edits nights themselves.
  useEffect(() => {
    if (nightsEdited) return
    const dayCount = Number(days)
    if (dayCount > 0) setValue("nights", dayCount - 1)
  }, [days, nightsEdited, setValue])

  // Only circuits support an ordered destination list. Switching to any other
  // format narrows the list to a single destination so the saved trip stays
  // consistent with the format's meaning.
  useEffect(() => {
    if (!format || format === "circuit") return
    const current = form.getValues("destinations")
    if (current.length > 1) {
      setValue("destinations", current.slice(0, 1), { shouldDirty: true })
    }
  }, [format, setValue, form])

  // Structurally invalid flexible duration is normalized safely: a flexible
  // flag is only meaningful for custom-quote trips.
  useEffect(() => {
    if (availabilityMode !== "custom_quote" && form.getValues("isFlexible")) {
      setValue("isFlexible", false)
    }
  }, [availabilityMode, setValue, form])

  const updateTour = useUpdateTour(agency.code)
  const publishTour = usePublishTour(agency.code)
  const unpublishTour = useUnpublishTour(agency.code)
  const archiveTour = useArchiveTour(agency.code)

  const fail = useCallback(
    (error: unknown) => appToastManager.add({ title: getTourErrorMessage(error) }),
    []
  )

  const celebrate = useCallback(() => {
    appToastManager.add({ title: t("trips:editor.save.successTitle") })
  }, [t])

  /** The server response becomes the new baseline (store + form). */
  const applyServer = useCallback(
    (tour: NonNullable<ReturnType<typeof useTour>["data"]>) => {
      const values = toTripFormValues(tour)
      rebase(values)
      form.reset(cloneDraft(values))
    },
    [rebase, form]
  )

  const persistValidDraft = useCallback(
    (data: TripFormValues) => {
      if (!tourCode || !loadedTour) return
      const desired = toTourStatus(data.status)
      const previous = loadedTour.status

      const transition = (target: TourStatus, updated: NonNullable<ReturnType<typeof useTour>["data"]>) => {
        if (target === previous) {
          applyServer(updated)
          celebrate()
          return
        }
        if (target === "PUBLISHED") {
          publishTour.mutate(tourCode, {
            // A rejected publish (e.g. readiness still incomplete) is honest:
            // the tour stays exactly where the server actually kept it.
            onSuccess: (final) => {
              applyServer(final)
              celebrate()
            },
            onError: (error) => {
              applyServer(updated)
              fail(error)
            },
          })
          return
        }
        if (target === "ARCHIVED") {
          archiveTour.mutate(tourCode, {
            onSuccess: (final) => {
              applyServer(final)
              celebrate()
            },
            onError: (error) => {
              applyServer(updated)
              fail(error)
            },
          })
          return
        }
        unpublishTour.mutate(tourCode, {
          onSuccess: (final) => {
            applyServer(final)
            celebrate()
          },
          onError: (error) => {
            applyServer(updated)
            fail(error)
          },
        })
      }

      updateTour.mutate(
        { tourCode, payload: buildTourPayload(data) },
        {
          onSuccess: (updated) => transition(desired, updated),
          onError: fail,
        }
      )
    },
    [
      tourCode,
      loadedTour,
      updateTour,
      publishTour,
      archiveTour,
      unpublishTour,
      applyServer,
      fail,
      celebrate,
    ]
  )

  const handleSave = handleSubmit((data) => {
    persistValidDraft(data)
  })

  const discard = () => {
    discardDraft()
    const snapshot = useTripEditorStore.getState().savedSnapshot
    if (snapshot) form.reset(cloneDraft(snapshot))
  }

  return {
    form,
    tourQuery,
    activeSection,
    setActiveSection,
    isNew: false,
    name,
    status,
    days,
    format,
    guidanceType,
    shortDescriptionChars,
    nightsEdited,
    setNightsTouched,
    isDirty,
    save: handleSave,
    discard,
    fieldArrays: {
      destinations,
      highlights,
      itinerary,
      included,
      notIncluded,
      extras,
      gallery,
    },
    handleSave,
    handlePublish: () => {
      /* Publish lives in the Status control + Save. */
    },
  }
}

export type TripEditor = ReturnType<typeof useTripEditor>