import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { useAgencySection } from "../hooks/use-agency-section"
import { createBrandSchema, type BrandFormValues } from "../schemas/agency.schemas"
import type { AgencyPatch } from "../types/agency.types"
import { AgencyField } from "./agency-field"
import { AgencySectionActions } from "./agency-section-actions"
import { AgencySectionHeading } from "./agency-section-heading"

export function BrandForm() {
  const { t } = useTranslation()
  const { form, save, isDirty, isSaving } = useAgencySection<BrandFormValues>({
    schemaFactory: () => createBrandSchema(),
    getDefaults: (agency) => ({
      media: {
        logoUrl: agency.media.logoUrl,
        heroImageUrl: agency.media.heroImageUrl,
      },
    }),
    toPatch: (values: BrandFormValues): AgencyPatch => ({ media: values.media }),
    successTitleKey: "agency:actions.brandSaved",
  })

  const { register } = form

  return (
    <form onSubmit={save} className="grid gap-6">
      <AgencySectionHeading helper={t("agency:brand.mediaNote")}>
        {t("agency:sections.brand")}
      </AgencySectionHeading>

      <div className="grid gap-4">
        <AgencyField
          label={t("agency:brand.logo.label")}
          htmlFor="brand-logo"
          helper={t("agency:brand.logo.helper")}
        >
          <Input
            id="brand-logo"
            dir="ltr"
            placeholder={t("agency:brand.logo.placeholder")}
            {...register("media.logoUrl")}
          />
        </AgencyField>

        <AgencyField
          label={t("agency:brand.hero.label")}
          htmlFor="brand-hero"
          helper={t("agency:brand.hero.helper")}
        >
          <Input
            id="brand-hero"
            dir="ltr"
            placeholder={t("agency:brand.hero.placeholder")}
            {...register("media.heroImageUrl")}
          />
        </AgencyField>
      </div>

      <AgencySectionActions isDirty={isDirty} isSaving={isSaving} />
    </form>
  )
}