import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useForm, useWatch } from "react-hook-form"
import {
  createCreateAgencySchema,
  type CreateAgencyFormValues,
} from "../schemas/create-agency.schema"
import { createAgencySlug } from "../utils/create-agency-slug"

/**
 * Platform domain shown in the URL preview.
 * TODO(platform): set the real domain (env override) once it is configured.
 */
const PLATFORM_DOMAIN = import.meta.env.VITE_PLATFORM_DOMAIN ?? "example.com"

/**
 * Create-agency flow orchestration (second onboarding step).
 * Auto-derives the agency URL slug from the name; keeps manual edits until the
 * name changes again. Wire a real agency-creation mutation via `onSubmit` later.
 */
export function useCreateAgency(
  onSubmit?: (data: CreateAgencyFormValues) => void
) {
  const { t } = useTranslation()

  const resolver = useMemo(
    () => zodResolver(createCreateAgencySchema(t)),
    [t]
  )

  const form = useForm<CreateAgencyFormValues>({
    resolver,
    defaultValues: { agencyName: "", slug: "" },
  })

  const agencyName = useWatch({ name: "agencyName", control: form.control })
  const slug = useWatch({ name: "slug", control: form.control })
  const [isEditingSlug, setIsEditingSlug] = useState(false)
  const lastDerivedSlug = useRef("")

  const { getValues, setValue } = form

  useEffect(() => {
    if (isEditingSlug) return
    const derived = createAgencySlug(agencyName ?? "")
    const current = getValues("slug")
    if (current === "" || current === lastDerivedSlug.current) {
      setValue("slug", derived, { shouldValidate: false })
    }
    lastDerivedSlug.current = derived
  }, [agencyName, isEditingSlug, getValues, setValue])

  const toggleSlugEditing = () => setIsEditingSlug((editing) => !editing)
  const stopSlugEditing = () => setIsEditingSlug(false)
  const handleSubmit = form.handleSubmit((data) => onSubmit?.(data))

  return {
    form,
    slug,
    isEditingSlug,
    platformDomain: PLATFORM_DOMAIN,
    toggleSlugEditing,
    stopSlugEditing,
    handleSubmit,
  }
}