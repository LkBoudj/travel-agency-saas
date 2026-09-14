import { ImagePlus, Plus, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { TripEditor } from "../hooks/use-trip-editor"
import { SectionHeading } from "./section-heading"

type TripMediaSectionProps = Pick<TripEditor, "form" | "fieldArrays">

/**
 * Media foundation. URL inputs only — a future uploader will produce URLs.
 * No uploads are faked here.
 */
export function TripMediaSection({ form, fieldArrays }: TripMediaSectionProps) {
  const { t } = useTranslation()
  const { register } = form
  const { gallery } = fieldArrays

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <SectionHeading helper={t("trips:media.cover.helper")}>
          {t("trips:media.cover.title")}
        </SectionHeading>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-4">
          <span className="flex size-16 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
            <ImagePlus className="size-6" aria-hidden />
          </span>
          <div className="grid min-w-40 flex-1 gap-1.5">
            <span className="text-xs text-muted-foreground">
              {t("trips:media.cover.hint")}
            </span>
            <Input
              dir="ltr"
              placeholder={t("trips:media.urlPlaceholder")}
              aria-label={t("trips:media.cover.urlAria")}
              {...register("coverImageUrl")}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <SectionHeading helper={t("trips:media.gallery.helper")}>
          {t("trips:media.gallery.title")}
        </SectionHeading>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {gallery.fields.map((image, index) => (
            <div key={image.id} className="flex items-center gap-2">
              <Input
                dir="ltr"
                placeholder={t("trips:media.urlPlaceholder")}
                aria-label={t("trips:media.gallery.urlAria", {
                  n: index + 1,
                })}
                {...register(`gallery.${index}.url`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("trips:media.gallery.removeAria", {
                  n: index + 1,
                })}
                onClick={() => gallery.remove(index)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
          {gallery.fields.length === 0 && (
            <p className="col-span-full rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              {t("trips:media.gallery.empty")}
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-self-start text-primary"
          onClick={() => gallery.append({ url: "" })}
        >
          <Plus className="size-4" />
          {t("trips:media.addImage")}
        </Button>
      </div>
    </div>
  )
}