import { useTranslation } from "react-i18next"
import { useAgencySection } from "../hooks/use-agency-section"
import { createLocationsSchema, type LocationsFormValues } from "../schemas/agency.schemas"
import type { Agency, AgencyPatch } from "../types/agency.types"
import { LocationsEditor } from "./locations-editor"
import { AgencySectionActions } from "./agency-section-actions"
import { AgencySectionHeading } from "./agency-section-heading"

export function LocationsForm() {
  const { t } = useTranslation()

  const { form, save, isDirty, isSaving } = useAgencySection<LocationsFormValues>({
    schemaFactory: createLocationsSchema,
    getDefaults: (agency: Agency) => ({
      locations: agency.locations.map((location) => ({
        ...location,
        regionCode: location.regionCode ?? "",
        commune: location.commune ?? "",
        address: location.address ?? "",
      })),
    }),
    toPatch: (values: LocationsFormValues): AgencyPatch => ({
      locations: values.locations.map((location) => ({
        ...location,
        regionCode: location.regionCode || undefined,
        commune: location.commune || undefined,
        address: location.address || undefined,
      })),
    }),
    successTitleKey: "agency:actions.locationsSaved",
  })

  const { control, register } = form

  return (
    <form onSubmit={save} className="grid gap-6">
      <AgencySectionHeading helper={t("agency:locations.helper")}>
        {t("agency:sections.locations")}
      </AgencySectionHeading>

      <LocationsEditor control={control} register={register} />

      <AgencySectionActions isDirty={isDirty} isSaving={isSaving} />
    </form>
  )
}