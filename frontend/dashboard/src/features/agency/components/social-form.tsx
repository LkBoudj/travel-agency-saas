import { Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  useFieldArray,
  useWatch,
} from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { createEntityId } from "../api/agency.api"
import { useAgencySection } from "../hooks/use-agency-section"
import { SOCIAL_PLATFORM_OPTIONS, translateOptions } from "../constants/agency-options"
import { createSocialSchema, type SocialFormValues } from "../schemas/agency.schemas"
import type { Agency, AgencyPatch } from "../types/agency.types"
import { AgencyField } from "./agency-field"
import { AgencySectionActions } from "./agency-section-actions"
import { AgencySectionHeading } from "./agency-section-heading"

export function SocialForm() {
  const { t } = useTranslation()

  const { form, save, isDirty, isSaving } = useAgencySection<SocialFormValues>({
    schemaFactory: () => createSocialSchema(),
    getDefaults: (agency: Agency) => ({
      socialLinks: agency.socialLinks.map((link) => ({ ...link })),
    }),
    toPatch: (values: SocialFormValues): AgencyPatch => ({
      socialLinks: values.socialLinks,
    }),
    successTitleKey: "agency:actions.socialSaved",
  })

  const { register, control } = form
  const socialLinks = useFieldArray({ control, name: "socialLinks" })
  const watchedLinks = useWatch({ control, name: "socialLinks" }) ?? []

  const add = () => {
    socialLinks.append({
      id: createEntityId(),
      platform: "facebook",
      url: "",
    })
  }

  return (
    <form onSubmit={save} className="grid gap-6">
      <AgencySectionHeading>{t("agency:sections.social")}</AgencySectionHeading>

      <div className="grid gap-3">
        <Button type="button" variant="outline" size="sm" onClick={add} className="justify-self-start">
          <Plus className="size-3.5" />
          {t("agency:social.add")}
        </Button>

        {watchedLinks.map((link, index) => (
          <div key={link.id} className="grid gap-2 sm:grid-cols-3 sm:items-end">
            <AgencyField label={t("agency:social.platformLabel")} htmlFor={`social-${index}-platform`}>
              <NativeSelect
                className="h-8"
                id={`social-${index}-platform`}
                {...register(`socialLinks.${index}.platform`)}
              >
                {translateOptions(SOCIAL_PLATFORM_OPTIONS, t).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </AgencyField>
            <AgencyField label={t("agency:social.url.label")} htmlFor={`social-${index}-url`}>
              <Input
                id={`social-${index}-url`}
                dir="ltr"
                placeholder={t("agency:social.url.placeholder")}
                {...register(`socialLinks.${index}.url`)}
              />
            </AgencyField>
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t("agency:actions.remove")}
                onClick={() => socialLinks.remove(index)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AgencySectionActions isDirty={isDirty} isSaving={isSaving} />
    </form>
  )
}