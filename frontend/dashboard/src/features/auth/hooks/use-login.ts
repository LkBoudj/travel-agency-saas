import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { ROUTES } from "@/app/router/route-paths"
import {
  createLoginSchema,
  type LoginFormValues,
} from "../schemas/login.schema"
import { isDemoLogin } from "../utils/demo-login"

/**
 * Login flow orchestration.
 *
 * Development-only: `demo@travel-saas.test` with any password jumps straight
 * to `/dashboard` in dev builds. Wire the real authentication mutation into
 * `onSubmit` later (server errors, navigation after a successful login, etc.).
 */
export function useLogin(onSubmit?: (data: LoginFormValues) => void) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const resolver = useMemo(() => zodResolver(createLoginSchema(t)), [t])

  const form = useForm<LoginFormValues>({
    resolver,
    defaultValues: { email: "", password: "" },
  })

  const handleSubmit = form.handleSubmit((data) => {
    /**
     * Development-only demo authentication: reach `/dashboard` before the real
     * backend exists. Inert in production builds (see utils/demo-login).
     */
    if (isDemoLogin(data.email, data.password)) {
      navigate(ROUTES.dashboard)
      return
    }

    onSubmit?.(data)
  })

  return { form, handleSubmit }
}