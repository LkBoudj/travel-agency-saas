import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"

import { ROUTES } from "@/app/router/route-paths"
import { AUTH_QUERY_KEY, login } from "../api/auth.api"
import { getAuthErrorMessage } from "../lib/auth-errors"
import {
  createLoginSchema,
  type LoginFormValues,
} from "../schemas/login.schema"

/**
 * Login flow.
 *
 * Navigation happens only after the backend has actually authenticated the
 * request and set its HttpOnly session cookie — there is no development
 * shortcut and no client-side session state. The landing route is the agency
 * chooser, which decides where to go based on the user's memberships.
 */
export function useLogin() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const resolver = useMemo(() => zodResolver(createLoginSchema(t)), [t])

  const form = useForm<LoginFormValues>({
    resolver,
    defaultValues: { email: "", password: "" },
  })

  const mutation = useMutation({
    mutationFn: (values: LoginFormValues) =>
      login({ email: values.email, password: values.password }),
    onSuccess: (user) => {
      // Seed the session cache so the guards do not refetch before redirecting.
      queryClient.setQueryData(AUTH_QUERY_KEY, user)
      navigate(ROUTES.agencies, { replace: true })
    },
  })

  const handleSubmit = form.handleSubmit((values) => {
    mutation.mutate(values)
  })

  const errorMessage = mutation.isError
    ? getAuthErrorMessage(mutation.error)
    : undefined

  return {
    form,
    handleSubmit,
    isPending: mutation.isPending,
    errorMessage,
  }
}
