import { ChevronDown, ChevronUp, Plus, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { TripEditor } from "../hooks/use-trip-editor"
import { TripField } from "./trip-field"

type ItineraryEditorProps = Pick<TripEditor, "form" | "fieldArrays">

/** Stacked, compact day cards for the trip itinerary. */
export function ItineraryEditor({ form, fieldArrays }: ItineraryEditorProps) {
  const { t } = useTranslation()
  const {
    register,
    formState: { errors },
  } = form
  const { itinerary } = fieldArrays

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{t("trips:itinerary.intro")}</p>

      {itinerary.fields.map((day, index) => {
        const dayErrors = errors.itinerary?.[index]
        return (
          <div key={day.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {t("trips:itinerary.dayLabel", { n: index + 1 })}
              </h3>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("trips:itinerary.moveUpAria", { n: index + 1 })}
                  disabled={index === 0}
                  onClick={() => itinerary.move(index, index - 1)}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("trips:itinerary.moveDownAria", {
                    n: index + 1,
                  })}
                  disabled={index === itinerary.fields.length - 1}
                  onClick={() => itinerary.move(index, index + 1)}
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("trips:itinerary.removeAria", { n: index + 1 })}
                  onClick={() => itinerary.remove(index)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            <div className="mt-3 grid gap-3">
              <TripField
                label={t("trips:itinerary.titleLabel")}
                htmlFor={`itinerary.${index}.title`}
                error={dayErrors?.title?.message}
              >
                <Input
                  id={`itinerary.${index}.title`}
                  placeholder={t("trips:itinerary.titlePlaceholder")}
                  {...register(`itinerary.${index}.title`)}
                />
              </TripField>

              <TripField
                label={t("trips:itinerary.locationLabel")}
                htmlFor={`itinerary.${index}.location`}
                error={dayErrors?.location?.message}
              >
                <Input
                  id={`itinerary.${index}.location`}
                  placeholder={t("trips:itinerary.locationPlaceholder")}
                  {...register(`itinerary.${index}.location`)}
                />
              </TripField>

              <TripField
                label={t("trips:itinerary.descriptionLabel")}
                htmlFor={`itinerary.${index}.description`}
              >
                <Textarea
                  id={`itinerary.${index}.description`}
                  rows={3}
                  placeholder={t("trips:itinerary.descriptionPlaceholder")}
                  {...register(`itinerary.${index}.description`)}
                />
              </TripField>
            </div>
          </div>
        )
      })}

      <Button
        type="button"
        variant="outline"
        className="justify-self-start"
        onClick={() =>
          itinerary.append({ title: "", location: "", description: "" })
        }
      >
        <Plus className="size-4" />
        {t("trips:itinerary.add")}
      </Button>
    </div>
  )
}