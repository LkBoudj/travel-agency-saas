import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import type { TripEditor } from "../hooks/use-trip-editor"
import { SectionHeading } from "./section-heading"
import { TripField } from "./trip-field"

/**
 * Booking settings shell. Currently holds the trip-level minimum-travelers
 * rule (relocated from the Overview rail). The custom question builder and
 * the rest of the Booking rules are scheduled for a later milestone — do not
 * invent behavior here.
 */
export function BookingSettingsSection({ editor }: { editor: TripEditor }) {
  const { t } = useTranslation()
  const { register, formState } = editor.form

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <SectionHeading helper={t("trips:booking.configureHelper")}>
          {t("trips:booking.configureTitle")}
        </SectionHeading>

        <TripField
          label={t("trips:overview.minTravelers.label")}
          htmlFor="minTravelers"
          error={formState.errors.minTravelers?.message}
        >
          <Input
            id="minTravelers"
            type="number"
            min={0}
            dir="ltr"
            {...register("minTravelers", { valueAsNumber: true })}
          />
        </TripField>
      </div>

      <div className="grid gap-3 rounded-lg border border-dashed p-6 text-center">
        <h2 className="text-sm font-medium">{t("trips:booking.title")}</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {t("trips:booking.description")}
        </p>
      </div>
    </div>
  )
}