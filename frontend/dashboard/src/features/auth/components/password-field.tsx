import { useState, type ComponentProps, type ReactNode } from "react"
import { cn } from "cn"
import { Eye, EyeOff } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordStrength } from "./password-strength"

type PasswordFieldProps = Omit<ComponentProps<"input">, "type"> & {
  id: string
  label: string
  error?: string
  showStrength?: boolean
  /** Optional element rendered inline with the label, e.g. a "Forgot password?" link. */
  labelAction?: ReactNode
}

/** Password input with show/hide toggle, inline error, and optional strength meter. */
export function PasswordField({
  id,
  label,
  error,
  showStrength = false,
  labelAction,
  className,
  ...props
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false)
  const { t } = useTranslation()

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {labelAction}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={isVisible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="pe-9"
          {...props}
        />
        <button
          type="button"
          aria-label={
            isVisible
              ? t("auth:passwordField.hidePassword")
              : t("auth:passwordField.showPassword")
          }
          onClick={() => setIsVisible((prev) => !prev)}
          className="absolute top-1/2 end-2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          {isVisible ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </button>
      </div>
      {showStrength && <PasswordStrength value={String(props.value ?? "")} />}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}