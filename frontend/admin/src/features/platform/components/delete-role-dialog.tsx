import { useEffect } from "react"
import { Loader2Icon, Trash2Icon } from "lucide-react"

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
import { useDeleteRole } from "../hooks/use-delete-role"
import { useSessionExpiryRedirect } from "../hooks/use-session-expiry-redirect"
import { getRbacErrorMessage } from "../lib/rbac-errors"
import type { PlatformRole } from "../types/rbac.types"

export type DeleteRoleDialogProps = {
  role: PlatformRole
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteRoleDialog({
  role,
  open,
  onOpenChange,
}: DeleteRoleDialogProps) {
  const mutation = useDeleteRole()
  const redirectOnSessionExpiry = useSessionExpiryRedirect()

  useEffect(() => {
    if (mutation.isError) {
      redirectOnSessionExpiry(mutation.error)
    }
  }, [mutation.isError, mutation.error, redirectOnSessionExpiry])

  const errorMessage = mutation.isError
    ? getRbacErrorMessage("delete-role", mutation.error)
    : undefined

  const handleDelete = () => {
    mutation.mutate(role.id, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete &ldquo;{role.name}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the role. This action cannot be undone.
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
            variant="destructive"
            disabled={mutation.isPending}
            onClick={handleDelete}
          >
            {mutation.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <Trash2Icon />
            )}
            Delete role
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
