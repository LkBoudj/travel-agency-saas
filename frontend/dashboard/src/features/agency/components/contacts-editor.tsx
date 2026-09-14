import { Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  useFieldArray,
  useWatch,
  type Control,
  type UseFormRegister,
} from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createEntityId } from "../api/agency.api"
import {
  CONTACT_TYPE_OPTIONS,
  VISIBILITY_OPTIONS,
} from "../constants/agency-options"
import type { ContactsFormValues } from "../schemas/agency.schemas"
import type { ContactType, Visibility } from "../types/agency.types"

const ADD_LABEL_KEYS: Record<ContactType, string> = {
  phone: "agency:contacts.add.phone",
  mobile: "agency:contacts.add.mobile",
  whatsapp: "agency:contacts.add.whatsapp",
  email: "agency:contacts.add.email",
}

type ContactsEditorProps = {
  control: Control<ContactsFormValues, unknown, ContactsFormValues>
  register: UseFormRegister<ContactsFormValues>
}

/**
 * Structured contacts editor. At most one primary per contact type: toggling
 * Primary on a row clears it on every other row of the same type. Internal
 * contacts never count toward public readiness.
 */
export function ContactsEditor({ control, register }: ContactsEditorProps) {
  const { t } = useTranslation()
  const contacts = useFieldArray({ control, name: "contacts" })
  const values = useWatch({ control, name: "contacts" }) ?? []

  const add = (type: ContactType) => {
    contacts.append({
      id: createEntityId(),
      type,
      value: "",
      visibility: "public",
      isPrimary: false,
    })
  }

  const setVisibility = (index: number, visibility: Visibility) => {
    const current = values[index]
    if (!current) return
    contacts.update(index, { ...current, visibility })
  }

  const togglePrimary = (index: number) => {
    const target = values[index]
    if (!target) return
    values.forEach((contact, i) => {
      if (i === index) {
        contacts.update(i, { ...contact, isPrimary: true })
      } else if (contact.type === target.type && contact.isPrimary) {
        contacts.update(i, { ...contact, isPrimary: false })
      }
    })
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {CONTACT_TYPE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => add(option.value)}
          >
            <Plus className="size-3.5" />
            {t(ADD_LABEL_KEYS[option.value])}
          </Button>
        ))}
      </div>

      {values.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {t("agency:contacts.helper")}
        </p>
      )}

      {values.map((contact, index) => {
        const typeOption = CONTACT_TYPE_OPTIONS.find(
          (option) => option.value === contact.type
        )
        const typeLabel = typeOption ? t(typeOption.labelKey) : contact.type
        const numeric = contact.type !== "email"

        return (
          <div
            key={contact.id}
            className="rounded-lg border border-border p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-14 shrink-0 text-xs font-medium">{typeLabel}</span>
              <Input
                className="h-8 min-w-40 flex-1"
                dir={numeric ? "ltr" : "auto"}
                inputMode={numeric ? "tel" : "email"}
                placeholder={t("agency:contacts.valuePlaceholder")}
                aria-label={t("agency:contacts.valueLabel")}
                {...register(`contacts.${index}.value`)}
              />
              <div
                role="group"
                aria-label={t("agency:visibility.public")}
                className="flex rounded-lg border border-border p-0.5"
              >
                {VISIBILITY_OPTIONS.map((option) => {
                  const active = contact.visibility === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setVisibility(index, option.value)}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t(option.labelKey)}
                    </button>
                  )
                })}
              </div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  checked={contact.isPrimary}
                  onChange={() => togglePrimary(index)}
                  className="size-3.5 accent-primary"
                  aria-label={t("agency:contacts.primary")}
                />
                {t("agency:contacts.primary")}
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("agency:actions.remove")}
                onClick={() => contacts.remove(index)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}