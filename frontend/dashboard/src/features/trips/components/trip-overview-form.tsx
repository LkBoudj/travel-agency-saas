import { useMemo, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { useWatch } from "react-hook-form"
import { useAppLocale } from "@/i18n"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { TripEditor } from "../hooks/use-trip-editor"
import {
  THEME_OPTIONS,
  ACTIVITY_OPTIONS,
  AUDIENCE_OPTIONS,
  translateOptions,
} from "../constants/trip-taxonomy"
import type {
  TripTheme,
  TripActivity,
  TripAudience,
} from "../types/trip.types"
import { DestinationEditor } from "./destination-editor"
import { DurationInput } from "./duration-input"
import { SectionHeading } from "./section-heading"
import { TaxonomyPicker } from "./taxonomy-picker"
import { TripField } from "./trip-field"
import { TripLocationFields } from "./trip-location-fields"
import { TripReadinessPanel } from "./trip-readiness-panel"
import { TripSetupCard } from "./trip-setup-card"

type TripOverviewFormProps = {
  editor: TripEditor
}

/**
 * Trip Overview (v4, M1): main editing column (Basic information + Route &
 * duration) next to a sticky rail (Status/readiness, Trip setup, Discovery).
 * Name is edited inline in the page header; description/highlights/activity
 * requirements live in the Details section; min travelers lives in Booking
 * settings. Everything stays wired to the same draft/save boundary.
 */
export function TripOverviewForm({ editor }: TripOverviewFormProps) {
  const { t } = useTranslation()
  const locale = useAppLocale()
  const {
    form,
    fieldArrays,
    shortDescriptionChars,
    setNightsTouched,
  } = editor
  const {
    register,
    setValue,
    control,
    formState: { errors },
  } = form
  const { destinations } = fieldArrays

  const format = useWatch({ name: "format", control }) ?? ""
  const scope = useWatch({ name: "geographicScope", control }) ?? ""
  const availabilityMode = useWatch({ name: "availabilityMode", control })
  const themes = useWatch({ name: "themes", control }) ?? []
  const activities = useWatch({ name: "activities", control }) ?? []
  const audiences = useWatch({ name: "audiences", control }) ?? []
  const destinationsWatch = useWatch({ name: "destinations", control }) ?? []
  const days = useWatch({ name: "days", control })
  const nights = useWatch({ name: "nights", control })
  const hours = useWatch({ name: "hours", control })
  const isFlexible = useWatch({ name: "isFlexible", control }) ?? false

  const themeOptions = useMemo(() => translateOptions(THEME_OPTIONS, t), [t])
  const activityOptions = useMemo(
    () => translateOptions(ACTIVITY_OPTIONS, t),
    [t]
  )
  const audienceOptions = useMemo(
    () => translateOptions(AUDIENCE_OPTIONS, t),
    [t]
  )

  const optionalNumber = (value: string) =>
    value === "" ? undefined : Number(value)

  const baseNightsRegister = register("nights", { setValueAs: optionalNumber })
  const nightsRegister = {
    ...baseNightsRegister,
    onChange: async (
      event: Parameters<typeof baseNightsRegister.onChange>[0]
    ) => {
      await baseNightsRegister.onChange(event)
      setNightsTouched()
    },
  }

  const isCircuit = format === "circuit"

  const originErrors = {
    wilayaCode: errors.origin?.wilayaCode?.message,
    cityId: errors.origin?.cityId?.message,
    place: errors.origin?.place?.message,
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <main className="grid min-w-0 gap-6">
        <OverviewCard
          heading={
            <SectionHeading>{t("trips:overview.basicInfo.title")}</SectionHeading>
          }
        >
          <div className="grid gap-4">
            <TripField
              label={t("trips:overview.shortDescription.label")}
              htmlFor="shortDescription"
              error={errors.shortDescription?.message}
              helper={t("trips:overview.shortDescription.helper", {
                count: shortDescriptionChars,
              })}
            >
              <Textarea
                id="shortDescription"
                rows={3}
                maxLength={160}
                placeholder={t("trips:overview.shortDescription.placeholder")}
                aria-invalid={errors.shortDescription ? true : undefined}
                aria-describedby={
                  errors.shortDescription ? "shortDescription-error" : undefined
                }
                {...register("shortDescription")}
              />
            </TripField>

            <TripField
              label={t("trips:overview.internalRef.label")}
              htmlFor="internalRef"
              helper={t("trips:overview.internalRef.helper")}
            >
              <Input
                id="internalRef"
                dir="ltr"
                placeholder={t("trips:overview.internalRef.placeholder")}
                {...register("internalRef")}
              />
            </TripField>
          </div>
        </OverviewCard>

        <OverviewCard
          heading={
            <SectionHeading>{t("trips:overview.route.title")}</SectionHeading>
          }
        >
          <div className="grid gap-4 border-b border-border pb-4">
            <SubGroupHeading>{t("trips:overview.origin.title")}</SubGroupHeading>
            <TripLocationFields
              basePath="origin"
              kind="origin"
              scope={scope}
              locale={locale}
              control={control}
              register={register}
              setValue={setValue}
              errors={originErrors}
            />
          </div>

          <div className="grid gap-4 border-b border-border pb-4">
            <div className="flex items-center justify-between gap-3">
              <SubGroupHeading>
                {isCircuit
                  ? t("trips:overview.destination.circuitTitle")
                  : t("trips:overview.destination.singleTitle")}
              </SubGroupHeading>
              {isCircuit && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {destinationsWatch.length}
                </span>
              )}
            </div>
            <DestinationEditor
              isCircuit={isCircuit}
              scope={scope}
              locale={locale}
              control={control}
              register={register}
              setValue={setValue}
              errors={errors.destinations}
              destinations={destinationsWatch}
              append={destinations.append}
              remove={destinations.remove}
              swap={destinations.swap}
            />
            {isCircuit && (
              <p className="text-xs text-muted-foreground">
                {t("trips:overview.route.destinationsTip")}
              </p>
            )}
          </div>

          <TripField label={t("trips:overview.duration.label")} htmlFor="days">
            <DurationInput
              format={format}
              isCustomQuote={availabilityMode === "custom_quote"}
              days={days}
              nights={nights}
              hours={hours}
              isFlexible={isFlexible}
              daysRegister={register("days", { setValueAs: optionalNumber })}
              nightsRegister={nightsRegister}
              hoursRegister={register("hours", {
                setValueAs: optionalNumber,
              })}
              onFlexibleChange={(value) => setValue("isFlexible", value)}
              errors={errors}
            />
          </TripField>
        </OverviewCard>
      </main>

      <aside className="grid min-w-0 gap-6 lg:sticky lg:top-24">
        <TripReadinessPanel editor={editor} />
        <TripSetupCard editor={editor} />

        <section className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
          <SectionHeading>{t("trips:overview.classification.title")}</SectionHeading>
          <div className="grid gap-4">
            <TaxonomyPicker
              label={t("trips:overview.themes.label")}
              htmlFor="themes"
              options={themeOptions}
              selected={themes}
              onAdd={(value) =>
                setValue("themes", [...themes, value] as TripTheme[])
              }
              onRemove={(value) =>
                setValue("themes", themes.filter((theme) => theme !== value))
              }
              onClear={() => setValue("themes", [])}
              placeholder={t("trips:overview.themes.placeholder")}
            />

            <TaxonomyPicker
              label={t("trips:overview.activities.label")}
              htmlFor="activities"
              options={activityOptions}
              selected={activities}
              onAdd={(value) =>
                setValue("activities", [...activities, value] as TripActivity[])
              }
              onRemove={(value) =>
                setValue(
                  "activities",
                  activities.filter((activity) => activity !== value)
                )
              }
              onClear={() => setValue("activities", [])}
              placeholder={t("trips:overview.activities.placeholder")}
            />

            <TaxonomyPicker
              label={t("trips:overview.audience.label")}
              htmlFor="audiences"
              options={audienceOptions}
              selected={audiences}
              onAdd={(value) =>
                setValue("audiences", [...audiences, value] as TripAudience[])
              }
              onRemove={(value) =>
                setValue(
                  "audiences",
                  audiences.filter((audience) => audience !== value)
                )
              }
              onClear={() => setValue("audiences", [])}
              placeholder={t("trips:overview.audience.placeholder")}
            />
          </div>
        </section>
      </aside>
    </div>
  )
}

function OverviewCard({
  heading,
  children,
}: {
  heading: ReactNode
  children: ReactNode
}) {
  return (
    <section className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:p-6">
      {heading}
      <div className="grid gap-4">{children}</div>
    </section>
  )
}

function SubGroupHeading({ children }: { children: ReactNode }) {
  return <p className="text-sm font-medium text-foreground">{children}</p>
}