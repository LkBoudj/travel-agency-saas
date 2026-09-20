import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { SearchIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { AGENCY_SECTIONS, agencyPath } from "@/features/agency-context/lib/agency-paths"
import { useAgencyContext } from "@/features/agency-context/hooks/use-agency-context"
import { BookingsTable } from "../components/bookings-table"
import { CreateBookingDialog } from "../components/create-booking-dialog"
import { useBookingCapabilities } from "../hooks/use-booking-capabilities"
import { useBookings } from "../hooks/use-bookings"
import { useDebouncedValue } from "../hooks/use-debounced-value"
import { getBookingErrorMessage } from "../lib/booking-error-adapter"
import type { AgencyBooking, BookingStatus } from "../types/bookings.types"

/**
 * The bookings of the agency in the URL, newest first.
 *
 * The agency comes from `useAgencyContext`, which resolved `:agencyCode`, so
 * this page has no notion of a "current agency" of its own and two tabs can
 * sit in two agencies at once.
 *
 * Every control here is gated by permission (UX only); the backend guards are
 * authoritative. Searches and the status filter are server-side: the backend
 * matches codes, customer names and tour names, and returns every status.
 */
export function BookingsPage() {
  const { agency } = useAgencyContext()
  const capabilities = useBookingCapabilities()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)

  const [statusFilter, setStatusFilter] = useState<BookingStatus | "">("")

  const [createOpen, setCreateOpen] = useState(false)

  const bookingsQuery = useBookings(
    agency.code,
    debouncedSearch,
    statusFilter === "" ? undefined : statusFilter,
    capabilities.canView
  )

  const openDetails = (booking: AgencyBooking) => {
    navigate(
      `${agencyPath(agency.code, AGENCY_SECTIONS.bookings)}/${encodeURIComponent(booking.code)}`
    )
  }

  if (!capabilities.canView) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title={t("bookings:page.title")}
          description={t("bookings:page.description")}
        />
        <p className="rounded-xl border p-6 text-sm text-muted-foreground">
          {t("bookings:error.loadFailed")}
        </p>
      </div>
    )
  }

  const bookings = bookingsQuery.data ?? []
  const searching = debouncedSearch.trim().length > 0

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("bookings:page.title")}
        description={t("bookings:page.description")}
        actions={
          capabilities.canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              {t("bookings:page.create")}
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("bookings:page.searchPlaceholder")}
            aria-label={t("bookings:page.searchAria")}
            className="ps-8"
          />
        </div>
        <NativeSelect
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as BookingStatus | "")
          }
          className="w-full sm:w-44"
          aria-label={t("bookings:page.filterLabel")}
        >
          <option value="">{t("bookings:page.filterAll")}</option>
          <option value="PENDING">{t("bookings:status.pending")}</option>
          <option value="CONFIRMED">{t("bookings:status.confirmed")}</option>
          <option value="CANCELLED">{t("bookings:status.cancelled")}</option>
        </NativeSelect>
      </div>

      {bookingsQuery.isPending ? (
        <p className="rounded-xl border p-6 text-sm text-muted-foreground">
          {t("bookings:page.loading")}
        </p>
      ) : bookingsQuery.isError ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">
            {getBookingErrorMessage(bookingsQuery.error)}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void bookingsQuery.refetch()}
          >
            {t("bookings:error.retry")}
          </Button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">
            {searching
              ? t("bookings:page.noResults", {
                  query: debouncedSearch.trim(),
                })
              : t("bookings:page.noBookings")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {bookingsQuery.isFetching ? (
            <p className="text-xs text-muted-foreground">
              {t("bookings:page.updating")}
            </p>
          ) : null}
          <BookingsTable bookings={bookings} onViewDetails={openDetails} />
        </div>
      )}

      <CreateBookingDialog
        agencyCode={agency.code}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  )
}