import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  newOwnerFormSchema,
  type NewOwnerFormValues,
} from "../schemas/agency-form.schema"

/** The owner details captured for an account that does not exist yet. */
export type NewOwnerDraft = {
  firstName: string
  lastName: string
  email: string
  password: string
}

export type NewOwnerDialogProps = {
  open: boolean
  /** Prefills the form when the operator reopens it to edit what they entered. */
  initialValue?: NewOwnerDraft
  onOpenChange: (open: boolean) => void
  onConfirm: (draft: NewOwnerDraft) => void
}

const EMPTY: NewOwnerFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
}

/**
 * Focused dialog for describing a brand new agency owner.
 *
 * It only collects and validates identity details — nothing is sent here. The
 * confirmed values travel back to the Create Agency form, which submits the
 * agency and its owner as one request so the two can never be created apart.
 */
export function NewOwnerDialog({
  open,
  initialValue,
  onOpenChange,
  onConfirm,
}: NewOwnerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialValue ? "Edit owner details" : "Create new user"}
          </DialogTitle>
          <DialogDescription>
            This account is created together with the agency.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <NewOwnerForm
            initialValue={initialValue}
            onCancel={() => onOpenChange(false)}
            onConfirm={(draft) => {
              onConfirm(draft)
              onOpenChange(false)
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function NewOwnerForm({
  initialValue,
  onCancel,
  onConfirm,
}: {
  initialValue?: NewOwnerDraft
  onCancel: () => void
  onConfirm: (draft: NewOwnerDraft) => void
}) {
  const { register, handleSubmit, formState } = useForm<NewOwnerFormValues>({
    resolver: zodResolver(newOwnerFormSchema),
    defaultValues: initialValue
      ? { ...initialValue, confirmPassword: initialValue.password }
      : EMPTY,
  })

  const onSubmit = handleSubmit((values) => {
    onConfirm({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      password: values.password,
    })
  })

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <DialogBody>
        <FieldGroup className="gap-4">
          <div className="grid gap-4 @md/field-group:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="new-owner-first-name">First name</FieldLabel>
              <Input
                id="new-owner-first-name"
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
              <FieldLabel htmlFor="new-owner-last-name">Last name</FieldLabel>
              <Input
                id="new-owner-last-name"
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
            <FieldLabel htmlFor="new-owner-email">Email</FieldLabel>
            <Input
              id="new-owner-email"
              type="email"
              autoComplete="off"
              placeholder="owner@example.com"
              aria-invalid={!!formState.errors.email}
              {...register("email")}
            />
            <FieldError errors={[{ message: formState.errors.email?.message }]} />
          </Field>

          <div className="grid gap-4 @md/field-group:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="new-owner-password">Password</FieldLabel>
              <Input
                id="new-owner-password"
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
              <FieldLabel htmlFor="new-owner-confirm-password">
                Confirm password
              </FieldLabel>
              <Input
                id="new-owner-confirm-password"
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
        </FieldGroup>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initialValue ? "Save owner" : "Use this owner"}</Button>
      </DialogFooter>
    </form>
  )
}
