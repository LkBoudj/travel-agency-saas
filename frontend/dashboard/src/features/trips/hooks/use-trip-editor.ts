import { zodResolver } from "@hookform/resolvers/zod"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { loadTrip, saveTrip } from "../api/trips.api"
import { computePublishReadiness } from "../domain/trip-readiness"
import {
  createTripFormSchema,
  type TripFormValues,
} from "../schemas/trip.schema"
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
 * Trip editor orchestration (v4): React Hook Form is the validation/mirror
 * layer; the canonical draft lives in the trip-editor store (savedSnapshot +
 * draft + isDirty). Input flows RHF → store.syncDraft; saves persist the full
 * draft in one boundary call; discard reverts to the saved snapshot. The
 * store's dirty baseline is never silently replaced by background refetches.
 */
export function useTripEditor(
  tripId?: string,
  onSave?: (data: TripFormValues) => void
) {
  const { t } = useTranslation()
  const [activeSection, setActiveSection] =
    useState<TripEditorSection>("overview")

  // Publish guard: when a published trip's new draft fails readiness, the
  // save is blocked until the user explicitly confirms the unpublish.
  const [publishedSaveBlocked, setPublishedSaveBlocked] = useState(false)

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
  const pricingOptions = useWatch({ name: "pricingOptions", control })
  const format = useWatch({ name: "format", control })
  const availabilityMode = useWatch({ name: "availabilityMode", control })
  const guidanceType = useWatch({ name: "guidanceType", control })

  const destinations = useFieldArray({ control, name: "destinations" })
  const highlights = useFieldArray({ control, name: "highlights" })
  const itinerary = useFieldArray({ control, name: "itinerary" })
  const pricingOptionsArr = useFieldArray({ control, name: "pricingOptions" })
  const departures = useFieldArray({ control, name: "departures" })
  const included = useFieldArray({ control, name: "included" })
  const notIncluded = useFieldArray({ control, name: "notIncluded" })
  const extras = useFieldArray({ control, name: "extras" })
  const gallery = useFieldArray({ control, name: "gallery" })

  const shortDescriptionChars = shortDescription?.length ?? 0
  const pricingOptionNames = (pricingOptions ?? [])
    .map((option) => option.name)
    .filter(Boolean)

  const [nightsEdited, setNightsEdited] = useState(false)
  const setNightsTouched = () => setNightsEdited(true)

  // Load the trip (or a blank shell for unknown ids) into the store once.
  useEffect(() => {
    if (!tripId) return
    const loaded = loadTrip(tripId)
    const base = loaded ? cloneDraft(loaded.draft) : createEmptyDraft()
    initialize(tripId, base)
    form.reset(cloneDraft(base))
    // Cleanup: leave the editor session state clean on unmount.
    return () => resetStore()
  }, [tripId, initialize, form, resetStore])

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

  const addDeparture = () => {
    departures.append({
      startAt: "",
      endAt: "",
      capacity: 1,
      bookingDeadline: "",
      status: "open",
      notes: "",
      prices: pricingOptionNames.map((name) => ({
        pricingOption: name,
        price: 0,
      })),
    })
  }

  // Persist the full draft in one boundary call; the canonical response
  // becomes the new saved snapshot (never the query cache).
  const persistValidDraft = useCallback(
    (data: TripFormValues) => {
      if (!tripId) return
      onSave?.(data)
      const canonical = saveTrip(tripId, data)
      if (canonical) {
        rebase(canonical)
        form.reset(cloneDraft(canonical))
      }
    },
    [tripId, onSave, rebase, form]
  )

  const resetSaveBlock = () => setPublishedSaveBlocked(false)

  const handleSave = handleSubmit((data) => {
    setPublishedSaveBlocked(false)
    // Publish guard: never silently auto-unpublish a published trip when the
    // new draft would fail readiness. Requires explicit user confirmation.
    if (data.status === "published" && !computePublishReadiness(data).canPublish) {
      setPublishedSaveBlocked(true)
      return
    }
    persistValidDraft(data)
  })

  /** After explicit confirmation: flip published → draft and save. */
  const unpublishAndSave = () => {
    setPublishedSaveBlocked(false)
    setValue("status", "draft")
    form.handleSubmit((data) => persistValidDraft(data))()
  }

  const discard = () => {
    discardDraft()
    const snapshot = useTripEditorStore.getState().savedSnapshot
    if (snapshot) form.reset(cloneDraft(snapshot))
  }

  /**
   * Background-refetch gate: applies a freshly fetched server copy ONLY when
   * the editor is clean. Never silently redefines an unsaved draft.
   */
  const applyServerTrip = useCallback(
    (serverDraft: TripFormValues) => {
      if (useTripEditorStore.getState().isDirty) return
      if (!tripId) return
      initialize(tripId, serverDraft)
      form.reset(cloneDraft(serverDraft))
    },
    [tripId, initialize, form]
  )

  return {
    form,
    activeSection,
    setActiveSection,
    isNew: false,
    name,
    status,
    days,
    format,
    guidanceType,
    shortDescriptionChars,
    pricingOptionNames,
    nightsEdited,
    setNightsTouched,
    addDeparture,
    isDirty,
    publishedSaveBlocked,
    resetSaveBlock,
    unpublishAndSave,
    save: handleSave,
    discard,
    applyServerTrip,
    fieldArrays: {
      destinations,
      highlights,
      itinerary,
      pricingOptions: pricingOptionsArr,
      departures,
      included,
      notIncluded,
      extras,
      gallery,
    },
    handleSave,
    handlePublish: () => {
      /* Publish now lives in the Status control + Save. */
    },
  }
}

export type TripEditor = ReturnType<typeof useTripEditor>