import { useTranslation } from "react-i18next"
import { useWatch } from "react-hook-form"
import type { TripEditor } from "../hooks/use-trip-editor"
import { DeparturesEditor } from "./departures-editor"
import { PricingOptionsEditor } from "./pricing-options-editor"
import { SectionHeading } from "./section-heading"

type DeparturesAndPricingSectionProps = Pick<
  TripEditor,
  "form" | "fieldArrays" | "addDeparture"
>

/**
 * Departures & Pricing section, adapted to the trip's availability mode:
 * - scheduled → full departures editor
 * - on_request → informational state, no departures
 * - custom_quote → informational state, no departures
 *
 * Pricing option categories stay at trip level in every mode; only actual
 * departure prices (which belong to departures) are skipped without one.
 */
export function DeparturesAndPricingSection({
  form,
  fieldArrays,
  addDeparture,
}: DeparturesAndPricingSectionProps) {
  const { t } = useTranslation()
  const availabilityMode = useWatch({
    name: "availabilityMode",
    control: form.control,
  })

  const informational = availabilityMode === "on_request" || availabilityMode === "custom_quote"

  return (
    <div className="grid gap-6">
      <PricingOptionsEditor form={form} fieldArrays={fieldArrays} />

      <div className="border-t" />

      {availabilityMode === "on_request" && (
        <AvailabilityInfo
          title={t("trips:availability.on_request")}
          body={t("trips:availabilityInfo.bodyOnRequest")}
        />
      )}

      {availabilityMode === "custom_quote" && (
        <AvailabilityInfo
          title={t("trips:availability.custom_quote")}
          body={t("trips:availabilityInfo.bodyCustomQuote")}
        />
      )}

      {!informational && (
        <DeparturesEditor
          form={form}
          fieldArrays={fieldArrays}
          addDeparture={addDeparture}
        />
      )}
    </div>
  )
}

type AvailabilityInfoProps = {
  title: string
  body: string
}

function AvailabilityInfo({ title, body }: AvailabilityInfoProps) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-3">
      <SectionHeading helper={t("trips:availabilityInfo.helper")}>
        {t("trips:departures.title")}
      </SectionHeading>
      <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{title}.</span>{" "}
        {body}
      </p>
    </div>
  )
}