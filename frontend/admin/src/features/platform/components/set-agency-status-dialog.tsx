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
import { useSetAgencyStatus } from "../hooks/use-set-agency-status"
import { useSessionExpiryRedirect } from "../hooks/use-session-expiry-redirect"
import { getAgencyErrorMessage } from "../lib/agency-errors"
import type { Agency, AgencyDetails, AgencyStatus } from "../types/agency.types"

export type SetAgencyStatusDialogProps = {
  agency: Agency
  /** Target status to apply: SUSPENDED suspends, ACTIVE reactivates. */
  status: AgencyStatus
  open: boolean
  onSuccess?: (message: string, agency: AgencyDetails) => void
  onOpenChange: (open: boolean) => void
}

/**
 * Confirms suspending or reactivating the BUSINESS.
 *
 * The copy is explicit that this is not owner suspension: the owner keeps their
 * account and their membership, and the request carries the agency status only.
 */
export function SetAgencyStatusDialog({
  agency,
  status,
  open,
  onSuccess,
  onOpenChange,
}: SetAgencyStatusDialogProps) {
  const suspending = status === "SUSPENDED"
  const mutation = useSetAgencyStatus(agency.code)
  const redirectOnSessionExpiry = useSessionExpiryRedirect()

  useEffect(() => {
    if (mutation.isError) {
      redirectOnSessionExpiry(mutation.error)
    }
  }, [mutation.isError, mutation.error, redirectOnSessionExpiry])

  const errorMessage = mutation.isError
    ? getAgencyErrorMessage("set-agency-status", mutation.error)
    : undefined

  const handleConfirm = () => {
    mutation.mutate(status, {
      onSuccess: (updated) => {
        onSuccess?.(
          suspending ? "Agency suspended." : "Agency reactivated.",
          updated
        )
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
            {suspending
              ? `Suspend ${agency.name}?`
              : `Reactivate ${agency.name}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {suspending
              ? "This suspends the agency as a business. Its owner keeps their account and stays the active owner — suspending a person is a separate action."
              : "This puts the agency back into normal operation."}
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
            {suspending ? "Suspend agency" : "Reactivate agency"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
