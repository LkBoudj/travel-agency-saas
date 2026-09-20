import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"

import { ROUTES } from "@/app/router/route-paths"
import { logout } from "../api/auth.api"

/**
 * Ends the session and clears every cached query.
 *
 * The whole cache is dropped on purpose: it holds agency-scoped data for
 * whoever was signed in, and none of it may survive into the next session.
 */
export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: logout,
    onSettled: async () => {
      queryClient.clear()
      navigate(ROUTES.login, { replace: true })
    },
  })
}
