import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { BookingSettingsSection } from "../components/booking-settings-section"
import { DeparturesAndPricingSection } from "../components/departures-and-pricing-section"
import { ItineraryEditor } from "../components/itinerary-editor"
import { TripDetailsForm } from "../components/trip-details-form"
import { TripEditorHeader } from "../components/trip-editor-header"
import { TripEditorNav } from "../components/trip-editor-nav"
import { TripMediaSection } from "../components/trip-media-section"
import { TripOverviewForm } from "../components/trip-overview-form"
import {
  useTripEditor,
  type TripEditorSection,
} from "../hooks/use-trip-editor"

/** Trip editor shell for `/trips/:tripId` (v4). */
export function TripEditorPage() {
  const { t } = useTranslation()
  const { tripId } = useParams()
  const editor = useTripEditor(tripId)
  const { activeSection, setActiveSection } = editor

  const renderSection = (section: TripEditorSection) => {
    switch (section) {
      case "itinerary":
        return <ItineraryEditor {...editor} />
      case "departures":
        return <DeparturesAndPricingSection {...editor} />
      case "details":
        return <TripDetailsForm {...editor} />
      case "media":
        return <TripMediaSection {...editor} />
      case "booking":
        return <BookingSettingsSection editor={editor} />
      default:
        return null
    }
  }

  const isOverview = activeSection === "overview"

  return (
    <form onSubmit={editor.save} className="mx-auto w-full max-w-6xl">
      <TripEditorHeader editor={editor} />

      <TripEditorNav
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="grid gap-6">
        {isOverview ? (
          <TripOverviewForm editor={editor} />
        ) : (
          <div className="grid gap-6 rounded-lg border bg-card p-4 sm:p-6">
            {renderSection(activeSection)}
          </div>
        )}
      </div>

      <TripEditorFooter editor={editor} />

      <ConfirmDialog
        open={editor.publishedSaveBlocked}
        onOpenChange={(open) => {
          if (!open) editor.resetSaveBlock()
        }}
        title={t("trips:editor.publishGuard.title")}
        description={t("trips:editor.publishGuard.description")}
        confirmLabel={t("trips:editor.publishGuard.confirm")}
        cancelLabel={t("trips:editor.publishGuard.cancel")}
        onConfirm={editor.unpublishAndSave}
        destructive
      />
    </form>
  )
}

type TripEditorFooterProps = {
  editor: ReturnType<typeof useTripEditor>
}

/**
 * Global dirty bar (v4): appears ONLY while the draft differs from the saved
 * snapshot — "Unsaved changes" + Discard + Save. No autosave, never shown
 * when clean. Save is guarded by the publish policy in the editor hook.
 */
function TripEditorFooter({ editor }: TripEditorFooterProps) {
  const { t } = useTranslation()
  const { isDirty, discard } = editor

  if (!isDirty) return null

  return (
    <div
      className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6"
      data-slot="trip-editor-footer"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden className="size-1.5 rounded-full bg-primary" />
          {t("trips:editor.footer.unsaved")}
        </span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={discard}>
            {t("trips:editor.footer.discard")}
          </Button>
          <Button type="submit">
            {t("trips:editor.footer.saveChanges")}
          </Button>
        </div>
      </div>
    </div>
  )
}