import { X } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useWatch } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { isStructuralChange } from "../domain/trip-readiness"
import type { TripEditor } from "../hooks/use-trip-editor"
import type { TripFormValues } from "../schemas/trip.schema"
import {
  AVAILABILITY_OPTIONS,
  FORMAT_OPTIONS,
  SCOPE_OPTIONS,
  PARTICIPATION_OPTIONS,
  GUIDANCE_OPTIONS,
  translateOptions,
} from "../constants/trip-taxonomy"
import { SectionHeading } from "./section-heading"
import { TripField } from "./trip-field"

type StructuralField = "format" | "geographicScope" | "availabilityMode"

type PendingStructural = {
  field: StructuralField
  value: string
  previous: string
}

/**
 * Side rail card: Trip Setup — format, geographic scope, availability,
 * participation, guidance, and (when guidance applies) languages.
 * Structural switches (format / scope / availability) require explicit user
 * confirmation before the change persists; no silent data destruction.
 */
export function TripSetupCard({ editor }: { editor: TripEditor }) {
  const { t } = useTranslation()
  const {
    register,
    formState: { errors },
  } = editor.form

  const [pending, setPending] = useState<PendingStructural | null>(null)
  const [languageDraft, setLanguageDraft] = useState("")

  const formatOptions = useMemo(() => translateOptions(FORMAT_OPTIONS, t), [t])
  const scopeOptions = useMemo(() => translateOptions(SCOPE_OPTIONS, t), [t])
  const availabilityOptions = useMemo(
    () => translateOptions(AVAILABILITY_OPTIONS, t),
    [t]
  )
  const participationOptions = useMemo(
    () => translateOptions(PARTICIPATION_OPTIONS, t),
    [t]
  )
  const guidanceOptions = useMemo(
    () => translateOptions(GUIDANCE_OPTIONS, t),
    [t]
  )

  const guidanceType =
    useWatch({ name: "guidanceType", control: editor.form.control }) ?? ""
  const languages =
    useWatch({ name: "languages", control: editor.form.control }) ?? []

  const notSpecified = t("trips:overview.notSpecified")
  const showLanguages = guidanceType.length > 0

  const commitStructural = (field: StructuralField, value: string) => {
    editor.form.setValue(
      field,
      value as TripFormValues[StructuralField],
      { shouldDirty: true, shouldTouch: true }
    )
  }

  const selectChanged = (field: StructuralField, value: string) => {
    const previous = editor.form.getValues(field) as string
    if (value === previous) return
    if (isStructuralChange(editor.form.getValues(), field)) {
      setPending({ field, value, previous })
      return
    }
    commitStructural(field, value)
  }

  const confirmPending = () => {
    if (!pending) return
    commitStructural(pending.field, pending.value)
    setPending(null)
  }

  const cancelPending = () => {
    if (!pending) return
    // Revert the select to its previous form value.
    editor.form.setValue(
      pending.field,
      pending.previous as TripFormValues[StructuralField]
    )
    setPending(null)
  }

  const addLanguage = () => {
    const next = languageDraft.trim()
    if (!next || languages.includes(next)) {
      setLanguageDraft("")
      return
    }
    editor.form.setValue("languages", [...languages, next], {
      shouldDirty: true,
    })
    setLanguageDraft("")
  }

  const removeLanguage = (value: string) => {
    editor.form.setValue(
      "languages",
      languages.filter((language) => language !== value),
      { shouldDirty: true }
    )
  }

  return (
    <section className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <SectionHeading helper={t("trips:overview.setup.helper")}>
        {t("trips:overview.setup.title")}
      </SectionHeading>

      <TripField
        label={t("trips:overview.format.label")}
        htmlFor="format"
        error={errors.format?.message}
      >
        <NativeSelect
          id="format"
          aria-label={t("trips:overview.format.label")}
          {...register("format")}
          onChange={(event) => selectChanged("format", event.target.value)}
        >
          <option value="">{t("trips:overview.format.placeholder")}</option>
          {formatOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </TripField>

      <TripField
        label={t("trips:overview.scope.label")}
        htmlFor="geographicScope"
        error={errors.geographicScope?.message}
        helper={t("trips:overview.scope.helper")}
      >
        <NativeSelect
          id="geographicScope"
          aria-label={t("trips:overview.scope.label")}
          {...register("geographicScope")}
          onChange={(event) =>
            selectChanged("geographicScope", event.target.value)
          }
        >
          <option value="">{t("trips:overview.scope.placeholder")}</option>
          {scopeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </TripField>

      <TripField
        label={t("trips:overview.availability.label")}
        htmlFor="availabilityMode"
      >
        <NativeSelect
          id="availabilityMode"
          aria-label={t("trips:overview.availability.label")}
          {...register("availabilityMode")}
          onChange={(event) =>
            selectChanged("availabilityMode", event.target.value)
          }
        >
          {availabilityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </TripField>

      <TripField
        label={t("trips:overview.participation.label")}
        htmlFor="participationMode"
      >
        <NativeSelect
          id="participationMode"
          aria-label={t("trips:overview.participation.label")}
          {...register("participationMode")}
        >
          <option value="">{notSpecified}</option>
          {participationOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </TripField>

      <TripField
        label={t("trips:overview.guidance.label")}
        htmlFor="guidanceType"
      >
        <NativeSelect
          id="guidanceType"
          aria-label={t("trips:overview.guidance.label")}
          {...register("guidanceType")}
        >
          <option value="">{notSpecified}</option>
          {guidanceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </TripField>

      {showLanguages && (
        <TripField
          label={t("trips:overview.languages.label")}
          htmlFor="languages"
          helper={t("trips:overview.languages.helper")}
        >
          {languages.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {languages.map((language) => (
                <li
                  key={language}
                  className="flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs"
                >
                  {language}
                  <button
                    type="button"
                    aria-label={t("trips:overview.languages.removeAria", {
                      language,
                    })}
                    onClick={() => removeLanguage(language)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <input
              id="languages"
              dir="auto"
              value={languageDraft}
              placeholder={t("trips:overview.languages.placeholder")}
              onChange={(event) => setLanguageDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  addLanguage()
                }
              }}
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button type="button" variant="outline" size="sm" onClick={addLanguage}>
              {t("trips:overview.languages.add")}
            </Button>
          </div>
        </TripField>
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) cancelPending()
        }}
        title={t("trips:overview.structuralChange.title")}
        description={t("trips:overview.structuralChange.description")}
        confirmLabel={t("trips:overview.structuralChange.confirm")}
        cancelLabel={t("trips:overview.structuralChange.cancel")}
        onConfirm={confirmPending}
      />
    </section>
  )
}