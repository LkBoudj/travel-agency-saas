import { useEffect, useState } from "react"
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { OwnerField, type OwnerSelection } from "./owner-field"
import { useCreateAgency } from "../hooks/use-create-agency"
import { useSessionExpiryRedirect } from "../hooks/use-session-expiry-redirect"
import { getAgencyErrorMessage } from "../lib/agency-errors"
import { toCreateAgencyInput } from "../lib/agency-form"
import { toOwnerFormValue } from "../lib/owner-selection"
import {
  createAgencyFormSchema,
  type CreateAgencyFormValues,
} from "../schemas/agency-form.schema"
import type { AgencyDetails } from "../types/agency.types"

export type CreateAgencyDialogProps = {
  open: boolean
  onSuccess?: (message: string, agency: AgencyDetails) => void
  onOpenChange: (open: boolean) => void
}

const EMPTY_VALUES: CreateAgencyFormValues = {
  name: "",
  country: "",
  description: "",
  owner: null,
}

/**
 * Creates an agency through `POST /v1/agencies`.
 *
 * Field order is deliberate: what the agency IS (name), then WHO owns it, then
 * the optional details (country, description) last, so the required decisions
 * come first and the optional ones never sit between them.
 *
 * Choosing the owner — searching for an existing account, or describing a new
 * one — happens in its own focused dialog, so this form never grows a second
 * form inside it.
 *
 * Everything ownership-related (the OWNER membership and the owner's canonical
 * role) is established by the backend in the same transaction and is never
 * represented here. The agency and its owner remain one business operation:
 * there is no separate "create owner" request.
 */
export function CreateAgencyDialog({
  open,
  onSuccess,
  onOpenChange,
}: CreateAgencyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create agency</DialogTitle>
          <DialogDescription>
            The agency and its owner are created together, in one step.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so every open starts from a clean form and
            a cleared server error without resetting state in an effect. */}
        {open ? (
          <CreateAgencyForm
            onSuccess={onSuccess}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function CreateAgencyForm({
  onSuccess,
  onClose,
}: {
  onSuccess?: CreateAgencyDialogProps["onSuccess"]
  onClose: () => void
}) {
  const createAgency = useCreateAgency()
  const redirectOnSessionExpiry = useSessionExpiryRedirect()

  // The picked owner is kept in component state because the summary row needs
  // the display name and email, while the form only needs what gets submitted.
  const [owner, setOwner] = useState<OwnerSelection | null>(null)

  const { register, handleSubmit, setValue, formState } =
    useForm<CreateAgencyFormValues>({
      resolver: zodResolver(createAgencyFormSchema),
      defaultValues: EMPTY_VALUES,
    })

  const handleOwnerChange = (next: OwnerSelection | null) => {
    setOwner(next)
    setValue("owner", next ? toOwnerFormValue(next) : null, {
      shouldValidate: formState.isSubmitted,
    })
  }

  useEffect(() => {
    if (createAgency.isError) {
      redirectOnSessionExpiry(createAgency.error)
    }
  }, [createAgency.isError, createAgency.error, redirectOnSessionExpiry])

  const serverErrorMessage = createAgency.isError
    ? getAgencyErrorMessage("create-agency", createAgency.error)
    : undefined

  const onSubmit = handleSubmit((values) => {
    createAgency.mutate(toCreateAgencyInput(values), {
      onSuccess: (agency) => {
        onSuccess?.("Agency created.", agency)
        onClose()
      },
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
          <Field>
            <FieldLabel htmlFor="create-agency-name">Agency name</FieldLabel>
            <Input
              id="create-agency-name"
              autoComplete="off"
              autoFocus
              placeholder="Sahara Travel"
              aria-invalid={!!formState.errors.name}
              {...register("name")}
            />
            <FieldError errors={[{ message: formState.errors.name?.message }]} />
          </Field>

          <Field>
            <FieldLabel>Owner</FieldLabel>
            <FieldDescription>Every agency has exactly one owner.</FieldDescription>
            <OwnerField
              value={owner}
              onChange={handleOwnerChange}
              invalid={!!formState.errors.owner}
            />
            <FieldError errors={[{ message: formState.errors.owner?.message }]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="create-agency-country">Country</FieldLabel>
            <Input
              id="create-agency-country"
              autoComplete="off"
              placeholder="Optional"
              aria-invalid={!!formState.errors.country}
              {...register("country")}
            />
            <FieldError
              errors={[{ message: formState.errors.country?.message }]}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="create-agency-description">
              Description
            </FieldLabel>
            <Textarea
              id="create-agency-description"
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
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={createAgency.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={createAgency.isPending}>
          {createAgency.isPending ? <Loader2Icon className="animate-spin" /> : null}
          Create agency
        </Button>
      </DialogFooter>
    </form>
  )
}
