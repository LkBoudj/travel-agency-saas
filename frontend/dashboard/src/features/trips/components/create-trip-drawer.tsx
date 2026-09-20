import { Drawer } from "@base-ui/react/drawer"
import { X } from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useWatch } from "react-hook-form"
import { useAppLocale } from "@/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import {
  AVAILABILITY_OPTIONS,
  FORMAT_OPTIONS,
  SCOPE_OPTIONS,
  translateOptions,
} from "../constants/trip-taxonomy"
import { wilayaOptions } from "@/constants/algeria-geo"
import { useCreateTrip } from "../hooks/use-create-trip"
import { SearchableLocationSelect } from "./searchable-location-select"
import { DurationInput } from "./duration-input"
import { TripField } from "./trip-field"

type CreateTripDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Create Trip drawer (v4: six fields only — Name, Format, Geographic scope,
 * Destination, Availability, Duration). Desktop: panel fixed to the logical
 * inline edge. Mobile: full screen. The same component tree serves LTR and
 * RTL (the viewport's flex + justify-end mirrors under RTL).
 */
export function CreateTripDrawer({
  open,
  onOpenChange,
}: CreateTripDrawerProps) {
  const { t } = useTranslation()
  const locale = useAppLocale()
  const { form, handleSubmit, creating } = useCreateTrip({ onOpenChange })

  const {
    register,
    control,
    formState: { errors },
  } = form

  const format = useWatch({ name: "format", control }) ?? ""
  const scope = useWatch({ name: "geographicScope", control }) ?? ""
  const availabilityMode = useWatch({ name: "availabilityMode", control })
  const days = useWatch({ name: "days", control })
  const nights = useWatch({ name: "nights", control })
  const hours = useWatch({ name: "hours", control })
  const isFlexible = useWatch({ name: "isFlexible", control }) ?? false

  const formatOptions = useMemo(() => translateOptions(FORMAT_OPTIONS, t), [t])
  const scopeOptions = useMemo(() => translateOptions(SCOPE_OPTIONS, t), [t])
  const availabilityOptions = useMemo(
    () => translateOptions(AVAILABILITY_OPTIONS, t),
    [t]
  )
  const options = useMemo(() => wilayaOptions(locale), [locale])

  const optionalNumber = (value: string) =>
    value === "" ? undefined : Number(value)

  const destinationError = errors.destination

  // Destination stays implicitly domestic: Algeria is the home market.
  const destinationBase = "trips:create.destination"

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/40 data-starting-style:opacity-0 data-ending-style:opacity-0 transition-opacity duration-300 ease-out" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-stretch justify-end">
          <Drawer.Popup className="flex h-full w-full flex-col bg-background text-card-foreground outline-none border-s border-border md:w-[min(26rem,calc(100vw-3rem))] shadow-lg [transform:translateX(var(--drawer-swipe-movement-x))] transition-transform duration-300 ease-out data-starting-style:translate-x-full rtl:data-starting-style:-translate-x-full data-ending-style:translate-x-full rtl:data-ending-style:-translate-x-full">
            <form onSubmit={handleSubmit} className="flex h-full flex-col">
              <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold tracking-tight">
                    {t("trips:create.title")}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {t("trips:create.subtitle")}
                  </p>
                </div>
                <Drawer.Close
                  aria-label={t("trips:create.closeAria")}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" aria-hidden />
                </Drawer.Close>
              </header>

              <Drawer.Content className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
                <div className="grid gap-5">
                  <TripField
                    label={t("trips:create.name.label")}
                    htmlFor="create-name"
                    error={errors.name?.message}
                    helper={t("trips:create.name.helper")}
                  >
                    <Input
                      id="create-name"
                      dir="auto"
                      placeholder={t("trips:create.name.placeholder")}
                      aria-invalid={errors.name ? true : undefined}
                      {...register("name")}
                    />
                  </TripField>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TripField
                      label={t("trips:create.format.label")}
                      htmlFor="create-format"
                      error={errors.format?.message}
                    >
                      <NativeSelect
                        id="create-format"
                        aria-label={t("trips:create.format.label")}
                        {...register("format")}
                      >
                        <option value="">
                          {t("trips:create.format.placeholder")}
                        </option>
                        {formatOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </TripField>

                    <TripField
                      label={t("trips:create.scope.label")}
                      htmlFor="create-scope"
                      error={errors.geographicScope?.message}
                    >
                      <NativeSelect
                        id="create-scope"
                        aria-label={t("trips:create.scope.label")}
                        {...register("geographicScope")}
                      >
                        {scopeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </TripField>
                  </div>

                  <TripField
                    label={t(`${destinationBase}.label`)}
                    htmlFor="create-destination"
                    helper={t(`${destinationBase}.helper`)}
                  >
                    <div className="grid gap-4">
                      {scope === "international" ? (
                        <TripField
                          label={t(
                            "trips:overview.destination.internationalLabel"
                          )}
                          htmlFor="create-destination-place"
                          error={destinationError?.place?.message}
                        >
                          <Input
                            id="create-destination-place"
                            dir="auto"
                            placeholder={t(
                              "trips:overview.destination.internationalPlaceholder"
                            )}
                            aria-invalid={
                              destinationError?.place ? true : undefined
                            }
                            {...register("destination.place")}
                          />
                        </TripField>
                      ) : (
                        <div className="grid gap-4">
                          <TripField
                            label={t("trips:overview.destination.wilaya.label")}
                            htmlFor="create-destination-wilaya"
                            error={destinationError?.wilayaCode?.message}
                          >
                            <SearchableLocationSelect
                              id="create-destination-wilaya"
                              options={options}
                              value={form.getValues("destination.wilayaCode")}
                              onValueChange={(code) =>
                                form.setValue(
                                  "destination.wilayaCode",
                                  code,
                                  { shouldDirty: true }
                                )
                              }
                              placeholder={t(
                                "trips:overview.destination.wilaya.placeholder"
                              )}
                              ariaLabel={t(
                                "trips:overview.destination.wilaya.searchAria"
                              )}
                              emptyText={t(
                                "trips:overview.destination.wilaya.empty"
                              )}
                              clearAria={t(
                                "trips:overview.destination.wilaya.clearAria"
                              )}
                              triggerAria={t(
                                "trips:overview.destination.wilaya.triggerAria"
                              )}
                              error={destinationError?.wilayaCode?.message}
                            />
                          </TripField>
                          <TripField
                            label={t("trips:overview.destination.city.label")}
                            htmlFor="create-destination-city"
                          >
                            <Input
                              id="create-destination-city"
                              dir="auto"
                              placeholder={t(
                                "trips:overview.destination.city.placeholder"
                              )}
                              {...register("destination.cityId")}
                            />
                          </TripField>
                        </div>
                      )}
                    </div>
                  </TripField>

                  <TripField
                    label={t("trips:create.availability.label")}
                    htmlFor="create-availability"
                    error={errors.availabilityMode?.message}
                  >
                    <NativeSelect
                      id="create-availability"
                      aria-label={t("trips:create.availability.label")}
                      {...register("availabilityMode")}
                    >
                      {availabilityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </TripField>

                  <TripField
                    label={t("trips:create.duration.label")}
                    htmlFor="create-duration"
                  >
                    <DurationInput
                      format={format}
                      isCustomQuote={availabilityMode === "custom_quote"}
                      days={days}
                      nights={nights}
                      hours={hours}
                      isFlexible={isFlexible}
                      daysRegister={register("days", {
                        setValueAs: optionalNumber,
                      })}
                      nightsRegister={register("nights", {
                        setValueAs: optionalNumber,
                      })}
                      hoursRegister={register("hours", {
                        setValueAs: optionalNumber,
                      })}
                      onFlexibleChange={(value) =>
                        form.setValue("isFlexible", value)
                      }
                      errors={errors}
                    />
                  </TripField>
                </div>
              </Drawer.Content>

              <footer className="flex items-center justify-end gap-2 border-t border-border p-4 sm:px-6">
                <Drawer.Close
                  type="button"
                  disabled={creating}
                  render={<Button variant="ghost" />}
                >
                  {t("trips:create.cancel")}
                </Drawer.Close>
                <Button type="submit" disabled={creating}>
                  {creating
                    ? t("trips:create.submitting")
                    : t("trips:create.submit")}
                </Button>
              </footer>
            </form>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}