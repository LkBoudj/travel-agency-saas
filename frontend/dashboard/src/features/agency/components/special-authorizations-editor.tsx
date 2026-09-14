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
import { NativeSelect } from "@/components/ui/native-select"
import { createEntityId } from "../api/agency.api"
import { AUTHORIZATION_TYPE_OPTIONS, translateOptions } from "../constants/agency-options"
import type { LegalFormValues } from "../schemas/agency.schemas"

type SpecialAuthorizationsEditorProps = {
  control: Control<LegalFormValues, unknown, LegalFormValues>
  register: UseFormRegister<LegalFormValues>
}

/**
 * Seasonal Omra/Hajj authorizations. Expiry is computed from validUntil
 * (never stored); expired authorizations are shown as inactive and never
 * produce active legal claims.
 */
export function SpecialAuthorizationsEditor({
  control,
  register,
}: SpecialAuthorizationsEditorProps) {
  const { t } = useTranslation()
  const authorizations = useFieldArray({ control, name: "legal.specialAuthorizations" })
  const values = useWatch({ control, name: "legal.specialAuthorizations" }) ?? []

  const today = new Date().toISOString().slice(0, 10)
  const isExpired = (validUntil: string) =>
    validUntil !== "" && validUntil < today

  const add = () => {
    authorizations.append({
      id: createEntityId(),
      type: "omra",
      referenceNumber: "",
      season: "",
      validUntil: "",
    })
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">
          {t("agency:legal.specialAuthorizations.title")}
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-3.5" />
          {t("agency:legal.specialAuthorizations.add")}
        </Button>
      </div>

      {values.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {t("agency:legal.specialAuthorizations.helper")}
        </p>
      )}

      {values.map((authorization, index) => {
        const expired = isExpired(authorization.validUntil)
        return (
          <div
            key={authorization.id}
            className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <NativeSelect
              className="h-8"
              aria-label={t("agency:legal.specialAuthorizations.typeLabel")}
              {...register(`legal.specialAuthorizations.${index}.type`)}
            >
              {translateOptions(AUTHORIZATION_TYPE_OPTIONS, t).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
            <Input
              dir="ltr"
              placeholder={t("agency:legal.specialAuthorizations.referenceNumber.placeholder")}
              aria-label={t("agency:legal.specialAuthorizations.referenceNumber.label")}
              {...register(`legal.specialAuthorizations.${index}.referenceNumber`)}
            />
            <Input
              dir="auto"
              placeholder={t("agency:legal.specialAuthorizations.season.placeholder")}
              aria-label={t("agency:legal.specialAuthorizations.season.label")}
              {...register(`legal.specialAuthorizations.${index}.season`)}
            />
            <div className="flex items-center gap-2">
              <input
                type="date"
                dir="ltr"
                aria-label={t("agency:legal.specialAuthorizations.validUntil.label")}
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                {...register(`legal.specialAuthorizations.${index}.validUntil`)}
              />
              {expired && (
                <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-destructive">
                  {t("agency:legal.specialAuthorizations.expired")}
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("agency:actions.remove")}
                onClick={() => authorizations.remove(index)}
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