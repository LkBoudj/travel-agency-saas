import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"

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
import { Textarea } from "@/components/ui/textarea"
import { useCreateRole } from "../hooks/use-create-role"
import { useSessionExpiryRedirect } from "../hooks/use-session-expiry-redirect"
import { useUpdateRole } from "../hooks/use-update-role"
import { getRbacErrorMessage } from "../lib/rbac-errors"
import { suggestRoleKey } from "../lib/role-key"
import {
  roleFormSchema,
  type RoleFormValues,
} from "../schemas/role-form.schema"
import type { PlatformRole, RoleScope } from "../types/rbac.types"

export type RoleFormDialogProps = {
  mode: "create" | "edit"
  scope: RoleScope
  role?: PlatformRole
  open: boolean
  onSuccess?: (message: string, role: PlatformRole) => void
  onOpenChange: (open: boolean) => void
}

export function RoleFormDialog({
  mode,
  scope,
  role,
  open,
  onSuccess,
  onOpenChange,
}: RoleFormDialogProps) {
  const createRole = useCreateRole(scope)
  const updateRole = useUpdateRole(scope, role?.id ?? "")
  const redirectOnSessionExpiry = useSessionExpiryRedirect()
  const [keyEdited, setKeyEdited] = useState(false)

  const { register, handleSubmit, setValue, control, formState } =
    useForm<RoleFormValues>({
      resolver: zodResolver(roleFormSchema),
      defaultValues: {
        name: role?.name ?? "",
        key: role?.key ?? "",
        description: role?.description ?? "",
      },
    })

  const nameValue = useWatch({ control, name: "name" })

  useEffect(() => {
    if (!open || mode === "edit" || keyEdited) {
      return
    }
    setValue("key", suggestRoleKey(scope, nameValue ?? ""), {
      shouldValidate: false,
    })
  }, [open, mode, scope, keyEdited, nameValue, setValue])

  const mutation = mode === "create" ? createRole : updateRole
  const isPending = mutation.isPending
  const error = mutation.error
  const isError = mutation.isError

  useEffect(() => {
    if (isError) {
      redirectOnSessionExpiry(error)
    }
  }, [isError, error, redirectOnSessionExpiry])

  const serverErrorMessage = isError
    ? getRbacErrorMessage(
        mode === "create" ? "create-role" : "update-role",
        error
      )
    : undefined

  const onSubmit = handleSubmit((values) => {
    const description = values.description.trim()
    const payload = {
      name: values.name.trim(),
      description: description.length > 0 ? description : null,
    }

    if (mode === "create") {
      createRole.mutate(
        { ...payload, key: values.key.trim() },
        {
          onSuccess: (created) => {
            onSuccess?.("Role created.", created)
            onOpenChange(false)
          },
        }
      )
      return
    }

    updateRole.mutate(payload, {
      onSuccess: (updated) => {
        onSuccess?.("Role updated.", updated)
        onOpenChange(false)
      },
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create role" : "Edit role"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a role, then choose its permissions next."
              : "Update the display name or description. The technical key cannot be changed."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="role-name">Display name</FieldLabel>
              <Input
                id="role-name"
                autoComplete="off"
                autoFocus
                aria-invalid={!!formState.errors.name}
                {...register("name")}
              />
              <FieldError
                errors={[{ message: formState.errors.name?.message }]}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="role-key">Technical key</FieldLabel>
              <Input
                id="role-key"
                autoComplete="off"
                spellCheck={false}
                readOnly={mode === "edit"}
                className="font-mono"
                aria-invalid={!!formState.errors.key}
                aria-readonly={mode === "edit"}
                {...register("key", {
                  onChange: () => setKeyEdited(true),
                })}
              />
              <FieldDescription>
                {mode === "create"
                  ? "Suggested from the display name. Uppercase letters, digits and underscores, starting with a letter."
                  : "Technical keys are permanent and cannot be edited."}
              </FieldDescription>
              <FieldError errors={[{ message: formState.errors.key?.message }]} />
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
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2Icon className="animate-spin" /> : null}
              {mode === "create" ? "Create role" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
