import type { AppLocale } from "@/i18n"
import { buttonVariants } from "@/components/ui/button"
import { ArrowDown, ArrowUp, Check, ChevronDown, Plus, X } from "lucide-react"
import type { ButtonHTMLAttributes } from "react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type {
  Control,
  FieldErrors,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form"
import { cn } from "cn"
import type { TripFormValues } from "../schemas/trip.schema"
import type { GeographicScope, TripLocationDraft } from "../types/trip.types"
import { resolveTripLocationLabel } from "../utils/format-trip-location"
import {
  TripLocationFields,
  type TripLocationPath,
} from "./trip-location-fields"

type DestinationEditorProps = {
  isCircuit: boolean
  scope: GeographicScope | ""
  locale: AppLocale
  control: Control<TripFormValues>
  register: UseFormRegister<TripFormValues>
  setValue: UseFormSetValue<TripFormValues>
  errors: FieldErrors<TripFormValues>["destinations"]
  destinations: TripLocationDraft[]
  append: UseFieldArrayAppend<TripFormValues, "destinations">
  remove: UseFieldArrayRemove
  swap: (from: number, to: number) => void
}

/**
 * Destination editor for the "Route & duration" section.
 *
 * - Single destination: inline structured fields, no chrome.
 * - Circuit: an ordered list with progressive disclosure — closed compact
 *   summary rows expand into an editor on demand. Order = travel order and is
 *   preserved by array index alone (no surrogate ordering field).
 */
export function DestinationEditor({
  isCircuit,
  scope,
  locale,
  control,
  register,
  setValue,
  errors,
  destinations,
  append,
  remove,
  swap,
}: DestinationEditorProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState<number | null>(null)

  if (!isCircuit) {
    const firstErrors = errors?.[0]
    return (
      <TripLocationFields
        basePath="destinations.0"
        kind="destination"
        scope={scope}
        locale={locale}
        control={control}
        register={register}
        setValue={setValue}
        errors={{
          wilayaCode: firstErrors?.wilayaCode?.message,
          cityId: firstErrors?.cityId?.message,
          place: firstErrors?.place?.message,
        }}
      />
    )
  }

  const maxSteps = 24

  return (
    <div className="space-y-2">
      <ol className="flex flex-col gap-2">
        {destinations.map((destination, index) => {
          const isOpen = expanded === index
          const basePath = `destinations.${index}` as TripLocationPath
          const label = resolveTripLocationLabel(destination, locale)
          const stepErrors = errors?.[index]

          const rhfErrors = {
            wilayaCode: stepErrors?.wilayaCode?.message,
            cityId: stepErrors?.cityId?.message,
            place: stepErrors?.place?.message,
          }

          return (
            <li
              key={`dest-${index}`}
              className={cn(
                "flex items-start gap-1.5 rounded-lg border border-border bg-card p-1.5",
                isOpen && "ring-1 ring-ring"
              )}
            >
              <span
                aria-hidden
                className="flex size-6 flex-none items-center justify-center rounded-full border text-[11px] font-semibold text-muted-foreground"
              >
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                {isOpen ? (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {t("trips:overview.destination.stepLabel", {
                          n: index + 1,
                        })}
                      </p>
                      <span className="flex flex-none items-center gap-0.5">
                        <IconButton
                          aria-label={t("trips:overview.destination.removeAria", {
                            n: index + 1,
                          })}
                          disabled={destinations.length <= 1}
                          onClick={() => {
                            remove(index)
                            setExpanded((current) =>
                              current === index ? null : current
                            )
                          }}
                        >
                          <X className="size-3.5" />
                        </IconButton>
                        <IconButton
                          aria-label={t("trips:overview.destination.doneAria", {
                            n: index + 1,
                          })}
                          onClick={() => setExpanded(null)}
                        >
                          <Check className="size-3.5" />
                        </IconButton>
                      </span>
                    </div>
                    <div className="mt-2">
                      <TripLocationFields
                        basePath={basePath}
                        kind="destination"
                        scope={scope}
                        locale={locale}
                        control={control}
                        register={register}
                        setValue={setValue}
                        errors={rhfErrors}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label={t("trips:overview.destination.editAria", {
                      n: index + 1,
                    })}
                    className="flex h-8 w-full min-w-0 items-center gap-2 rounded-md px-2 text-start transition-colors hover:bg-muted/60"
                    onClick={() => setExpanded(index)}
                  >
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm",
                        !label && "text-muted-foreground"
                      )}
                    >
                      {label || t("trips:overview.destination.emptySummary")}
                    </span>
                    <ChevronDown className="size-4 flex-none text-muted-foreground" />
                  </button>
                )}
              </div>

              {!isOpen && (
                <span className="flex flex-none flex-col pe-0.5">
                  <IconButton
                    aria-label={t("trips:overview.destination.moveUpAria", {
                      n: index + 1,
                    })}
                    disabled={index === 0}
                    onClick={() => {
                      swap(index, index - 1)
                      setExpanded((current) =>
                        current === index ? index - 1 : current
                      )
                    }}
                  >
                    <ArrowUp className="size-3.5" />
                  </IconButton>
                  <IconButton
                    aria-label={t("trips:overview.destination.moveDownAria", {
                      n: index + 1,
                    })}
                    disabled={index === destinations.length - 1}
                    onClick={() => {
                      swap(index, index + 1)
                      setExpanded((current) =>
                        current === index ? index + 1 : current
                      )
                    }}
                  >
                    <ArrowDown className="size-3.5" />
                  </IconButton>
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {destinations.length < maxSteps && (
        <button
          type="button"
          onClick={() => {
            append({ wilayaCode: "", cityId: "", place: "" })
            setExpanded(destinations.length)
          }}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-8 w-full justify-start gap-2 border-dashed font-normal text-muted-foreground"
          )}
        >
          <Plus className="size-4" />
          {t("trips:overview.destination.add")}
        </button>
      )}
    </div>
  )
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

function IconButton({ className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 sm:size-6",
        className
      )}
      {...rest}
    >
      {rest.children}
    </button>
  )
}