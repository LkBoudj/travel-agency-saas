import { Dialog } from "@base-ui/react/dialog"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  destructive?: boolean
}

/**
 * Shared confirmation dialog (Base UI Dialog). Used for destructive or
 * significant actions that must be explicitly confirmed before persisting —
 * e.g. publishing a structurally incomplete trip, or switching format/scope.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  destructive,
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup
          role="alertdialog"
          className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-lg outline-none sm:inset-x-auto sm:left-1/2 sm:right-auto sm:-translate-x-1/2 rtl:sm:left-auto rtl:sm:right-1/2 rtl:sm:translate-x-1/2"
        >
          <Dialog.Title className="text-sm font-semibold">{title}</Dialog.Title>
          <Dialog.Description
            className={
              destructive
                ? "mt-1.5 text-sm text-destructive"
                : "mt-1.5 text-sm text-muted-foreground"
            }
          >
            {description}
          </Dialog.Description>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Dialog.Close render={<Button variant="ghost" />}>
              {cancelLabel}
            </Dialog.Close>
            <Button
              variant={destructive ? "destructive" : "default"}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
          <Dialog.Close className="sr-only" aria-label={t("common:close")} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}