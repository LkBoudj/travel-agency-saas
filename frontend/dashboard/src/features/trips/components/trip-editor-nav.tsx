import { useTranslation } from "react-i18next"
import {
  TRIP_EDITOR_SECTIONS,
  type TripEditorSection,
} from "../hooks/use-trip-editor"

type TripEditorNavProps = {
  activeSection: TripEditorSection
  onSectionChange: (section: TripEditorSection) => void
}

/**
 * Section navigation for the trip editor. Stays pinned below the app header
 * while editing any long section, so the current context is always visible.
 * Horizontally scrollable on narrow screens.
 */
export function TripEditorNav({
  activeSection,
  onSectionChange,
}: TripEditorNavProps) {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t("trips:editor.navAria")}
      className="sticky top-12 z-10 -mx-4 mb-6 flex overflow-x-auto border-b border-border bg-background/95 px-4 backdrop-blur md:-mx-6 md:px-6"
    >
      {TRIP_EDITOR_SECTIONS.map(({ id, labelKey }) => {
        const active = id === activeSection
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSectionChange(id)}
            aria-current={active ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(labelKey)}
          </button>
        )
      })}
    </nav>
  )
}