import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAgencySection } from "../hooks/use-agency-section"
import { createGeneralSchema, type GeneralFormValues } from "../schemas/agency.schemas"
import type { Agency, AgencyPatch } from "../types/agency.types"
import { AgencyField } from "./agency-field"
import { AgencySectionActions } from "./agency-section-actions"
import { AgencySectionHeading } from "./agency-section-heading"

export function GeneralForm() {
  const { t } = useTranslation()
  const { form, save, isDirty, isSaving } = useAgencySection<GeneralFormValues>({
    schemaFactory: createGeneralSchema,
    getDefaults: (agency: Agency) => ({
      name: agency.name,
      tagline: agency.tagline,
      shortDescription: agency.shortDescription,
      fullAbout: agency.fullAbout,
    }),
    toPatch: (values: GeneralFormValues): AgencyPatch => ({
      name: values.name,
      tagline: values.tagline,
      shortDescription: values.shortDescription,
      fullAbout: values.fullAbout,
    }),
    successTitleKey: "agency:actions.generalSaved",
  })

  const {
    register,
    formState: { errors },
  } = form

  return (
    <form onSubmit={save} className="grid gap-6">
      <AgencySectionHeading>{t("agency:sections.general")}</AgencySectionHeading>

      <div className="grid gap-4">
        <AgencyField
          label={t("agency:general.agencyName.label")}
          htmlFor="general-name"
          error={errors.name?.message}
        >
          <Input
            id="general-name"
            placeholder={t("agency:general.agencyName.placeholder")}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "general-name-error" : undefined}
            {...register("name")}
          />
        </AgencyField>

        <AgencyField
          label={t("agency:general.tagline.label")}
          htmlFor="general-tagline"
        >
          <Input
            id="general-tagline"
            dir="auto"
            placeholder={t("agency:general.tagline.placeholder")}
            {...register("tagline")}
          />
        </AgencyField>

        <AgencyField
          label={t("agency:general.shortDescription.label")}
          htmlFor="general-short-description"
          error={errors.shortDescription?.message}
          helper={t("agency:general.shortDescription.helper")}
        >
          <Textarea
            id="general-short-description"
            rows={2}
            className="min-h-16"
            placeholder={t("agency:general.shortDescription.placeholder")}
            aria-invalid={errors.shortDescription ? true : undefined}
            {...register("shortDescription")}
          />
        </AgencyField>

        <AgencyField
          label={t("agency:general.fullAbout.label")}
          htmlFor="general-full-about"
        >
          <Textarea
            id="general-full-about"
            rows={5}
            className="min-h-28"
            placeholder={t("agency:general.fullAbout.placeholder")}
            {...register("fullAbout")}
          />
        </AgencyField>
      </div>

      <AgencySectionActions isDirty={isDirty} isSaving={isSaving} />
    </form>
  )
}