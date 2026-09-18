import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, RotateCcwIcon } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"

import { ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogBody,
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
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useRoles } from "../hooks/use-roles"
import { useCreatePlatformUser } from "../hooks/use-create-platform-user"
import { useSessionExpiryRedirect } from "../hooks/use-session-expiry-redirect"
import { getPlatformUserErrorMessage } from "../lib/platform-user-errors"
import {
  createPlatformUserFormSchema,
  type CreatePlatformUserFormValues,
} from "../schemas/platform-user-form.schema"
import type { PlatformUser } from "../types/platform-user.types"

export type CreateUserDialogProps = {
  open: boolean
  onSuccess?: (message: string, user: PlatformUser) => void
  onOpenChange: (open: boolean) => void
}

function RoleChecklistSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1].map((row) => (
        <div key={row} className="flex items-start gap-3">
          <Skeleton className="mt-0.5 size-4 rounded" />
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CreateUserDialog({
  open,
  onSuccess,
  onOpenChange,
}: CreateUserDialogProps) {
  const createUser = useCreatePlatformUser()
  const rolesQuery = useRoles("PLATFORM")
  const redirectOnSessionExpiry = useSessionExpiryRedirect()

  const roles = rolesQuery.data ?? []

  useEffect(() => {
    if (rolesQuery.error instanceof ApiError && rolesQuery.error.status === 401) {
      redirectOnSessionExpiry(rolesQuery.error)
    }
  }, [rolesQuery.error, redirectOnSessionExpiry])

  useEffect(() => {
    if (createUser.isError) {
      redirectOnSessionExpiry(createUser.error)
    }
  }, [createUser.isError, createUser.error, redirectOnSessionExpiry])

  const { register, handleSubmit, setValue, control, formState } =
    useForm<CreatePlatformUserFormValues>({
      resolver: zodResolver(createPlatformUserFormSchema),
      defaultValues: {
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
        roleKeys: [],
      },
    })

  const selectedRoleKeys = useWatch({ control, name: "roleKeys" }) ?? []

  const handleToggleRole = (key: string, checked: boolean) => {
    setValue(
      "roleKeys",
      checked
        ? [...selectedRoleKeys, key]
        : selectedRoleKeys.filter((roleKey) => roleKey !== key),
      { shouldValidate: true }
    )
  }

  const serverErrorMessage = createUser.isError
    ? getPlatformUserErrorMessage("create-user", createUser.error)
    : undefined

  const onSubmit = handleSubmit((values) => {
    createUser.mutate(
      {
        email: values.email,
        password: values.password,
        firstName: values.firstName ? values.firstName : null,
        lastName: values.lastName ? values.lastName : null,
        roleKeys: values.roleKeys,
      },
      {
        onSuccess: (user) => {
          onSuccess?.("User created.", user)
          onOpenChange(false)
        },
      }
    )
  })

  const noRolesAvailable =
    !rolesQuery.isPending && !rolesQuery.isError && roles.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            Create a Super Dashboard account and assign its roles.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col gap-4">
          <DialogBody>
            <FieldGroup className="gap-4">
              <div className="grid gap-4 @md/field-group:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="create-user-first-name">First name</FieldLabel>
                  <Input
                    id="create-user-first-name"
                    autoComplete="off"
                    autoFocus
                    aria-invalid={!!formState.errors.firstName}
                    {...register("firstName")}
                  />
                  <FieldError
                    errors={[{ message: formState.errors.firstName?.message }]}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="create-user-last-name">Last name</FieldLabel>
                  <Input
                    id="create-user-last-name"
                    autoComplete="off"
                    aria-invalid={!!formState.errors.lastName}
                    {...register("lastName")}
                  />
                  <FieldError
                    errors={[{ message: formState.errors.lastName?.message }]}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="create-user-email">Email</FieldLabel>
                <Input
                  id="create-user-email"
                  type="email"
                  autoComplete="off"
                  placeholder="you@example.com"
                  aria-invalid={!!formState.errors.email}
                  {...register("email")}
                />
                <FieldError errors={[{ message: formState.errors.email?.message }]} />
              </Field>

              <div className="grid gap-4 @md/field-group:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="create-user-password">Password</FieldLabel>
                  <Input
                    id="create-user-password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={!!formState.errors.password}
                    {...register("password")}
                  />
                  <FieldError
                    errors={[{ message: formState.errors.password?.message }]}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="create-user-confirm-password">
                    Confirm password
                  </FieldLabel>
                  <Input
                    id="create-user-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={!!formState.errors.confirmPassword}
                    {...register("confirmPassword")}
                  />
                  <FieldError
                    errors={[{ message: formState.errors.confirmPassword?.message }]}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="create-user-roles">Platform roles</FieldLabel>
                <FieldDescription>Choose at least one role.</FieldDescription>
                {rolesQuery.isPending ? <RoleChecklistSkeleton /> : null}
                {!rolesQuery.isPending && rolesQuery.isError ? (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/50 px-3 py-2">
                    <p className="flex-1 text-sm text-destructive">
                      Could not load the role catalog.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void rolesQuery.refetch()}
                    >
                      <RotateCcwIcon />
                      Retry
                    </Button>
                  </div>
                ) : null}
                {!rolesQuery.isPending && !rolesQuery.isError && roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No platform roles are available yet. Create a platform role
                    before inviting a user.
                  </p>
                ) : null}
                {!rolesQuery.isPending && !rolesQuery.isError && roles.length > 0 ? (
                  <ul className="flex max-h-52 flex-col gap-3 overflow-y-auto pr-1">
                    {roles.map((role) => {
                      const checkboxId = `create-user-role-${role.key}`
                      const checked = selectedRoleKeys.includes(role.key)
                      return (
                        <li key={role.id} className="flex items-start gap-3">
                          <Checkbox
                            id={checkboxId}
                            className="mt-0.5"
                            checked={checked}
                            onCheckedChange={(value) =>
                              handleToggleRole(role.key, value === true)
                            }
                          />
                          <div className="grid gap-0.5">
                            <Label htmlFor={checkboxId} className="font-medium">
                              {role.name}
                            </Label>
                            <p className="font-mono text-xs text-muted-foreground">
                              {role.key}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : null}
                <FieldError
                  errors={[{ message: formState.errors.roleKeys?.message }]}
                />
              </Field>
              {serverErrorMessage ? (
                <FieldError>{serverErrorMessage}</FieldError>
              ) : null}
            </FieldGroup>
          </DialogBody>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createUser.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createUser.isPending || noRolesAvailable}>
              {createUser.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : null}
              Create user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}