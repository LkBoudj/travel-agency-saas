import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

type AgencySectionActionsProps = {
  isDirty: boolean
  isSaving: boolean
}

/**
 * Section-level save bar: explicit Save (disabled while clean or saving) plus
 * a "dirty" cue. Nothing auto-saves — the section's own form slice is the
 * only thing persisted when Save is pressed. The button submits the section's
 * `<form onSubmit={save}>`.
 */
export function AgencySectionActions({ isDirty, isSaving }: AgencySectionActionsProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-3 border-t border-border pt-3">
      <Button type="submit" size="sm" disabled={!isDirty || isSaving}>
        {isSaving ? t("agency:actions.saving") : t("agency:actions.save")}
      </Button>
      {isDirty && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden className="size-1.5 rounded-full bg-primary" />
          {t("agency:actions.unsaved")}
        </span>
      )}
    </div>
  )
}