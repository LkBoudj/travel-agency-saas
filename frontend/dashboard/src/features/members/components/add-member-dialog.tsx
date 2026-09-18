import { useState, type ReactNode } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { appToastManager } from "@/components/ui/toast"
import { useAddMember } from "../hooks/use-member-mutations"
import { useAssignableRoles } from "../hooks/use-assignable-roles"
import { getMemberErrorMessage } from "../lib/member-error-adapter"
import {
  buildAddExistingMemberPayload,
  buildAddNewMemberPayload,
} from "../lib/member-payloads"
import {
  newMemberFormSchema,
  type NewMemberFormValues,
} from "../schemas/add-member.schema"
import { ExistingUserPicker } from "./existing-user-picker"
import { RoleSelector } from "./role-selector"
import type { MemberCandidate } from "../types/members.types"

type AddMemberDialogProps = {
  agencyCode: string
  canManageRoles: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Mode = "EXISTING" | "NEW"

/**
 * Adds a member in one compact dialog rather than a page-sized form.
 *
 * The body is mounted only while the dialog is open, so closing it genuinely
 * resets the flow instead of leaving a half-filled form behind — and no effect
 * has to reach in and clear state.
 */
export function AddMemberDialog(props: AddMemberDialogProps) {
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[min(90svh,44rem)] max-w-lg -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg outline-none sm:inset-x-auto sm:left-1/2 sm:right-auto sm:w-full sm:-translate-x-1/2 rtl:sm:left-auto rtl:sm:right-1/2 rtl:sm:translate-x-1/2">
          {props.open ? <AddMemberBody {...props} /> : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function AddMemberBody({
  agencyCode,
  canManageRoles,
  onOpenChange,
}: AddMemberDialogProps) {
  const [mode, setMode] = useState<Mode>("EXISTING")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<MemberCandidate | null>(null)
  const [roleKeys, setRoleKeys] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const addMember = useAddMember(agencyCode)
  // The roles endpoint requires AGENCY_MEMBER_ROLE_MANAGE, so someone who may
  // only invite never fires a request that is certain to be refused.
  const rolesQuery = useAssignableRoles(agencyCode, canManageRoles)

  const form = useForm<NewMemberFormValues>({
    resolver: zodResolver(newMemberFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const succeed = (label: string) => {
    appToastManager.add({ title: `${label} was added to this agency.` })
    onOpenChange(false)
  }

  const submitExisting = () => {
    if (!selected) return
    setErrorMessage(null)
    addMember.mutate(
      buildAddExistingMemberPayload({ appUserCode: selected.code, roleKeys }),
      {
        onSuccess: (member) => succeed(member.email),
        onError: (error) => setErrorMessage(getMemberErrorMessage(error)),
      }
    )
  }

  const submitNew = form.handleSubmit((values) => {
    setErrorMessage(null)
    addMember.mutate(
      buildAddNewMemberPayload({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        roleKeys,
      }),
      {
        onSuccess: (member) => succeed(member.email),
        onError: (error) => setErrorMessage(getMemberErrorMessage(error)),
      }
    )
  })

  const { register, formState } = form
  const pending = addMember.isPending

  return (
    <>
      <div className="border-b px-5 py-4">
        <Dialog.Title className="text-sm font-semibold">Add member</Dialog.Title>
        <Dialog.Description className="mt-1 text-xs text-muted-foreground">
          Give someone access to this agency.
        </Dialog.Description>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        <div
          role="radiogroup"
          aria-label="Member source"
          className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
        >
          {MODES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              disabled={pending}
              onClick={() => {
                setMode(value)
                setErrorMessage(null)
              }}
              className={
                mode === value
                  ? "rounded-md bg-background px-3 py-1.5 text-sm font-medium shadow-sm"
                  : "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              }
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "EXISTING" ? (
          <ExistingUserPicker
            agencyCode={agencyCode}
            search={search}
            onSearchChange={setSearch}
            selected={selected}
            onSelect={setSelected}
            disabled={pending}
          />
        ) : (
          <form
            id="new-member-form"
            noValidate
            onSubmit={submitNew}
            className="flex flex-col gap-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                htmlFor="firstName"
                label="First name"
                error={formState.errors.firstName?.message}
              >
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  {...register("firstName")}
                />
              </Field>
              <Field
                htmlFor="lastName"
                label="Last name"
                error={formState.errors.lastName?.message}
              >
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  {...register("lastName")}
                />
              </Field>
            </div>
            <Field
              htmlFor="email"
              label="Email"
              error={formState.errors.email?.message}
            >
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                htmlFor="password"
                label="Password"
                error={formState.errors.password?.message}
              >
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register("password")}
                />
              </Field>
              <Field
                htmlFor="confirmPassword"
                label="Confirm password"
                error={formState.errors.confirmPassword?.message}
              >
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                />
              </Field>
            </div>
          </form>
        )}

        {canManageRoles ? (
          <div className="flex flex-col gap-1.5">
            <Label>Roles (optional)</Label>
            <RoleSelector
              roles={rolesQuery.data ?? []}
              selected={roleKeys}
              onChange={setRoleKeys}
              isLoading={rolesQuery.isPending}
              disabled={pending}
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            They will be added with no roles. Someone who can manage roles can
            assign them afterwards.
          </p>
        )}

        {errorMessage ? (
          <p role="alert" className="text-xs text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
        <Dialog.Close render={<Button variant="ghost" disabled={pending} />}>
          Cancel
        </Dialog.Close>
        {mode === "EXISTING" ? (
          <Button onClick={submitExisting} disabled={!selected || pending}>
            {pending ? "Adding..." : "Add member"}
          </Button>
        ) : (
          <Button type="submit" form="new-member-form" disabled={pending}>
            {pending ? "Adding..." : "Add member"}
          </Button>
        )}
      </div>
    </>
  )
}

const MODES = [
  ["EXISTING", "Existing user"],
  ["NEW", "New user"],
] as const satisfies ReadonlyArray<readonly [Mode, string]>

function Field({
  htmlFor,
  label,
  error,
  children,
}: {
  htmlFor: string
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
