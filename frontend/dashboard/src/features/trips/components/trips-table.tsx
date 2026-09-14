import { useTranslation } from "react-i18next"
import { parseISO } from "date-fns"
import { Image, Pencil } from "lucide-react"
import { Link } from "react-router-dom"
import { ROUTES } from "@/app/router/route-paths"
import { getIntlLocale, type AppLocale } from "@/i18n"
import { BidiText } from "@/components/shared/bidi-text"
import { buttonVariants } from "@/components/ui/button"
import { TRIP_FORMAT_LABELS } from "../types/trip.types"
import type { Trip } from "../types/trip.types"
import { formatTripDuration } from "../utils/format-trip-duration"
import { formatTripPrice } from "../utils/format-trip-price"
import { TripStatusBadge } from "./trip-status-badge"

type TripsTableProps = { trips: Trip[] }

function formatDate(
  value: string | null | undefined,
  locale: AppLocale
): string | null {
  if (!value) return null
  const date = parseISO(value)
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

/**
 * Resource table for trips. Compact operational density: 12px muted header,
 * 13px body, small 32px thumbnails, tabular prices.
 *
 * User-generated names are bidi-isolated so English trip names stay readable
 * inside the Arabic UI; technical references are pinned LTR. The thumbnail is
 * a neutral placeholder surface (never a button). The only row action is
 * Edit — a compact ghost icon button with an accessible name.
 */
export function TripsTable({ trips }: TripsTableProps) {
  const { t, i18n } = useTranslation()
  const locale = (i18n.language ?? "en") as AppLocale

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-[13px]">
        <thead>
          <tr className="border-b text-start text-xs whitespace-nowrap text-muted-foreground">
            <th className="px-3 py-2.5 font-medium">{t("trips:table.columnTrip")}</th>
            <th className="px-3 py-2.5 font-medium">{t("trips:table.columnDestination")}</th>
            <th className="hidden px-3 py-2.5 font-medium md:table-cell">
              {t("trips:table.columnFormat")}
            </th>
            <th className="hidden px-3 py-2.5 font-medium lg:table-cell">
              {t("trips:table.columnNextDeparture")}
            </th>
            <th className="hidden px-3 py-2.5 text-end font-medium md:table-cell">
              {t("trips:table.columnPrice")}
            </th>
            <th className="px-3 py-2.5 font-medium">{t("trips:table.columnStatus")}</th>
            <th className="px-3 py-2.5 text-end font-medium">{t("trips:table.columnActions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {trips.map((trip) => {
            const primaryDestination = trip.destinations[0]?.name
            const extraCount = Math.max(0, trip.destinations.length - 1)
            return (
              <tr key={trip.id} className="hover:bg-muted/40">
                <td className="px-3 py-2 align-middle">
                  <Link
                    to={`${ROUTES.trips}/${trip.id}`}
                    className="flex items-center gap-3"
                  >
                    {trip.coverImageUrl ? (
                      <img
                        src={trip.coverImageUrl}
                        alt=""
                        className="size-8 shrink-0 rounded-md border object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground/70"
                      >
                        <Image className="size-4" />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">
                        <BidiText>{trip.name}</BidiText>
                      </span>
                      {trip.internalRef && (
                        <span
                          dir="ltr"
                          className="block truncate text-xs text-muted-foreground"
                        >
                          {trip.internalRef}
                        </span>
                      )}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2 align-middle whitespace-nowrap text-muted-foreground">
                  <BidiText>{primaryDestination}</BidiText>
                  {extraCount > 0 && (
                    <span className="text-muted-foreground/70">
                      {" "}
                      <span dir="ltr" className="tabular-nums">
                        +{extraCount}
                      </span>{" "}
                      {t("trips:table.moreDestinations")}
                    </span>
                  )}
                </td>
                <td className="hidden px-3 py-2 align-middle whitespace-nowrap text-muted-foreground md:table-cell">
                  <span>{t(TRIP_FORMAT_LABELS[trip.format])}</span>
                  <span className="text-muted-foreground/70">
                    {" "}
                    · {formatTripDuration(trip, t)}
                  </span>
                </td>
                <td className="hidden px-3 py-2 align-middle whitespace-nowrap text-muted-foreground lg:table-cell">
                  {formatDate(trip.nextDeparture, locale) ?? t("trips:table.noUpcomingDeparture")}
                </td>
                <td className="hidden px-3 py-2 text-end align-middle whitespace-nowrap tabular-nums md:table-cell">
                  {trip.startingPrice ? (
                    <span className="whitespace-nowrap text-muted-foreground">
                      {t("trips:table.fromPrice")}{" "}
                      <span className="font-medium text-foreground">
                        <BidiText>{formatTripPrice(trip.startingPrice, locale)}</BidiText>
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/70">—</span>
                  )}
                </td>
                <td className="px-3 py-2 align-middle">
                  <TripStatusBadge status={trip.status} />
                </td>
                <td className="px-3 py-2 align-middle">
                  <div className="flex items-center justify-end">
                    <Link
                      to={`${ROUTES.trips}/${trip.id}`}
                      aria-label={t("trips:table.editTripAria", {
                        name: trip.name,
                      })}
                      className={buttonVariants({
                        variant: "ghost",
                        size: "icon-sm",
                      })}
                    >
                      <Pencil className="size-4" />
                    </Link>
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