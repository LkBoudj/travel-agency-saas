import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { SearchIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/shared/page-header"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { appToastManager } from "@/components/ui/toast"
import { AGENCY_SECTIONS, agencyPath } from "@/features/agency-context/lib/agency-paths"
import { useAgencyContext } from "@/features/agency-context/hooks/use-agency-context"
import { CustomerFormDialog } from "../components/customer-form-dialog"
import { CustomersTable } from "../components/customers-table"
import { useCustomerCapabilities } from "../hooks/use-customer-capabilities"
import { useCustomers } from "../hooks/use-customers"
import { useArchiveCustomer } from "../hooks/use-customer-mutations"
import { useDebouncedValue } from "../hooks/use-debounced-value"
import { getCustomerErrorMessage } from "../lib/customer-error-adapter"
import type { AgencyCustomer } from "../types/customers.types"

/**
 * Business customers of the agency in the URL.
 *
 * The agency comes from `useAgencyContext`, which resolved `:agencyCode`, so
 * this page has no notion of a "current agency" of its own and two tabs can sit
 * in two agencies at once.
 *
 * Every control here is gated by permission (UX only); the backend guards are
 * authoritative. The list shows ACTIVE customers only — archived ones are read
 * by code from their details page.
 */
export function CustomersPage() {
  const { agency } = useAgencyContext()
  const capabilities = useCustomerCapabilities()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<AgencyCustomer | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<AgencyCustomer | null>(null)

  const customersQuery = useCustomers(
    agency.code,
    debouncedSearch,
    capabilities.canView
  )
  const archive = useArchiveCustomer(agency.code)

  const pendingCode = archive.isPending ? (archive.variables ?? null) : null

  const fail = (error: unknown) =>
    appToastManager.add({ title: getCustomerErrorMessage(error) })

  const openDetails = (customer: AgencyCustomer) => {
    navigate(
      `${agencyPath(agency.code, AGENCY_SECTIONS.customers)}/${encodeURIComponent(customer.code)}`
    )
  }

  const confirmArchive = (customer: AgencyCustomer) => {
    archive.mutate(customer.code, {
      onSuccess: () =>
        appToastManager.add({ title: t("customers:archive.success") }),
      onError: fail,
    })
    setArchiveTarget(null)
  }

  if (!capabilities.canView) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title={t("customers:page.title")}
          description={t("customers:page.description")}
        />
        <p className="rounded-xl border p-6 text-sm text-muted-foreground">
          {t("customers:error.loadFailed")}
        </p>
      </div>
    )
  }

  const customers = customersQuery.data ?? []
  const searching = debouncedSearch.trim().length > 0

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("customers:page.title")}
        description={t("customers:page.description")}
        actions={
          capabilities.canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              {t("customers:page.create")}
            </Button>
          ) : undefined
        }
      />

      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("customers:page.searchPlaceholder")}
          aria-label={t("customers:page.searchAria")}
          className="ps-8"
        />
      </div>

      {customersQuery.isPending ? (
        <p className="rounded-xl border p-6 text-sm text-muted-foreground">
          {t("customers:page.loading")}
        </p>
      ) : customersQuery.isError ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">
            {getCustomerErrorMessage(customersQuery.error)}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void customersQuery.refetch()}
          >
            {t("customers:error.retry")}
          </Button>
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">
            {searching
              ? t("customers:page.noResults", {
                  query: debouncedSearch.trim(),
                })
              : t("customers:page.noCustomers")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {customersQuery.isFetching ? (
            <p className="text-xs text-muted-foreground">
              {t("customers:page.updating")}
            </p>
          ) : null}
          <CustomersTable
            customers={customers}
            capabilities={capabilities}
            pendingCode={pendingCode}
            onViewDetails={openDetails}
            onEdit={setEditing}
            onArchive={setArchiveTarget}
          />
        </div>
      )}

      <CustomerFormDialog
        agencyCode={agency.code}
        customer={null}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <CustomerFormDialog
        agencyCode={agency.code}
        customer={editing}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null)
        }}
        title={t("customers:archive.title")}
        description={t("customers:archive.description")}
        confirmLabel={t("customers:archive.confirm")}
        cancelLabel={t("customers:form.cancel")}
        destructive
        onConfirm={() => {
          if (archiveTarget) confirmArchive(archiveTarget)
        }}
      />
    </div>
  )
}