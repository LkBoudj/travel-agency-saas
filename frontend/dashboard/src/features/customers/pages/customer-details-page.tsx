import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeftIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/shared/page-header"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { appToastManager } from "@/components/ui/toast"
import { useAgencyContext } from "@/features/agency-context/hooks/use-agency-context"
import { AGENCY_SECTIONS, agencyPath } from "@/features/agency-context/lib/agency-paths"
import { CustomerFormDialog } from "../components/customer-form-dialog"
import { useCustomerCapabilities } from "../hooks/use-customer-capabilities"
import { useCustomer } from "../hooks/use-customer"
import { useArchiveCustomer } from "../hooks/use-customer-mutations"
import { getCustomerErrorMessage } from "../lib/customer-error-adapter"
import {
  customerDisplayName,
  customerInitials,
  formatCustomerDate,
  isArchivedCustomer,
} from "../lib/customer-display"

/**
 * One customer, read by its `CUS-...` code from the URL.
 *
 * The backend resolves the code inside the agency that owns the route, so a
 * stale or foreign code is a truthful 404. Archived customers stay readable
 * here — the details page is exactly what a stored link to an archived record
 * still leads to.
 */
export function CustomerDetailsPage() {
  const { agency } = useAgencyContext()
  const { customerCode } = useParams<{ customerCode: string }>()
  const capabilities = useCustomerCapabilities()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [editOpen, setEditOpen] = useState(false)
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)

  const customerQuery = useCustomer(agency.code, customerCode)
  const archive = useArchiveCustomer(agency.code)

  const customer = customerQuery.data ?? null
  const busy = archive.isPending
  const backTo = agencyPath(agency.code, AGENCY_SECTIONS.customers)

  const fail = (error: unknown) =>
    appToastManager.add({ title: getCustomerErrorMessage(error) })

  const confirmArchive = () => {
    if (!customer) return
    archive.mutate(customer.code, {
      onSuccess: () => {
        appToastManager.add({ title: t("customers:archive.success") })
        navigate(backTo)
      },
      onError: fail,
    })
    setArchiveConfirmOpen(false)
  }

  if (!capabilities.canView) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-xl border p-6 text-sm text-muted-foreground">
          {t("customers:error.loadFailed")}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        to={backTo}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5 rtl:rotate-180" aria-hidden />
        {t("customers:details.back")}
      </Link>

      {customerQuery.isPending ? (
        <p className="rounded-xl border p-6 text-sm text-muted-foreground">
          {t("customers:page.loading")}
        </p>
      ) : customerQuery.isError ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">
            {t("customers:details.notFound")}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void customerQuery.refetch()}
          >
            {t("customers:error.retry")}
          </Button>
        </div>
      ) : customer ? (
        <>
          <PageHeader
            title={customerDisplayName(customer)}
            description={t("customers:page.description")}
            actions={
              <>
                {capabilities.canUpdate ? (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => setEditOpen(true)}
                  >
                    {t("customers:table.edit")}
                  </Button>
                ) : null}
                {capabilities.canArchive && !isArchivedCustomer(customer) ? (
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() => setArchiveConfirmOpen(true)}
                  >
                    {t("customers:table.archive")}
                  </Button>
                ) : null}
              </>
            }
          />

          <div className="max-w-xl rounded-xl border">
            <div className="flex items-center gap-3 border-b px-5 py-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {customerInitials(customer)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {customerDisplayName(customer)}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {customer.code}
                </span>
              </span>
            </div>

            <dl className="flex flex-col gap-3 px-5 py-4 text-sm">
              <DetailRow
                label={t("customers:details.status")}
                value={t(
                  isArchivedCustomer(customer)
                    ? "customers:status.archived"
                    : "customers:status.active"
                )}
              />
              <DetailRow
                label={t("customers:details.email")}
                value={customer.email ?? "—"}
              />
              <DetailRow
                label={t("customers:details.phone")}
                value={customer.phone ?? "—"}
              />
              <DetailRow
                label={t("customers:details.createdAt")}
                value={formatCustomerDate(customer.createdAt)}
              />
              <DetailRow
                label={t("customers:details.updatedAt")}
                value={formatCustomerDate(customer.updatedAt)}
              />
              <DetailRow
                label={t("customers:details.notes")}
                value={customer.notes?.trim() || t("customers:details.noNotes")}
              />
            </dl>
          </div>
        </>
      ) : null}

      <CustomerFormDialog
        agencyCode={agency.code}
        customer={customer}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title={t("customers:archive.title")}
        description={t("customers:archive.description")}
        confirmLabel={t("customers:archive.confirm")}
        cancelLabel={t("customers:form.cancel")}
        destructive
        onConfirm={confirmArchive}
      />
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}