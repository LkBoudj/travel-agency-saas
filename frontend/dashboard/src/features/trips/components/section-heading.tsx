import type { ReactNode } from "react"

type SectionHeadingProps = {
  children: ReactNode
  helper?: string
}

/**
 * Consistent section heading used inside the trip editor: a compact label
 * with a hairline rule, plus optional helper text.
 */
export function SectionHeading({ children, helper }: SectionHeadingProps) {
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