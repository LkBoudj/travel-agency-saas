import { Loader2Icon } from "lucide-react"

/** Neutral full-height loader used while a route guard resolves. */
export function FullPageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-svh items-center justify-center"
    >
      <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
      <span className="sr-only">Loading</span>
    </div>
  )
}
