/** Agency Settings editor navigation sections (order = UI tab order). */
export const AGENCY_EDITOR_SECTIONS = [
  { id: "general", labelKey: "agency:sections.general" },
  { id: "brand", labelKey: "agency:sections.brand" },
  { id: "contacts", labelKey: "agency:sections.contacts" },
  { id: "locations", labelKey: "agency:sections.locations" },
  { id: "services", labelKey: "agency:sections.services" },
  { id: "legal", labelKey: "agency:sections.legal" },
  { id: "social", labelKey: "agency:sections.social" },
] as const

export type AgencySection = (typeof AGENCY_EDITOR_SECTIONS)[number]["id"]