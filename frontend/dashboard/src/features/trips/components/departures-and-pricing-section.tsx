import { Info } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useWatch } from "react-hook-form"
import { useAgencyContext } from "@/features/agency-context/hooks/use-agency-context"
import type { TripEditor } from "../hooks/use-trip-editor"
import { DeparturesManager } from "./departures-manager"
import { PricingManager } from "./pricing-manager"
import { SectionHeading } from "./section-heading"

type DeparturesAndPricingSectionProps = {
  editor: TripEditor
}

const NON_SCHEDULED_MODES = new Set(["on_request", "custom_quote"])

/**
 * Departures & Pricing (Modules G + H live).
 *
 * Scheduled trips get the real DeparturesManager — a published trip simply
 * shows the warning when it holds no open departure, it is never silently
 * unpublished here. On-request and custom-quote modes carry no scheduled
 * departures by definition, so they explain the mode instead. Pricing is the
 * live module beneath: options are managed here and priced per departure
 * inside the manager above.
 */
export function DeparturesAndPricingSection({
  editor,
}: DeparturesAndPricingSectionProps) {
  const { t } = useTranslation()
  const { agency } = useAgencyContext()
  const availabilityMode = useWatch({
    name: "availabilityMode",
    control: editor.form.control,
  })

  const mode = availabilityMode ?? "scheduled"
  const nonScheduled = NON_SCHEDULED_MODES.has(mode)
  const tour = editor.tourQuery.data

  return (
    <div className="grid gap-6">
      <section className="grid gap-4">
        <SectionHeading helper={t("trips:departures.helper")}>
          {t("trips:departures.title")}
        </SectionHeading>

        {nonScheduled ? (
          <AvailabilityInfo mode={mode} />
        ) : (
          <DeparturesManager
            agencyCode={agency.code}
            tourCode={tour?.code ?? ""}
            tourStatus={tour?.status}
          />
        )}
      </section>

      <PricingManager
        agencyCode={agency.code}
        tourCode={tour?.code ?? ""}
      />
    </div>
  )
}

function AvailabilityInfo({ mode }: { mode: string }) {
  const { t } = useTranslation()

  const body =
    mode === "custom_quote"
      ? t("trips:availabilityInfo.bodyCustomQuote")
      : t("trips:availabilityInfo.bodyOnRequest")

  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed px-4 py-4 text-sm">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Info className="size-4" aria-hidden />
      </span>
      <div className="grid gap-1">
        <p className="font-medium">
          {t(`trips:availability.${mode}`)}
        </p>
        <p className="text-[13px] text-muted-foreground">{body}</p>
        <p className="text-xs text-muted-foreground/70">
          {t("trips:availabilityInfo.helper")}
        </p>
      </div>
    </div>
  )
}