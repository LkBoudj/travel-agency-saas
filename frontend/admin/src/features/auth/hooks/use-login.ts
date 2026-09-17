import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useLocation, useNavigate } from "react-router-dom"

import { AUTH_QUERY_KEY, getCurrentUser, login } from "../api/auth.api"
import type { LoginCredentials } from "../types/auth.types"

export const DEFAULT_AUTHENTICATED_PATH = "/overview"

export function useLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const redirectTo =
    (location.state as { from?: string } | null)?.from ??
    DEFAULT_AUTHENTICATED_PATH

  const mutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => login(credentials),
    onSuccess: async () => {
      await queryClient.fetchQuery({
        queryKey: AUTH_QUERY_KEY,
        queryFn: getCurrentUser,
      })
      const destination = redirectTo.startsWith("/")
        ? redirectTo
        : DEFAULT_AUTHENTICATED_PATH
      navigate(destination, { replace: true })
    },
  })

  return {
    ...mutation,
    redirectTo,
  }
}