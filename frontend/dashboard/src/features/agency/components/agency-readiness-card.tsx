import { CheckCircle2, Circle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useAgency } from "../hooks/use-agency"

/**
 * Public Profile Readiness summary. Semantically derived in the domain
 * (computeAgencyPublicProfileReadiness); labels are resolved via i18next.
 */
export function AgencyReadinessCard() {
  const { t } = useTranslation()
  const { readiness } = useAgency()

  if (!readiness) return null

  const done = readiness.required.filter((item) => item.satisfied).length
  const total = readiness.required.length

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">
          {t("agency:readiness.title")}
        </h3>
        <span className="text-xs text-muted-foreground">
          {readiness.isComplete
            ? t("agency:readiness.complete")
            : t("agency:readiness.progress", { done, total })}
        </span>
      </div>

      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {readiness.required.map((item) => (
          <li
            key={item.key}
            className="flex items-center gap-2 text-xs text-foreground"
          >
            {item.satisfied ? (
              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <Circle className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <span className="truncate">{t(item.labelKey)}</span>
          </li>
        ))}
      </ul>

      {readiness.recommended.length > 0 && (
        <>
          <div className="my-3 h-px bg-border" aria-hidden />
          <p className="text-xs font-medium text-muted-foreground">
            {t("agency:readiness.recommended")}
          </p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {readiness.recommended.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                {item.satisfied ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <Circle className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <span className="truncate">{t(item.labelKey)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}