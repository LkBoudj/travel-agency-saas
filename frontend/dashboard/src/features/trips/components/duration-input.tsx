import type { UseFormRegisterReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { TripField } from "./trip-field"

type DurationErrors = {
  days?: { message?: string }
  nights?: { message?: string }
  hours?: { message?: string }
}

type DurationInputProps = {
  format: string
  /** True when the availability mode allows a flexible, goal-only duration. */
  isCustomQuote: boolean
  days: number | null | undefined
  nights: number | null | undefined
  hours: number | null | undefined
  isFlexible: boolean
  daysRegister: UseFormRegisterReturn<"days">
  nightsRegister: UseFormRegisterReturn<"nights">
  hoursRegister: UseFormRegisterReturn<"hours">
  onFlexibleChange: (value: boolean) => void
  errors?: DurationErrors
}

const MULTI_DAY_FORMATS = new Set(["stay", "circuit", "cruise"])
const FLEXIBLE_CAPABLE_FORMATS = new Set(["experience", "stay", "circuit", "cruise"])

/**
 * Duration field shared by the Create Trip drawer and the trip editor.
 * Format-gated:
 * - experience → positive number of hours
 * - day_excursion → static "same day"
 * - stay / circuit / cruise → days with nights (default = days - 1)
 * - custom_quote → optional "Flexible duration" (numeric fields hidden)
 * The caller composes the RHF register objects so both schemas (create vs
 * editor) can reuse this single component.
 */
export function DurationInput({
  format,
  isCustomQuote,
  isFlexible,
  daysRegister,
  nightsRegister,
  hoursRegister,
  onFlexibleChange,
  errors,
}: DurationInputProps) {
  const { t } = useTranslation()

  const isMultiDay = MULTI_DAY_FORMATS.has(format)
  const canBeFlexible =
    isCustomQuote && FLEXIBLE_CAPABLE_FORMATS.has(format)

  if (!format) {
    return (
      <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
        {t("trips:duration.prompt")}
      </p>
    )
  }

  if (format === "day_excursion") {
    return (
      <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
        {t("trips:duration.sameDay")}
      </p>
    )
  }

  return (
    <div className="grid gap-4">
      {canBeFlexible && (
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <span className="grid gap-0.5">
            <span className="text-sm">{t("trips:duration.flexible.label")}</span>
            <span className="text-xs text-muted-foreground">
              {t("trips:duration.flexible.helper")}
            </span>
          </span>
          <input
            type="checkbox"
            checked={isFlexible}
            aria-label={t("trips:duration.flexible.label")}
            onChange={(event) => onFlexibleChange(event.target.checked)}
            className="size-4 shrink-0 rounded border-input accent-foreground"
          />
        </label>
      )}

      {isFlexible ? (
        <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
          {t("trips:duration.flexibleNote")}
        </p>
      ) : format === "experience" ? (
        <TripField
          label={t("trips:duration.hours.label")}
          htmlFor="hours"
          error={errors?.hours?.message}
          helper={t("trips:duration.hours.helper")}
        >
          <Input
            id="hours"
            type="number"
            min={1}
            dir="ltr"
            placeholder="3"
            aria-invalid={errors?.hours ? true : undefined}
            {...hoursRegister}
          />
        </TripField>
      ) : isMultiDay ? (
        <div className="grid grid-cols-2 gap-4">
          <TripField
            label={t("trips:duration.days.label")}
            htmlFor="days"
            error={errors?.days?.message}
          >
            <Input
              id="days"
              type="number"
              min={1}
              dir="ltr"
              aria-invalid={errors?.days ? true : undefined}
              {...daysRegister}
            />
          </TripField>
          <TripField
            label={t("trips:duration.nights.label")}
            htmlFor="nights"
            error={errors?.nights?.message}
            helper={t("trips:duration.nights.helper")}
          >
            <Input
              id="nights"
              type="number"
              min={0}
              dir="ltr"
              aria-invalid={errors?.nights ? true : undefined}
              {...nightsRegister}
            />
          </TripField>
        </div>
      ) : null}
    </div>
  )
}