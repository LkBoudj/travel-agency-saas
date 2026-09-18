import { ArrowLeft, ArrowRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useWatch } from "react-hook-form"
import { Link } from "react-router-dom"
import { AGENCY_SECTIONS, agencyPath } from "@/features/agency-context/lib/agency-paths"
import { useAgencyContext } from "@/features/agency-context/hooks/use-agency-context"
import { useIsRtl } from "@/i18n"
import type { TripEditor } from "../hooks/use-trip-editor"
import type { TripStatus } from "../types/trip.types"
import { TripStatusBadge } from "./trip-status-badge"

/**
 * v4 editor header: back link, breadcrumb ("Trips › name"), inline name edit
 * bound to the same draft/save path as the rest of the form, and the status
 * badge. User-entered names keep their reading direction (dir="auto").
 */
export function TripEditorHeader({
  editor,
}: {
  editor: TripEditor
}) {
  const { agency } = useAgencyContext()
  const tripsPath = agencyPath(agency.code, AGENCY_SECTIONS.trips)
  const { t } = useTranslation()
  const isRtl = useIsRtl()
  const { register, formState } = editor.form

  const status = (useWatch({ name: "status", control: editor.form.control }) ??
    "draft") as TripStatus

  const BackIcon = isRtl ? ArrowRight : ArrowLeft

  return (
    <header className="flex items-center gap-3 py-1">
      <Link
        to={tripsPath}
        aria-label={t("trips:editor.header.backAria")}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <BackIcon className="size-4" />
      </Link>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted-foreground">
          <Link
            to={tripsPath}
            className="transition-colors hover:text-foreground"
          >
            {t("trips:editor.header.tripsCrumb")}
          </Link>
          <span className="mx-1.5" aria-hidden>
            ›
          </span>
        </p>
        <input
          dir="auto"
          aria-label={t("trips:editor.header.nameAria")}
          placeholder={t("trips:editor.header.untitled")}
          aria-invalid={formState.errors.name ? true : undefined}
          className="w-full max-w-md rounded-md border border-transparent bg-transparent px-1 py-0.5 text-lg font-semibold tracking-tight outline-none transition-colors hover:border-border focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
          {...register("name")}
        />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <TripStatusBadge status={status} />
      </div>
    </header>
  )
}