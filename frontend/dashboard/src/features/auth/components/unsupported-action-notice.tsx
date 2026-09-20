import { InfoIcon } from "lucide-react"

/**
 * Says plainly that a guest flow has no backend behind it yet.
 *
 * These screens exist in the routing already, so rather than leaving them
 * looking functional — or, worse, faking a success toast — they state the
 * truth: the action cannot complete. Accounts are created by an agency owner
 * through member management today.
 */
export function UnsupportedActionNotice({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground"
    >
      <InfoIcon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
