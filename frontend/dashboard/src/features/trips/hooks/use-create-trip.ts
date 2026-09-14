import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { ROUTES } from "@/app/router/route-paths"
import { appToastManager } from "@/components/ui/toast"
import {
  createCreateTripSchema,
  createEmptyCreateTrip,
  type CreateTripFormValues,
} from "../schemas/create-trip.schema"
import { persistCreatePayload } from "../utils/draft"
import type { TripFormat, GeographicScope } from "../types/trip.types"

type UseCreateTripOptions = {
  onOpenChange: (open: boolean) => void
}

/**
 * Create Trip drawer orchestration: six fields → persist a draft → navigate
 * to the new trip's editor → toast. No fake API: persistence is the dev
 * in-memory repository boundary.
 */
export function useCreateTrip({ onOpenChange }: UseCreateTripOptions) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const resolver = useMemo(() => zodResolver(createCreateTripSchema(t)), [t])

  const form = useForm<CreateTripFormValues>({
    resolver,
    defaultValues: createEmptyCreateTrip(),
  })

  const { control, setValue } = form
  const availabilityMode = useWatch({ name: "availabilityMode", control })

  useEffect(() => {
    if (availabilityMode !== "custom_quote" && form.getValues("isFlexible")) {
      setValue("isFlexible", false)
    }
  }, [availabilityMode, form, setValue])

  const handleSubmit = form.handleSubmit((data) => {
    // Schema validation guarantees format + scope are set on submit.
    const format = data.format as TripFormat
    const geographicScope = data.geographicScope as GeographicScope
    const { id } = persistCreatePayload({
      name: data.name,
      format,
      geographicScope,
      availabilityMode: data.availabilityMode,
      origin: { wilayaCode: "", cityId: "", place: "" },
      destinations: [
        {
          wilayaCode: data.destination.wilayaCode,
          cityId: data.destination.cityId,
          place: data.destination.place,
        },
      ],
      days: data.days,
      nights: data.nights,
      hours: data.hours,
      isFlexible: data.isFlexible,
    })

    onOpenChange(false)
    form.reset(createEmptyCreateTrip())

    appToastManager.add({
      title: t("trips:create.successTitle"),
      description: t("trips:create.successDescription"),
    })

    navigate(ROUTES.tripDetails.replace(":tripId", id))
  })

  return {
    form,
    handleSubmit,
  }
}