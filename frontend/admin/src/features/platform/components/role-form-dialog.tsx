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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useCreateRole } from "../hooks/use-create-role"
import { useSessionExpiryRedirect } from "../hooks/use-session-expiry-redirect"
import { useUpdateRole } from "../hooks/use-update-role"
import { getRbacErrorMessage } from "../lib/rbac-errors"
import {
  roleFormSchema,
  type RoleFormValues,
} from "../schemas/role-form.schema"
import type { PlatformRole } from "../types/rbac.types"

export type RoleFormDialogProps = {
  mode: "create" | "edit"
  role?: PlatformRole
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RoleFormDialog({
  mode,
  role,
  open,
  onOpenChange,
}: RoleFormDialogProps) {
  const createRole = useCreateRole()
  const updateRole = useUpdateRole(role?.id ?? "")
  const redirectOnSessionExpiry = useSessionExpiryRedirect()
  const mutation = mode === "create" ? createRole : updateRole

  const { register, handleSubmit, reset, formState } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: "", description: "" },
  })

  useEffect(() => {
    if (!open) {
      return
    }
    reset({
      name: role?.name ?? "",
      description: role?.description ?? "",
    })
  }, [open, role, reset])

  useEffect(() => {
    if (mutation.isError) {
      redirectOnSessionExpiry(mutation.error)
    }
  }, [mutation.isError, mutation.error, redirectOnSessionExpiry])

  const serverErrorMessage = mutation.isError
    ? getRbacErrorMessage(
        mode === "create" ? "create-role" : "update-role",
        mutation.error
      )
    : undefined

  const onSubmit = handleSubmit((values) => {
    const description = values.description.trim()
    mutation.mutate(
      {
        name: values.name.trim(),
        description: description.length > 0 ? description : null,
      },
      { onSuccess: () => onOpenChange(false) }
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create role" : "Edit role"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "New roles are created for the platform scope."
              : "Update the role name or description. Scope cannot be changed."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="role-name">Name</FieldLabel>
              <Input
                id="role-name"
                autoComplete="off"
                aria-invalid={!!formState.errors.name}
                {...register("name")}
              />
              <FieldError errors={[{ message: formState.errors.name?.message }]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="role-description">Description</FieldLabel>
              <Textarea
                id="role-description"
                rows={3}
                placeholder="Optional"
                aria-invalid={!!formState.errors.description}
                {...register("description")}
              />
              <FieldError
                errors={[{ message: formState.errors.description?.message }]}
              />
            </Field>
            {serverErrorMessage ? (
              <FieldError>{serverErrorMessage}</FieldError>
            ) : null}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : null}
              {mode === "create" ? "Create role" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
