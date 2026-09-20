import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { AGENCY_SECTIONS, agencyPath } from "@/features/agency-context/lib/agency-paths"
import { useAgencyContext } from "@/features/agency-context/hooks/use-agency-context"
import { appToastManager } from "@/components/ui/toast"
import {
  createCreateTripSchema,
  createEmptyCreateTrip,
  type CreateTripFormValues,
} from "../schemas/create-trip.schema"
import { buildCreateTourPayload } from "../lib/tour-payloads"
import { getTourErrorMessage } from "../lib/tour-error-adapter"
import { useCreateTour } from "./use-tour-mutations"

type UseCreateTripOptions = {
  onOpenChange: (open: boolean) => void
}

/**
 * Create Trip drawer orchestration: six fields → real `POST` to the tours
 * API → navigate to the new trip's editor → toast. The submit is disabled
 * while the request is in flight, so a slow network cannot double-create.
 */
export function useCreateTrip({ onOpenChange }: UseCreateTripOptions) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { agency } = useAgencyContext()

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

  const createTour = useCreateTour(agency.code)

  const fail = (error: unknown) =>
    appToastManager.add({ title: getTourErrorMessage(error) })

  const handleSubmit = form.handleSubmit((data) => {
    createTour.mutate(buildCreateTourPayload(data), {
      onSuccess: (tour) => {
        onOpenChange(false)
        form.reset(createEmptyCreateTrip())
        appToastManager.add({
          title: t("trips:create.successTitle"),
          description: t("trips:create.successDescription"),
        })
        navigate(`${agencyPath(agency.code, AGENCY_SECTIONS.trips)}/${tour.code}`)
      },
      onError: fail,
    })
  })

  return {
    form,
    handleSubmit,
    creating: createTour.isPending,
  }
}