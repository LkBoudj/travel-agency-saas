import { useTranslation } from "react-i18next"

/**
 * Password strength indicator.
 * Scores a password and renders a segmented bar + label.
 */

export type PasswordStrengthLevel = "weak" | "fair" | "good" | "strong"

const LEVELS: PasswordStrengthLevel[] = ["weak", "fair", "good", "strong"]

const FILLED_COUNT: Record<PasswordStrengthLevel, number> = {
  weak: 1,
  fair: 2,
  good: 3,
  strong: 4,
}

const LEVEL_BAR_CLASS: Record<PasswordStrengthLevel, string> = {
  weak: "bg-destructive",
  fair: "bg-amber-500",
  good: "bg-emerald-500",
  strong: "bg-emerald-500",
}

function getPasswordStrengthLevel(password: string): PasswordStrengthLevel {
  let score = 0
  if (password.length >= 8) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return LEVELS[Math.min(score, LEVELS.length - 1)]
}

export function PasswordStrength({ value }: { value: string }) {
  const { t } = useTranslation()

  if (!value) return null

  const level = getPasswordStrengthLevel(value)
  const barClass = LEVEL_BAR_CLASS[level]

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {LEVELS.map((item, index) => (
          <div
            key={item}
            className={`h-1 flex-1 rounded-full ${
              index < FILLED_COUNT[level] ? barClass : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {t(`auth:passwordStrength.${level}`)}
      </p>
    </div>
  )
}