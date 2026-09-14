import type { ReactNode } from "react"

type AgencySectionHeadingProps = {
  children: ReactNode
  helper?: string
}

/**
 * Agency-owned section heading (compact label + hairline rule + optional
 * helper). Kept local: the Agency feature must not import Trips-owned UI.
 */
export function AgencySectionHeading({
  children,
  helper,
}: AgencySectionHeadingProps) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-foreground">{children}</h2>
        <div className="h-px flex-1 bg-border" aria-hidden />
      </div>
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  )
}