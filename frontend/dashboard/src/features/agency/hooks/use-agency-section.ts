import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useForm, type DefaultValues, type FieldValues } from "react-hook-form"
import type { ZodType } from "zod"
import type { Agency, AgencyPatch } from "../types/agency.types"
import { useAgency } from "./use-agency"
import { useSaveAgency } from "./use-save-agency"

type UseAgencySectionOptions<Values extends FieldValues> = {
  schemaFactory: (t: TFunction) => ZodType<Values>
  getDefaults: (agency: Agency) => Values
  toPatch: (values: Values) => AgencyPatch
  successTitleKey: string
}

/**
 * Shared section-save lifecycle for the six Agency Settings sections.
 *
 * Canonical behavior:
 * - the section owns only its form slice (defaults via getDefaults)
 * - save() persists only the section slice (toPatch → AgencyPatch)
 * - a successful mutation updates the canonical Agency query and resets ONLY
 *   this section's form
 * - dirty unrelated sections keep their current unsaved values (the resync
 *   effect below never runs while a form is dirty)
 */
export function useAgencySection<Values extends FieldValues>({
  schemaFactory,
  getDefaults,
  toPatch,
  successTitleKey,
}: UseAgencySectionOptions<Values>) {
  const { t } = useTranslation()
  const { agency } = useAgency()
  const { save: savePatch, isSaving } = useSaveAgency()

  const resolver = useMemo(() => zodResolver(schemaFactory(t)), [schemaFactory, t])

  // The settings page mounts section hooks only after the canonical Agency
  // has loaded (see AgencySettingsPage), so `agency` is always defined here.
  const defaults = useMemo(() => getDefaults(agency as Agency), [agency, getDefaults])

  const form = useForm<Values, unknown, Values>({
    resolver,
    defaultValues: defaults as DefaultValues<Values>,
  })

  // Background resync: apply a freshly fetched canonical copy ONLY when this
  // section is clean. Never silently destroys an unsaved draft.
  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset(getDefaults(agency as Agency))
    }
    // form is stable in RHF; the resync target is the canonical agency.
  }, [agency, form, getDefaults])

  const save = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      await form.handleSubmit(async (values: Values) => {
        const canonical = await savePatch(toPatch(values), t(successTitleKey))
        form.reset(getDefaults(canonical))
      })(event)
    },
    [form, savePatch, toPatch, getDefaults, t, successTitleKey]
  )

  return {
    form,
    save,
    isDirty: form.formState.isDirty,
    isSaving,
  }
}