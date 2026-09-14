import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { useAgencySection } from "../hooks/use-agency-section"
import { createLegalSchema, type LegalFormValues } from "../schemas/agency.schemas"
import type { Agency, AgencyPatch } from "../types/agency.types"
import { AgencyField } from "./agency-field"
import { AgencySectionActions } from "./agency-section-actions"
import { AgencySectionHeading } from "./agency-section-heading"
import { SpecialAuthorizationsEditor } from "./special-authorizations-editor"

export function LegalForm() {
  const { t } = useTranslation()

  const { form, save, isDirty, isSaving } = useAgencySection<LegalFormValues>({
    schemaFactory: () => createLegalSchema(),
    getDefaults: (agency: Agency) => ({
      legal: {
        tourismLicenseNumber: agency.legal.tourismLicenseNumber,
        specialAuthorizations: agency.legal.specialAuthorizations.map((a) => ({ ...a })),
      },
    }),
    toPatch: (values: LegalFormValues): AgencyPatch => ({
      legal: {
        tourismLicenseNumber: values.legal.tourismLicenseNumber,
        specialAuthorizations: values.legal.specialAuthorizations,
      },
    }),
    successTitleKey: "agency:actions.legalSaved",
  })

  const {
    register,
    control,
    formState: { errors },
  } = form

  return (
    <form onSubmit={save} className="grid gap-6">
      <AgencySectionHeading helper={t("agency:legal.helper")}>
        {t("agency:sections.legal")}
      </AgencySectionHeading>

      <AgencyField
        label={t("agency:legal.tourismLicense.label")}
        htmlFor="legal-tourism-license"
        helper={t("agency:legal.tourismLicense.helper")}
        error={errors.legal?.tourismLicenseNumber?.message}
      >
        <Input
          id="legal-tourism-license"
          dir="ltr"
          placeholder={t("agency:legal.tourismLicense.placeholder")}
          aria-invalid={errors.legal?.tourismLicenseNumber ? true : undefined}
          {...register("legal.tourismLicenseNumber")}
        />
      </AgencyField>

      <SpecialAuthorizationsEditor control={control} register={register} />

      <AgencySectionActions isDirty={isDirty} isSaving={isSaving} />
    </form>
  )
}