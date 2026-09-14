import { useTranslation } from "react-i18next"
import {
  useFieldArray,
  useWatch,
  type Control,
  type UseFormRegister,
} from "react-hook-form"
import { DAY_OPTIONS } from "../constants/agency-options"
import type { LocationsFormValues } from "../schemas/agency.schemas"

export type OpeningHoursPath = `locations.${number}.openingHours`

type OpeningHoursEditorProps = {
  control: Control<LocationsFormValues, unknown, LocationsFormValues>
  register: UseFormRegister<LocationsFormValues>
  path: OpeningHoursPath
}

/**
 * Compact weekly opening-hours rows (Saturday → Friday) for one location.
 * Each row: day label | open toggle | opensAt — closesAt. Times are HH:MM
 * 24-hour strings (frozen vocabulary: opensAt / closesAt).
 */
export function OpeningHoursEditor({
  control,
  register,
  path,
}: OpeningHoursEditorProps) {
  const { t } = useTranslation()
  const hours = useFieldArray({ control, name: path })
  const entries = useWatch({ control, name: path }) ?? []

  const toggleOpen = (dayIndex: number, isOpen: boolean) => {
    const current = entries[dayIndex]
    if (!current) return
    hours.update(dayIndex, {
      ...current,
      isOpen,
      opensAt: isOpen ? current.opensAt || "09:00" : current.opensAt,
      closesAt: isOpen ? current.closesAt || "17:00" : current.closesAt,
    })
  }

  const timeClass =
    "h-7 w-[4.5rem] rounded-md border border-input bg-transparent px-1.5 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"

  return (
    <div className="grid gap-1.5">
      {DAY_OPTIONS.map((day, dayIndex) => {
        const entry = entries[dayIndex]
        const isOpen = entry?.isOpen ?? false
        return (
          <div key={day.value} className="flex items-center gap-2">
            <label
              className="flex w-28 shrink-0 items-center gap-1.5 text-xs font-medium"
              title={t(day.labelKey)}
            >
              <input
                type="checkbox"
                checked={isOpen}
                onChange={() => toggleOpen(dayIndex, !isOpen)}
                className="size-3.5 accent-primary"
                aria-label={t(day.labelKey)}
              />
              <span className="truncate">{t(day.labelKey)}</span>
            </label>
            <span className="w-10 shrink-0 text-[10px] text-muted-foreground">
              {isOpen ? t("agency:openingHours.isOpen") : t("agency:openingHours.closed")}
            </span>
            <input
              type="time"
              dir="ltr"
              disabled={!isOpen}
              className={timeClass}
              aria-label={`${t(day.labelKey)} ${t("agency:openingHours.opensAt")}`}
              {...register(`${path}.${dayIndex}.opensAt`)}
            />
            <span className="shrink-0 text-xs text-muted-foreground" aria-hidden>
              —
            </span>
            <input
              type="time"
              dir="ltr"
              disabled={!isOpen}
              className={timeClass}
              aria-label={`${t(day.labelKey)} ${t("agency:openingHours.closesAt")}`}
              {...register(`${path}.${dayIndex}.closesAt`)}
            />
          </div>
        )
      })}
    </div>
  )
}