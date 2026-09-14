import type { AppLocale } from "@/i18n"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  useWatch,
  type Control,
  type FieldPath,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form"
import { wilayaOptions } from "@/constants/algeria-geo"
import type { TripFormValues } from "../schemas/trip.schema"
import type { GeographicScope, TripLocationDraft } from "../types/trip.types"
import { SearchableLocationSelect } from "./searchable-location-select"
import { TripField } from "./trip-field"

export type TripLocationPath = "origin" | `destinations.${number}`

/** Array-index paths (e.g. `destinations.2.cityId`) are built at runtime. */
function draftPath(
  basePath: TripLocationPath,
  field: string
): FieldPath<TripFormValues> {
  return `${basePath}.${field}` as FieldPath<TripFormValues>
}

type TripLocationErrors = {
  wilayaCode?: string
  cityId?: string
  place?: string
}

type TripLocationFieldsProps = {
  basePath: TripLocationPath
  kind: "origin" | "destination"
  scope: GeographicScope | ""
  locale: AppLocale
  control: Control<TripFormValues>
  register: UseFormRegister<TripFormValues>
  setValue: UseFormSetValue<TripFormValues>
  errors?: TripLocationErrors
}

/**
 * Structured location fields for one trip location (origin or a destination).
 *
 * - Wilaya is a searchable controlled combobox; the stored value is a stable
 *   code. Changing it predictably clears any incompatible city selection.
 * - City / Commune is a controlled text field until commune reference data
 *   exists (architected, documented dependency — nothing fabricated).
 * - Specific place is an optional tourism destination. For international
 *   scope, the destination falls back to a single free-text value.
 */
export function TripLocationFields({
  basePath,
  kind,
  scope,
  locale,
  control,
  register,
  setValue,
  errors,
}: TripLocationFieldsProps) {
  const { t } = useTranslation()
  const values = useWatch({
    control,
    name: basePath as FieldPath<TripFormValues>,
  })

  const options = useMemo(() => wilayaOptions(locale), [locale])

  const prefix =
    kind === "origin"
      ? "trips:overview.origin"
      : "trips:overview.destination"

  const isInternationalDestination =
    kind === "destination" && scope === "international"

  const location = (values ?? {}) as TripLocationDraft
  const wilayaCode = location.wilayaCode ?? ""

  const updateWilaya = (code: string) => {
    setValue(draftPath(basePath, "wilayaCode"), code, {
      shouldDirty: true,
      shouldTouch: true,
    })
    // A city belongs to a wilaya: never silently keep an incompatible value.
    setValue(draftPath(basePath, "cityId"), "", {
      shouldDirty: true,
    })
  }

  if (isInternationalDestination) {
    return (
      <TripField
        label={t("trips:overview.destination.internationalLabel")}
        htmlFor={`${basePath}.place`}
        error={errors?.place}
      >
        <input
          id={`${basePath}.place`}
          dir="auto"
          placeholder={t("trips:overview.destination.internationalPlaceholder")}
          aria-invalid={errors?.place ? true : undefined}
          className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30"
          {...register(draftPath(basePath, "place"))}
        />
      </TripField>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TripField
        label={t(`${prefix}.wilaya.label`)}
        htmlFor={`${basePath}.wilayaCode`}
        error={errors?.wilayaCode}
        helper={
          kind === "origin" ? t("trips:overview.origin.wilaya.helper") : undefined
        }
      >
        <SearchableLocationSelect
          id={`${basePath}.wilayaCode`}
          options={options}
          value={wilayaCode}
          onValueChange={updateWilaya}
          placeholder={t(`${prefix}.wilaya.placeholder`)}
          ariaLabel={t(`${prefix}.wilaya.searchAria`)}
          emptyText={t(`${prefix}.wilaya.empty`)}
          clearAria={t(`${prefix}.wilaya.clearAria`)}
          triggerAria={t(`${prefix}.wilaya.triggerAria`)}
          error={errors?.wilayaCode}
        />
      </TripField>

      <TripField
        label={t(`${prefix}.city.label`)}
        htmlFor={`${basePath}.cityId`}
        error={errors?.cityId}
      >
        <input
          id={`${basePath}.cityId`}
          dir="auto"
          placeholder={t(`${prefix}.city.placeholder`)}
          aria-invalid={errors?.cityId ? true : undefined}
          className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30"
          {...register(draftPath(basePath, "cityId"))}
        />
      </TripField>

      {kind === "destination" && (
        <div className="sm:col-span-2">
          <TripField
            label={t("trips:overview.destination.place.label")}
            htmlFor={`${basePath}.place`}
            error={errors?.place}
            helper={
              scope === "domestic"
                ? t("trips:overview.destination.place.helper")
                : undefined
            }
          >
            <input
              id={`${basePath}.place`}
              dir="auto"
              placeholder={t("trips:overview.destination.place.placeholder")}
              aria-invalid={errors?.place ? true : undefined}
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30"
              {...register(draftPath(basePath, "place"))}
            />
          </TripField>
        </div>
      )}
    </div>
  )
}