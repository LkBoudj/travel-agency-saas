import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useForm, useWatch } from "react-hook-form"
import {
  createRegisterSchema,
  type RegisterFormValues,
} from "../schemas/register.schema"

/**
 * Register flow orchestration (account step).
 * Wire a real account-creation mutation through `onSubmit` later — no backend yet.
 */
export function useRegister(onSubmit?: (data: RegisterFormValues) => void) {
  const { t } = useTranslation()

  const resolver = useMemo(() => zodResolver(createRegisterSchema(t)), [t])

  const form = useForm<RegisterFormValues>({
    resolver,
    defaultValues: { email: "", password: "" },
  })

  const password = useWatch({ name: "password", control: form.control })
  const handleSubmit = form.handleSubmit((data) => onSubmit?.(data))

  return { form, password, handleSubmit }
}