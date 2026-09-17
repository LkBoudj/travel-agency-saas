import { Loader2Icon } from "lucide-react"

export function AuthPending() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      <span className="sr-only">Checking session</span>
    </div>
  )
}