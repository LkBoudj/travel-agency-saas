import { useEffect } from "react"
import { BanIcon, Loader2Icon, RotateCcwIcon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useSetPlatformUserStatus } from "../hooks/use-set-platform-user-status"
import { useSessionExpiryRedirect } from "../hooks/use-session-expiry-redirect"
import { getPlatformUserErrorMessage } from "../lib/platform-user-errors"
import { userDisplayName } from "../lib/platform-user"
import type {
  PlatformUser,
  PlatformUserStatus,
} from "../types/platform-user.types"

export type SetUserStatusDialogProps = {
  user: PlatformUser
  /** Target status to apply: SUSPENDED suspends, ACTIVE reactivates. */
  status: PlatformUserStatus
  open: boolean
  onSuccess?: (message: string) => void
  onOpenChange: (open: boolean) => void
}

export function SetUserStatusDialog({
  user,
  status,
  open,
  onSuccess,
  onOpenChange,
}: SetUserStatusDialogProps) {
  const suspending = status === "SUSPENDED"
  const mutation = useSetPlatformUserStatus(user.code)
  const redirectOnSessionExpiry = useSessionExpiryRedirect()

  useEffect(() => {
    if (mutation.isError) {
      redirectOnSessionExpiry(mutation.error)
    }
  }, [mutation.isError, mutation.error, redirectOnSessionExpiry])

  const errorMessage = mutation.isError
    ? getPlatformUserErrorMessage("set-status", mutation.error)
    : undefined

  const name = userDisplayName(user)

  const handleConfirm = () => {
    mutation.mutate(status, {
      onSuccess: () => {
        onSuccess?.(suspending ? "User suspended." : "User reactivated.")
        onOpenChange(false)
      },
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            {suspending ? <BanIcon /> : <RotateCcwIcon />}
          </AlertDialogMedia>
          <AlertDialogTitle>
            {suspending ? `Suspend ${name}?` : `Reactivate ${name}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {suspending
              ? "The user will no longer be able to sign in. Existing sessions are revoked."
              : "This restores sign-in access immediately."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {errorMessage ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant={suspending ? "destructive" : undefined}
            disabled={mutation.isPending}
            onClick={handleConfirm}
          >
            {mutation.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : suspending ? (
              <BanIcon />
            ) : (
              <RotateCcwIcon />
            )}
            {suspending ? "Suspend user" : "Reactivate user"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}