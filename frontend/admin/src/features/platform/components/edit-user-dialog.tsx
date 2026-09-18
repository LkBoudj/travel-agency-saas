import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useUpdatePlatformUser } from "../hooks/use-update-platform-user"
import { useSessionExpiryRedirect } from "../hooks/use-session-expiry-redirect"
import { getPlatformUserErrorMessage } from "../lib/platform-user-errors"
import {
  updatePlatformUserFormSchema,
  type UpdatePlatformUserFormValues,
} from "../schemas/platform-user-form.schema"
import type { PlatformUser } from "../types/platform-user.types"

export type EditUserDialogProps = {
  user: PlatformUser
  open: boolean
  onSuccess?: (message: string, user: PlatformUser) => void
  onOpenChange: (open: boolean) => void
}

export function EditUserDialog({
  user,
  open,
  onSuccess,
  onOpenChange,
}: EditUserDialogProps) {
  const updateUser = useUpdatePlatformUser(user.code)
  const redirectOnSessionExpiry = useSessionExpiryRedirect()

  const { register, handleSubmit, formState } = useForm<UpdatePlatformUserFormValues>({
    resolver: zodResolver(updatePlatformUserFormSchema),
    defaultValues: {
      email: user.email,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
    },
  })

  useEffect(() => {
    if (updateUser.isError) {
      redirectOnSessionExpiry(updateUser.error)
    }
  }, [updateUser.isError, updateUser.error, redirectOnSessionExpiry])

  const serverErrorMessage = updateUser.isError
    ? getPlatformUserErrorMessage("update-user", updateUser.error)
    : undefined

  const onSubmit = handleSubmit((values) => {
    const payload = {
      email: values.email,
      ...(values.firstName ? { firstName: values.firstName } : {}),
      ...(values.lastName ? { lastName: values.lastName } : {}),
    }

    updateUser.mutate(payload, {
      onSuccess: (updated) => {
        onSuccess?.("User updated.", updated)
        onOpenChange(false)
      },
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update the email or name. Roles and status have their own controls.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-user-email">Email</FieldLabel>
              <Input
                id="edit-user-email"
                type="email"
                autoComplete="off"
                autoFocus
                aria-invalid={!!formState.errors.email}
                {...register("email")}
              />
              <FieldError errors={[{ message: formState.errors.email?.message }]} />
            </Field>
            <div className="grid gap-5 @md/field-group:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-user-first-name">First name</FieldLabel>
                <Input
                  id="edit-user-first-name"
                  autoComplete="off"
                  aria-invalid={!!formState.errors.firstName}
                  {...register("firstName")}
                />
                <FieldDescription>Optional</FieldDescription>
                <FieldError
                  errors={[{ message: formState.errors.firstName?.message }]}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-user-last-name">Last name</FieldLabel>
                <Input
                  id="edit-user-last-name"
                  autoComplete="off"
                  aria-invalid={!!formState.errors.lastName}
                  {...register("lastName")}
                />
                <FieldError
                  errors={[{ message: formState.errors.lastName?.message }]}
                />
              </Field>
            </div>
            {serverErrorMessage ? (
              <FieldError>{serverErrorMessage}</FieldError>
            ) : null}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateUser.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}