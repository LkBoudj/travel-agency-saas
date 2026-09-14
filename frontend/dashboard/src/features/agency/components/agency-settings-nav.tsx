import { useTranslation } from "react-i18next"
import { AGENCY_EDITOR_SECTIONS, type AgencySection } from "../constants/agency-sections"

type AgencySettingsNavProps = {
  activeSection: AgencySection
  onSectionChange: (section: AgencySection) => void
}

/**
 * Section navigation for Agency Settings. Stays pinned below the app header
 * while editing any long section. Horizontally scrollable on narrow screens.
 */
export function AgencySettingsNav({
  activeSection,
  onSectionChange,
}: AgencySettingsNavProps) {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t("agency:page.navAria")}
      className="-mx-4 mb-6 flex overflow-x-auto border-b border-border bg-background/95 px-4 backdrop-blur md:-mx-6 md:px-6"
    >
      {AGENCY_EDITOR_SECTIONS.map(({ id, labelKey }) => {
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