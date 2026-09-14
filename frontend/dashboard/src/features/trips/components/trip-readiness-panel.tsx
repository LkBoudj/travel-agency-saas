import { Check, Circle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { NativeSelect } from "@/components/ui/native-select"
import { useTripEditorStore } from "@/stores/trip-editor.store"
import { computePublishReadiness } from "../domain/trip-readiness"
import type { TripEditor } from "../hooks/use-trip-editor"
import { SectionHeading } from "./section-heading"
import { TripField } from "./trip-field"

const REQUIRED_LABELS: Record<string, string> = {
  name: "trips:readiness.items.name",
  destination: "trips:readiness.items.destination",
  shortDescription: "trips:readiness.items.shortDescription",
  coverImage: "trips:readiness.items.coverImage",
  pricing: "trips:readiness.items.pricing",
  availability: "trips:readiness.items.availability",
}

const RECOMMENDED_LABELS: Record<string, string> = {
  meetingInstructions: "trips:readiness.recommended.meetingInstructions",
  themes: "trips:readiness.recommended.themes",
  itinerary: "trips:readiness.recommended.itinerary",
}

/**
 * Side rail card: Trip Status + publish readiness. Progress counts the
 * required items only; canPublish is displayed as a plain summary, never
 * auto-enforcing an unpublish (published-but-incomplete saves are guarded at
 * the footer).
 */
export function TripReadinessPanel({ editor }: { editor: TripEditor }) {
  const { t } = useTranslation()
  const { register } = editor.form
  const draft = useTripEditorStore((state) => state.draft)

  const readiness = draft
    ? computePublishReadiness(draft)
    : { required: [], recommended: [], canPublish: false }
  const completed = readiness.required.filter((item) => item.satisfied).length

  return (
    <section className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <SectionHeading>{t("trips:readiness.title")}</SectionHeading>

      <TripField
        label={t("trips:overview.status.label")}
        htmlFor="status"
      >
        <NativeSelect
          id="status"
          aria-label={t("trips:overview.status.label")}
          {...register("status")}
        >
          <option value="draft">{t("trips:status.draft")}</option>
          <option value="published">{t("trips:status.published")}</option>
          <option value="archived">{t("trips:status.archived")}</option>
        </NativeSelect>
      </TripField>

      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium">
            {t("trips:readiness.progress.label")}
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {t("trips:readiness.progress.count", {
              completed,
              total: readiness.required.length,
            })}
          </p>
        </div>

        <div
          aria-hidden
          className="h-1 rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary/70 transition-[width] duration-300"
            style={{
              width: `${readiness.required.length ? (completed / readiness.required.length) * 100 : 0}%`,
            }}
          />
        </div>

        <ul className="grid gap-1">
          {readiness.required.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              {item.satisfied ? (
                <Check
                  className="size-3.5 shrink-0 text-primary"
                  aria-hidden
                />
              ) : (
                <Circle className="size-3.5 shrink-0" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                {t(REQUIRED_LABELS[item.key])}
              </span>
              <span className="sr-only">
                {item.satisfied
                  ? t("trips:readiness.progress.completedItem")
                  : t("trips:readiness.progress.incompleteItem")}
              </span>
            </li>
          ))}
        </ul>

        {readiness.recommended.length > 0 && (
          <div className="grid gap-1 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("trips:readiness.recommended.title")}
            </p>
            <ul className="grid gap-1">
              {readiness.recommended.map((item) => (
                <li
                  key={item.key}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  {item.satisfied ? (
                    <Check
                      className="size-3.5 shrink-0 text-primary/70"
                      aria-hidden
                    />
                  ) : (
                    <Circle
                      className="size-3.5 shrink-0 text-muted-foreground/60"
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    {t(RECOMMENDED_LABELS[item.key])}
                  </span>
                  <span className="sr-only">
                    {item.satisfied
                      ? t("trips:readiness.progress.completedItem")
                      : t("trips:readiness.progress.incompleteItem")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}