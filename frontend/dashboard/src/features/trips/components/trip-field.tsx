import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"

type TripFieldProps = {
  label: string
  htmlFor: string
  error?: string
  helper?: string
  children: ReactNode
}

/** Label + control + inline error/helper wrapper used across trip sections. */
export function TripField({
  label,
  htmlFor,
  error,
  helper,
  children,
}: TripFieldProps) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : helper ? (
        <p className="text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  )
}
