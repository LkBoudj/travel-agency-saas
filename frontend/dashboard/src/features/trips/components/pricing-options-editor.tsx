import { Plus, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Controller } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { PRICING_BASIS_LABELS } from "../types/trip.types"
import type { TripEditor } from "../hooks/use-trip-editor"
import { SectionHeading } from "./section-heading"
import { TripField } from "./trip-field"

type PricingOptionsEditorProps = Pick<TripEditor, "form" | "fieldArrays">

/**
 * Customer/pricing categories. No final prices here — those belong on each
 * departure's price rows.
 */
export function PricingOptionsEditor({
  form,
  fieldArrays,
}: PricingOptionsEditorProps) {
  const { t } = useTranslation()
  const {
    register,
    control,
    formState: { errors },
  } = form
  const { pricingOptions } = fieldArrays

  const basisOptions = Object.entries(PRICING_BASIS_LABELS)

  return (
    <div className="grid gap-4">
      <SectionHeading helper={t("trips:pricingEditor.helper")}>
        {t("trips:pricingEditor.title")}
      </SectionHeading>

      {pricingOptions.fields.length === 0 && (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {t("trips:pricingEditor.empty", {
            name: t("trips:pricingEditor.namePlaceholder"),
            alternate: t("trips:pricingEditor.childPlaceholder"),
          })}
        </p>
      )}

      {pricingOptions.fields.map((option, index) => {
        const optionErrors = errors.pricingOptions?.[index]
        return (
          <div key={option.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <Input
                placeholder={t("trips:pricingEditor.namePlaceholder")}
                aria-label={t("trips:pricingEditor.nameAria", {
                  n: index + 1,
                })}
                className="max-w-xs"
                {...register(`pricingOptions.${index}.name`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("trips:pricingEditor.removeAria", {
                  n: index + 1,
                })}
                onClick={() => pricingOptions.remove(index)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <TripField
                label={t("trips:pricingEditor.descriptionLabel")}
                htmlFor={`pricingOptions.${index}.description`}
              >
                <Textarea
                  id={`pricingOptions.${index}.description`}
                  rows={2}
                  placeholder={t("trips:pricingEditor.descriptionPlaceholder")}
                  {...register(`pricingOptions.${index}.description`)}
                />
              </TripField>

              <div className="flex items-end gap-4">
                <TripField
                  label={t("trips:pricingEditor.basisLabel")}
                  htmlFor={`pricingOptions.${index}.basis`}
                >
                  <NativeSelect
                    id={`pricingOptions.${index}.basis`}
                    className="w-36"
                    {...register(`pricingOptions.${index}.basis`)}
                  >
                    {basisOptions.map(([value, labelKey]) => (
                      <option key={value} value={value}>
                        {t(labelKey)}
                      </option>
                    ))}
                  </NativeSelect>
                </TripField>

                <label className="flex items-center gap-2 pb-1.5 text-sm">
                  <Controller
                    control={control}
                    name={`pricingOptions.${index}.active`}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  {t("trips:pricingEditor.activeLabel")}
                </label>
              </div>
            </div>

            {optionErrors?.name?.message && (
              <p className="mt-2 text-xs text-destructive">
                {optionErrors.name.message}
              </p>
            )}
          </div>
        )
      })}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-self-start text-primary"
        onClick={() =>
          pricingOptions.append({
            name: "",
            description: "",
            basis: "per_person",
            active: true,
          })
        }
      >
        <Plus className="size-4" />
        {t("trips:pricingEditor.add")}
      </Button>
    </div>
  )
}