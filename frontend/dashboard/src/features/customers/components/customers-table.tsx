import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  customerRowActions,
  hasAnyRowAction,
  type CustomerCapabilities,
} from "../lib/customer-actions"
import {
  customerDisplayName,
  customerInitials,
  formatCustomerDate,
  isArchivedCustomer,
} from "../lib/customer-display"
import type { AgencyCustomer } from "../types/customers.types"

type CustomersTableProps = {
  customers: AgencyCustomer[]
  capabilities: CustomerCapabilities
  pendingCode: string | null
  onViewDetails: (customer: AgencyCustomer) => void
  onEdit: (customer: AgencyCustomer) => void
  onArchive: (customer: AgencyCustomer) => void
}

/**
 * One row per customer in the active listing.
 *
 * The code is shown under the name, not as a separate column: it identifies a
 * record for the API, not a person for an operator. The list never contains
 * archived customers — those are read by code from the details page.
 */
export function CustomersTable({
  customers,
  capabilities,
  pendingCode,
  onViewDetails,
  onEdit,
  onArchive,
}: CustomersTableProps) {
  const { t } = useTranslation()

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[720px] text-[13px]">
        <thead>
          <tr className="border-b text-start text-xs whitespace-nowrap text-muted-foreground">
            <th className="px-3 py-2.5 text-start font-medium">
              {t("customers:table.customer")}
            </th>
            <th className="hidden px-3 py-2.5 text-start font-medium md:table-cell">
              {t("customers:table.contact")}
            </th>
            <th className="px-3 py-2.5 text-start font-medium">
              {t("customers:table.status")}
            </th>
            <th className="hidden px-3 py-2.5 text-start font-medium lg:table-cell">
              {t("customers:table.created")}
            </th>
            <th className="px-3 py-2.5 text-end font-medium">
              {t("customers:table.actions")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {customers.map((customer) => {
            const actions = customerRowActions(customer, capabilities)
            const busy = pendingCode === customer.code
            const archived = isArchivedCustomer(customer)

            return (
              <tr
                key={customer.code}
                className={busy ? "opacity-60" : "hover:bg-muted/40"}
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                      {customerInitials(customer)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {customerDisplayName(customer)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {customer.code}
                      </span>
                    </span>
                  </div>
                </td>

                <td className="hidden px-3 py-2.5 md:table-cell">
                  <span className="block truncate">
                    {customer.email?.trim() || "—"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {customer.phone?.trim() || "—"}
                  </span>
                </td>

                <td className="px-3 py-2.5">
                  <span
                    className={
                      archived
                        ? "inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-destructive"
                        : "inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-muted-foreground"
                    }
                  >
                    {t(
                      archived
                        ? "customers:status.archived"
                        : "customers:status.active"
                    )}
                  </span>
                </td>

                <td className="hidden px-3 py-2.5 whitespace-nowrap text-muted-foreground lg:table-cell">
                  {formatCustomerDate(customer.createdAt)}
                </td>

                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {!hasAnyRowAction(actions) ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : null}

                    {actions.canViewDetails ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={busy}
                        onClick={() => onViewDetails(customer)}
                      >
                        {t("customers:table.viewDetails")}
                      </Button>
                    ) : null}

                    {actions.canEdit ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={busy}
                        onClick={() => onEdit(customer)}
                      >
                        {t("customers:table.edit")}
                      </Button>
                    ) : null}

                    {actions.canArchive ? (
                      <Button
                        variant="destructive"
                        size="xs"
                        disabled={busy}
                        onClick={() => onArchive(customer)}
                      >
                        {t("customers:table.archive")}
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}