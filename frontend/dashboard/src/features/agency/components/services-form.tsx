import { Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  useFieldArray,
  useWatch,
} from "react-hook-form"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { createEntityId } from "../api/agency.api"
import { useAgencySection } from "../hooks/use-agency-section"
import { SERVICE_LANGUAGE_OPTIONS, SERVICE_TYPE_OPTIONS, translateOptions } from "../constants/agency-options"
import { createServicesSchema, type ServicesFormValues } from "../schemas/agency.schemas"
import type { Agency, AgencyPatch } from "../types/agency.types"
import { AgencyField } from "./agency-field"
import { AgencySectionActions } from "./agency-section-actions"
import { AgencySectionHeading } from "./agency-section-heading"

export function ServicesForm() {
  const { t } = useTranslation()

  const { form, save, isDirty, isSaving } = useAgencySection<ServicesFormValues>({
    schemaFactory: createServicesSchema,
    getDefaults: (agency: Agency) => ({
      services: agency.services.map((service) => ({
        id: service.id,
        type: service.type,
        customLabel: service.customLabel ?? "",
        description: service.description ?? "",
      })),
      serviceLanguages: agency.serviceLanguages,
    }),
    toPatch: (values: ServicesFormValues): AgencyPatch => ({
      services: values.services,
      serviceLanguages: values.serviceLanguages,
    }),
    successTitleKey: "agency:actions.servicesSaved",
  })

  const {
    register,
    control,
    formState: { errors },
  } = form
  const services = useFieldArray({ control, name: "services" })
  const watchedServices = useWatch({ control, name: "services" }) ?? []
  const languages = useWatch({ control, name: "serviceLanguages" }) ?? []

  const toggleLanguage = (code: string) => {
    const next = languages.includes(code)
      ? languages.filter((c) => c !== code)
      : [...languages, code]
    form.setValue("serviceLanguages", next, { shouldDirty: true })
  }

  const add = () => {
    services.append({
      id: createEntityId(),
      type: "domestic_tours",
      customLabel: "",
      description: "",
    })
  }

  return (
    <form onSubmit={save} className="grid gap-6">
      <AgencySectionHeading helper={t("agency:services.helper")}>
        {t("agency:sections.services")}
      </AgencySectionHeading>

      <div className="grid gap-3">
        <Button type="button" variant="outline" size="sm" onClick={add} className="justify-self-start">
          <Plus className="size-3.5" />
          {t("agency:services.add")}
        </Button>

        {errors.services?.root?.message && (
          <p className="text-xs text-destructive">{errors.services.root.message}</p>
        )}

        {watchedServices.map((service, index) => (
          <div key={service.id} className="grid gap-3 rounded-lg border border-border p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <AgencyField label={t("agency:services.typeLabel")} htmlFor={`service-${index}-type`}>
                <NativeSelect
                  className="h-8"
                  id={`service-${index}-type`}
                  {...register(`services.${index}.type`)}
                >
                  {translateOptions(SERVICE_TYPE_OPTIONS, t).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </AgencyField>

              {service.type === "other" && (
                <AgencyField
                  label={t("agency:services.customLabel.label")}
                  htmlFor={`service-${index}-custom`}
                >
                  <Input
                    id={`service-${index}-custom`}
                    dir="auto"
                    placeholder={t("agency:services.customLabel.placeholder")}
                    {...register(`services.${index}.customLabel`)}
                  />
                </AgencyField>
              )}
            </div>

            <AgencyField
              label={t("agency:services.description.label")}
              htmlFor={`service-${index}-description`}
            >
              <Textarea
                id={`service-${index}-description`}
                rows={2}
                className="min-h-14"
                placeholder={t("agency:services.description.placeholder")}
                {...register(`services.${index}.description`)}
              />
            </AgencyField>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => services.remove(index)}
              >
                <Trash2 className="size-3.5" />
                {t("agency:actions.remove")}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-1.5">
        <p className="text-sm font-medium text-foreground">
          {t("agency:services.languages.label")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("agency:services.languages.helper")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {translateOptions(SERVICE_LANGUAGE_OPTIONS, t).map((option) => {
            const active = languages.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => toggleLanguage(option.value)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <AgencySectionActions isDirty={isDirty} isSaving={isSaving} />
    </form>
  )
}