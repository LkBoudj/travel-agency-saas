import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useUpdateAgency } from "../hooks/use-update-agency"
import { useSessionExpiryRedirect } from "../hooks/use-session-expiry-redirect"
import { getAgencyErrorMessage } from "../lib/agency-errors"
import {
  isEmptyAgencyPatch,
  toAgencyFormValues,
  toAgencyUpdateInput,
} from "../lib/agency-form"
import {
  updateAgencyFormSchema,
  type UpdateAgencyFormValues,
} from "../schemas/agency-form.schema"
import type { Agency, AgencyDetails } from "../types/agency.types"

export type EditAgencyDialogProps = {
  agency: Agency
  open: boolean
  onSuccess?: (message: string, agency: AgencyDetails) => void
  onOpenChange: (open: boolean) => void
}

/**
 * Edits the descriptive fields of an agency through `PATCH /v1/agencies/:code`.
 *
 * Status, code and ownership are deliberately not editable here: status has its
 * own action, and ownership transfer is a separate future operation. Only the
 * fields the operator actually changed are sent.
 */
export function EditAgencyDialog({
  agency,
  open,
  onSuccess,
  onOpenChange,
}: EditAgencyDialogProps) {
  const updateAgency = useUpdateAgency(agency.code)
  const redirectOnSessionExpiry = useSessionExpiryRedirect()

  const { register, handleSubmit, reset, formState } =
    useForm<UpdateAgencyFormValues>({
      resolver: zodResolver(updateAgencyFormSchema),
      defaultValues: toAgencyFormValues(agency),
    })

  useEffect(() => {
    reset(toAgencyFormValues(agency))
  }, [agency, reset])

  useEffect(() => {
    if (updateAgency.isError) {
      redirectOnSessionExpiry(updateAgency.error)
    }
  }, [updateAgency.isError, updateAgency.error, redirectOnSessionExpiry])

  const serverErrorMessage = updateAgency.isError
    ? getAgencyErrorMessage("update-agency", updateAgency.error)
    : undefined

  const onSubmit = handleSubmit((values) => {
    const patch = toAgencyUpdateInput(agency, values)
    if (isEmptyAgencyPatch(patch)) {
      onOpenChange(false)
      return
    }

    updateAgency.mutate(patch, {
      onSuccess: (updated) => {
        onSuccess?.("Agency updated.", updated)
        onOpenChange(false)
      },
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit agency</DialogTitle>
          <DialogDescription>
            Ownership and status are managed separately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col gap-4">
          <DialogBody>
            <FieldGroup className="gap-4">
              <div className="grid gap-4 @md/field-group:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="edit-agency-name">Agency name</FieldLabel>
                  <Input
                    id="edit-agency-name"
                    autoComplete="off"
                    autoFocus
                    aria-invalid={!!formState.errors.name}
                    {...register("name")}
                  />
                  <FieldError errors={[{ message: formState.errors.name?.message }]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-agency-country">Country</FieldLabel>
                  <Input
                    id="edit-agency-country"
                    autoComplete="off"
                    placeholder="Optional"
                    aria-invalid={!!formState.errors.country}
                    {...register("country")}
                  />
                  <FieldError
                    errors={[{ message: formState.errors.country?.message }]}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="edit-agency-description">Description</FieldLabel>
                <Textarea
                  id="edit-agency-description"
                  rows={2}
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
          </DialogBody>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateAgency.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateAgency.isPending}>
              {updateAgency.isPending ? (
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
