import { CalendarPlus, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { DEPARTURE_STATUS_LABELS } from "../types/trip.types"
import type { TripEditor } from "../hooks/use-trip-editor"
import { SectionHeading } from "./section-heading"
import { TripField } from "./trip-field"

type DeparturesEditorProps = Pick<
  TripEditor,
  "form" | "fieldArrays" | "addDeparture"
>

/** Scheduled occurrences: dates, capacity, deadline, status, and prices. */
export function DeparturesEditor({
  form,
  fieldArrays,
  addDeparture,
}: DeparturesEditorProps) {
  const { t } = useTranslation()
  const {
    register,
    formState: { errors },
  } = form
  const { departures } = fieldArrays

  const statusOptions = Object.entries(DEPARTURE_STATUS_LABELS)

  return (
    <div className="grid gap-4">
      <SectionHeading helper={t("trips:departures.helper")}>
        {t("trips:departures.title")}
      </SectionHeading>

      {departures.fields.length === 0 && (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {t("trips:departures.empty")}
        </p>
      )}

      {departures.fields.map((departure, index) => {
        const departureErrors = errors.departures?.[index]
        return (
          <div key={departure.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">
                {t("trips:departures.departureLabel", { n: index + 1 })}
              </h3>
              <div className="flex items-center gap-2">
                <NativeSelect
                  className="w-32"
                  aria-label={t("trips:departures.statusAria", {
                    n: index + 1,
                  })}
                  {...register(`departures.${index}.status`)}
                >
                  {statusOptions.map(([value, labelKey]) => (
                    <option key={value} value={value}>
                      {t(labelKey)}
                    </option>
                  ))}
                </NativeSelect>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("trips:departures.removeAria", {
                    n: index + 1,
                  })}
                  onClick={() => departures.remove(index)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <TripField
                label={t("trips:departures.startLabel")}
                htmlFor={`departures.${index}.startAt`}
                error={departureErrors?.startAt?.message}
                helper={t("trips:departures.startHelper")}
              >
                <Input
                  id={`departures.${index}.startAt`}
                  type="datetime-local"
                  dir="ltr"
                  aria-invalid={departureErrors?.startAt ? true : undefined}
                  {...register(`departures.${index}.startAt`)}
                />
              </TripField>

              <TripField
                label={t("trips:departures.endLabel")}
                htmlFor={`departures.${index}.endAt`}
                error={departureErrors?.endAt?.message}
              >
                <Input
                  id={`departures.${index}.endAt`}
                  type="datetime-local"
                  dir="ltr"
                  aria-invalid={departureErrors?.endAt ? true : undefined}
                  {...register(`departures.${index}.endAt`)}
                />
              </TripField>

              <TripField
                label={t("trips:departures.capacityLabel")}
                htmlFor={`departures.${index}.capacity`}
                error={departureErrors?.capacity?.message}
              >
                <Input
                  id={`departures.${index}.capacity`}
                  type="number"
                  min={1}
                  placeholder={t("trips:departures.capacityPlaceholder")}
                  {...register(`departures.${index}.capacity`, {
                    valueAsNumber: true,
                  })}
                />
              </TripField>

              <TripField
                label={t("trips:departures.deadlineLabel")}
                htmlFor={`departures.${index}.bookingDeadline`}
                error={departureErrors?.bookingDeadline?.message}
              >
                <Input
                  id={`departures.${index}.bookingDeadline`}
                  type="date"
                  dir="ltr"
                  {...register(`departures.${index}.bookingDeadline`)}
                />
              </TripField>
            </div>

            <div className="mt-3 grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("trips:departures.pricesLabel")}
              </span>
              {departure.prices.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("trips:departures.noPriceHint")}
                </p>
              )}
              {departure.prices.map((band, priceIndex) => (
                <div
                  key={band.pricingOption}
                  className="flex items-center gap-2"
                >
                  <span className="w-32 shrink-0 text-sm text-muted-foreground">
                    {band.pricingOption}
                  </span>
                  <Input
                    dir="ltr"
                    type="number"
                    min={0}
                    aria-label={t("trips:departures.priceAria", {
                      option: band.pricingOption,
                      n: index + 1,
                    })}
                    placeholder="120,000"
                    className="max-w-[160px]"
                    {...register(
                      `departures.${index}.prices.${priceIndex}.price`,
                      { valueAsNumber: true }
                    )}
                  />
                  <span className="text-xs text-muted-foreground">DZD</span>
                </div>
              ))}
              {departureErrors?.prices?.message && (
                <p className="text-xs text-destructive">
                  {departureErrors.prices.message}
                </p>
              )}
            </div>

            <div className="mt-3">
              <TripField
                label={t("trips:departures.notesLabel")}
                htmlFor={`departures.${index}.notes`}
                helper={t("trips:departures.notesHelper")}
              >
                <Textarea
                  id={`departures.${index}.notes`}
                  rows={2}
                  placeholder={t("trips:departures.notesPlaceholder")}
                  {...register(`departures.${index}.notes`)}
                />
              </TripField>
            </div>
          </div>
        )
      })}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-self-start text-primary"
        onClick={addDeparture}
      >
        <CalendarPlus className="size-4" />
        {t("trips:departures.add")}
      </Button>
    </div>
  )
}