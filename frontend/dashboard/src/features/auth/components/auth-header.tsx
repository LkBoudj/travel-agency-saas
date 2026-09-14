import { Plane } from "lucide-react"

type AuthHeaderProps = {
  title: string
  description?: string
  /** e.g. "Step 1 of 2" — shown above the title as a small badge. */
  step?: string
}

/** Brand mark, optional step badge, title and description for auth screens. */
export function AuthHeader({ title, description, step }: AuthHeaderProps) {
  return (
    <div className="space-y-5">
      <div className="flex size-10 items-center justify-center rounded-lg border bg-background shadow-sm">
        <Plane className="size-5 text-primary" aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        {step && (
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {step}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
