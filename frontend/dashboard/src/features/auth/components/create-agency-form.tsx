import type { BaseSyntheticEvent } from "react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CreateAgencyFormValues } from "../schemas/create-agency.schema"

export type CreateAgencyFormProps = {
  /** Form orchestration built by the `use-create-agency` hook. */
  form: UseFormReturn<CreateAgencyFormValues>
  /** Live slug value, used for the URL preview. */
  slug: string
  /** Whether the URL input is being edited inline. */
  isEditingSlug: boolean
  /** Platform domain rendered next to the slug. */
  platformDomain: string
  /** Toggles inline URL editing. */
  toggleSlugEditing: () => void
  /** Leaves inline URL editing mode. */
  stopSlugEditing: () => void
  /** Pre-built submit handler from the `use-create-agency` hook. */
  handleSubmit: (e?: BaseSyntheticEvent) => void
}

export function CreateAgencyForm({
  form,
  slug,
  isEditingSlug,
  platformDomain,
  toggleSlugEditing,
  stopSlugEditing,
  handleSubmit,
}: CreateAgencyFormProps) {
  const { t } = useTranslation()
  const {
    register,
    formState: { errors },
  } = form

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-4"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="agencyName">{t("auth:createAgency.agencyNameLabel")}</Label>
        <Input
          id="agencyName"
          placeholder={t("auth:createAgency.agencyNamePlaceholder")}
          autoComplete="organization"
          aria-invalid={errors.agencyName ? true : undefined}
          aria-describedby={errors.agencyName ? "agencyName-error" : undefined}
          {...register("agencyName")}
        />
        {errors.agencyName && (
          <p id="agencyName-error" className="text-xs text-destructive">
            {errors.agencyName.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-1.5">
          {isEditingSlug ? (
            <Input
              autoFocus
              className="h-7 border-0 bg-transparent px-0 font-mono text-sm shadow-none focus-visible:ring-0"
              aria-label={t("auth:createAgency.slugAria")}
              dir="ltr"
              aria-invalid={errors.slug ? true : undefined}
              {...register("slug")}
              onBlur={stopSlugEditing}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  stopSlugEditing()
                }
              }}
            />
          ) : (
            <span className="min-w-0 truncate font-mono text-sm" dir="ltr">
              <span className="text-foreground">{slug || "your-agency"}</span>
              <span className="text-muted-foreground">.{platformDomain}</span>
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs"
            onClick={toggleSlugEditing}
          >
            {isEditingSlug
              ? t("auth:createAgency.done")
              : t("auth:createAgency.editUrl")}
          </Button>
        </div>
        {errors.slug && (
          <p className="text-xs text-destructive">{errors.slug.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {t("auth:createAgency.slugHelper")}{" "}
          <span className="font-mono" dir="ltr">
            {slug || "your-agency"}.{platformDomain}
          </span>
        </p>
      </div>

      <Button type="submit" className="mt-2 w-full">
        {t("auth:createAgency.submit")}
      </Button>
    </form>
  )
}