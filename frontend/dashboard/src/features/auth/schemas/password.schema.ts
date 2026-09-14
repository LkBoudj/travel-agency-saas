import type { TFunction } from "i18next"
import { z } from "zod"

/**
 * Shared account password policy — single source of truth.
 * Consumed by Register, Reset Password, and any future password flows so the
 * policy never drifts into contradictory rules. Messages are localized.
 */
export function createPasswordSchema(t: TFunction) {
  return z
    .string()
    .min(8, t("auth:validation.passwordMin"))
    .regex(/[A-Za-z]/, t("auth:validation.passwordLetter"))
    .regex(/\d/, t("auth:validation.passwordNumber"))
}