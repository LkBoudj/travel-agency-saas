import { useTranslation } from "react-i18next"
import { useAgencySection } from "../hooks/use-agency-section"
import { createContactsSchema, type ContactsFormValues } from "../schemas/agency.schemas"
import type { Agency, AgencyPatch } from "../types/agency.types"
import { ContactsEditor } from "./contacts-editor"
import { AgencySectionActions } from "./agency-section-actions"
import { AgencySectionHeading } from "./agency-section-heading"

export function ContactsForm() {
  const { t } = useTranslation()

  const { form, save, isDirty, isSaving } = useAgencySection<ContactsFormValues>({
    schemaFactory: createContactsSchema,
    getDefaults: (agency: Agency) => ({
      contacts: agency.contacts.map((contact) => ({ ...contact })),
    }),
    toPatch: (values: ContactsFormValues): AgencyPatch => ({
      contacts: values.contacts,
    }),
    successTitleKey: "agency:actions.contactsSaved",
  })

  const { control, register } = form

  return (
    <form onSubmit={save} className="grid gap-6">
      <AgencySectionHeading helper={t("agency:contacts.helper")}>
        {t("agency:sections.contacts")}
      </AgencySectionHeading>

      <ContactsEditor control={control} register={register} />

      <AgencySectionActions isDirty={isDirty} isSaving={isSaving} />
    </form>
  )
}