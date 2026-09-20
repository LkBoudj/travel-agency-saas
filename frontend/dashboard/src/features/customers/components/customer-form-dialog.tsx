import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog } from "@base-ui/react/dialog"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { appToastManager } from "@/components/ui/toast"
import {
  useCreateCustomer,
  useUpdateCustomer,
} from "../hooks/use-customer-mutations"
import { getCustomerErrorMessage } from "../lib/customer-error-adapter"
import { buildCustomerPayload, toCustomerFormValues } from "../lib/customer-payloads"
import {
  createCustomerFormSchema,
  type CustomerFormValues,
} from "../schemas/customer.schema"
import type { AgencyCustomer } from "../types/customers.types"

type CustomerFormDialogProps = {
  agencyCode: string
  /** `null` opens the create form; a customer opens the edit form for it. */
  customer: AgencyCustomer | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const EMPTY_FORM: CustomerFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: "",
}

/**
 * Create/Edit customer — the five contact fields, all optional, on one form.
 *
 * Blank strings become `null` in the payload, which is exactly what "no value"
 * means to the backend: clear semantics for both create and update with a
 * single shape. The backend's `AGENCY_CUSTOMER_CREATE` / `_UPDATE` guards are
 * authoritative; rendering the button, or this dialog, is only UX courtesy.
 */
export function CustomerFormDialog({
  agencyCode,
  customer,
  open,
  onOpenChange,
}: CustomerFormDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[min(90svh,40rem)] max-w-lg -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg outline-none sm:inset-x-auto sm:left-1/2 sm:right-auto sm:w-full sm:-translate-x-1/2 rtl:sm:left-auto rtl:sm:right-1/2 rtl:sm:translate-x-1/2">
          {open ? (
            <CustomerFormBody
              agencyCode={agencyCode}
              customer={customer}
              onOpenChange={onOpenChange}
            />
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function CustomerFormBody({
  agencyCode,
  customer,
  onOpenChange,
}: {
  agencyCode: string
  customer: AgencyCustomer | null
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()

  const create = useCreateCustomer(agencyCode)
  const update = useUpdateCustomer(agencyCode)
  const pending = create.isPending || update.isPending

  // Mounted per open, so the starting values are set once and never need an
  // effect to resync after the fact.
  const resolver = useMemo(() => zodResolver(createCustomerFormSchema(t)), [t])
  const defaultValues = useMemo<CustomerFormValues>(() => {
    if (customer) return toCustomerFormValues(customer)
    return EMPTY_FORM
  }, [customer])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormValues>({ resolver, defaultValues })

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const done = () => {
    appToastManager.add({
      title: t(
        customer
          ? "customers:update.success"
          : "customers:create.success"
      ),
    })
    onOpenChange(false)
  }

  const fail = (error: unknown) =>
    setErrorMessage(getCustomerErrorMessage(error))

  const onSubmit = handleSubmit((values) => {
    setErrorMessage(null)
    const payload = buildCustomerPayload(values)
    if (customer) {
      update.mutate(
        { customerCode: customer.code, payload },
        { onSuccess: done, onError: fail }
      )
    } else {
      create.mutate(payload, { onSuccess: done, onError: fail })
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="border-b px-5 py-4">
        <Dialog.Title className="text-sm font-semibold">
          {t(
            customer
              ? "customers:form.editTitle"
              : "customers:form.createTitle"
          )}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-xs text-muted-foreground">
          {t("customers:form.description")}
        </Dialog.Description>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-4 text-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label={t("customers:form.firstNameLabel")}
            htmlFor="customer-form-first-name"
            error={errors.firstName?.message}
          >
            <Input
              id="customer-form-first-name"
              dir="auto"
              placeholder={t("customers:form.firstNamePlaceholder")}
              aria-invalid={errors.firstName ? true : undefined}
              {...register("firstName")}
            />
          </Field>

          <Field
            label={t("customers:form.lastNameLabel")}
            htmlFor="customer-form-last-name"
            error={errors.lastName?.message}
          >
            <Input
              id="customer-form-last-name"
              dir="auto"
              placeholder={t("customers:form.lastNamePlaceholder")}
              aria-invalid={errors.lastName ? true : undefined}
              {...register("lastName")}
            />
          </Field>
        </div>

        <Field
          label={t("customers:form.emailLabel")}
          htmlFor="customer-form-email"
          error={errors.email?.message}
        >
          <Input
            id="customer-form-email"
            dir="ltr"
            type="email"
            placeholder={t("customers:form.emailPlaceholder")}
            aria-invalid={errors.email ? true : undefined}
            {...register("email")}
          />
        </Field>

        <Field
          label={t("customers:form.phoneLabel")}
          htmlFor="customer-form-phone"
          error={errors.phone?.message}
        >
          <Input
            id="customer-form-phone"
            dir="ltr"
            placeholder={t("customers:form.phonePlaceholder")}
            aria-invalid={errors.phone ? true : undefined}
            {...register("phone")}
          />
        </Field>

        <Field
          label={t("customers:form.notesLabel")}
          htmlFor="customer-form-notes"
          error={errors.notes?.message}
        >
          <Textarea
            id="customer-form-notes"
            dir="auto"
            placeholder={t("customers:form.notesPlaceholder")}
            aria-invalid={errors.notes ? true : undefined}
            {...register("notes")}
          />
        </Field>

        {errorMessage ? (
          <p role="alert" className="text-xs text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
        <Dialog.Close render={<Button variant="ghost" disabled={pending} />}>
          {t("customers:form.cancel")}
        </Dialog.Close>
        <Button type="submit" disabled={pending}>
          {pending
            ? t("customers:form.saving")
            : customer
              ? t("customers:form.submitEdit")
              : t("customers:form.submitCreate")}
        </Button>
      </div>
    </form>
  )
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}