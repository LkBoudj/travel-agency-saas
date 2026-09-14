import { Plus, Trash2 } from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  useFieldArray,
  useWatch,
  type Control,
  type UseFormRegister,
} from "react-hook-form"
import { useAppLocale } from "@/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { createDefaultOpeningHours, createEntityId } from "../api/agency.api"
import { agencyWilayaOptions, VISIBILITY_OPTIONS } from "../constants/agency-options"
import type { LocationsFormValues } from "../schemas/agency.schemas"
import type { Visibility } from "../types/agency.types"
import { OpeningHoursEditor } from "./opening-hours-editor"

type LocationsEditorProps = {
  control: Control<LocationsFormValues, unknown, LocationsFormValues>
  register: UseFormRegister<LocationsFormValues>
}

/**
 * Array-based locations editor. Multiple locations are preserved — only the
 * imported/saved array is ever replaced, never a single location. At most one
 * location can be primary. Each location carries its own opening hours.
 */
export function LocationsEditor({ control, register }: LocationsEditorProps) {
  const { t } = useTranslation()
  const locale = useAppLocale()
  const locations = useFieldArray({ control, name: "locations" })
  const values = useWatch({ control, name: "locations" }) ?? []
  const wilayaOptions = useMemo(() => agencyWilayaOptions(locale), [locale])

  const add = () => {
    locations.append({
      id: createEntityId(),
      name: "",
      visibility: "public",
      isPrimary: values.length === 0,
      countryCode: "DZ",
      regionCode: "",
      commune: "",
      address: "",
      openingHours: createDefaultOpeningHours(),
    })
  }

  const setVisibility = (index: number, visibility: Visibility) => {
    const current = values[index]
    if (!current) return
    locations.update(index, { ...current, visibility })
  }

  const setPrimary = (index: number) => {
    values.forEach((location, i) => {
      locations.update(i, { ...location, isPrimary: i === index })
    })
  }

  return (
    <div className="grid gap-3">
      <Button type="button" variant="outline" size="sm" onClick={add} className="justify-self-start">
        <Plus className="size-3.5" />
        {t("agency:locations.add")}
      </Button>

      {values.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("agency:locations.helper")}</p>
      )}

      {values.map((location, index) => (
        <div key={location.id} className="grid gap-3 rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="h-8 min-w-40 flex-1"
              placeholder={t("agency:locations.name.placeholder")}
              aria-label={t("agency:locations.name.label")}
              {...register(`locations.${index}.name`)}
            />
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <input
                type="radio"
                name="agency-primary-location"
                checked={location.isPrimary}
                onChange={() => setPrimary(index)}
                className="size-3.5 accent-primary"
                aria-label={t("agency:locations.primary")}
              />
              {t("agency:locations.primary")}
            </label>
            <div
              role="group"
              aria-label={t("agency:visibility.public")}
              className="flex rounded-lg border border-border p-0.5"
            >
              {VISIBILITY_OPTIONS.map((option) => {
                const active = location.visibility === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setVisibility(index, option.value)}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t(option.labelKey)}
                  </button>
                )
              })}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("agency:actions.remove")}
              onClick={() => locations.remove(index)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <NativeSelect
              className="h-8"
              aria-label={t("agency:locations.wilaya.label")}
              {...register(`locations.${index}.regionCode`)}
            >
              <option value="">{t("agency:locations.wilaya.placeholder")}</option>
              {wilayaOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
            <Input
              dir="auto"
              placeholder={t("agency:locations.commune.placeholder")}
              aria-label={t("agency:locations.commune.label")}
              {...register(`locations.${index}.commune`)}
            />
            <Input
              dir="auto"
              placeholder={t("agency:locations.address.placeholder")}
              aria-label={t("agency:locations.address.label")}
              {...register(`locations.${index}.address`)}
            />
          </div>

          <div className="grid gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t("agency:locations.openingHours")}
            </p>
            <OpeningHoursEditor
              control={control}
              register={register}
              path={`locations.${index}.openingHours`}
            />
          </div>
        </div>
      ))}
    </div>
  )
}