import { useState } from "react"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/shared/page-header"
import { useAgency } from "../hooks/use-agency"
import { AgencyReadinessCard } from "../components/agency-readiness-card"
import { BrandForm } from "../components/brand-form"
import { ContactsForm } from "../components/contacts-form"
import { GeneralForm } from "../components/general-form"
import { LegalForm } from "../components/legal-form"
import { LocationsForm } from "../components/locations-form"
import { ServicesForm } from "../components/services-form"
import { SocialForm } from "../components/social-form"
import {
  AgencySettingsNav,
} from "../components/agency-settings-nav"
import type { AgencySection } from "../constants/agency-sections"

/**
 * Agency Settings page (/agency). Six section forms stay mounted so switching
 * tabs never destroys unsaved edits; inactive sections are hidden with the
 * `hidden` attribute. Each section owns only its own slice — a save updates
 * the canonical Agency and resets only that section.
 */
export function AgencySettingsPage() {
  const { t } = useTranslation()
  const { agency, isLoading } = useAgency()
  const [activeSection, setActiveSection] = useState<AgencySection>("general")

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl animate-pulse space-y-4 pt-4">
        <div className="h-8 w-52 rounded-md bg-muted" />
        <div className="h-32 rounded-lg border bg-card" />
      </div>
    )
  }

  if (!agency) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <PageHeader
          title={t("agency:page.title")}
          description={t("agency:page.description")}
        />
        <div className="rounded-lg border bg-card p-8 text-center">
          <h2 className="text-sm font-semibold text-foreground">
            {t("agency:page.noAgencyTitle")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("agency:page.noAgencyDescription")}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <PageHeader
        title={t("agency:page.title")}
        description={t("agency:page.description")}
      />

      <AgencyReadinessCard />

      <AgencySettingsNav
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div hidden={activeSection !== "general"}>
          <GeneralForm />
        </div>
        <div hidden={activeSection !== "brand"}>
          <BrandForm />
        </div>
        <div hidden={activeSection !== "contacts"}>
          <ContactsForm />
        </div>
        <div hidden={activeSection !== "locations"}>
          <LocationsForm />
        </div>
        <div hidden={activeSection !== "services"}>
          <ServicesForm />
        </div>
        <div hidden={activeSection !== "legal"}>
          <LegalForm />
        </div>
        <div hidden={activeSection !== "social"}>
          <SocialForm />
        </div>
      </div>
    </div>
  )
}