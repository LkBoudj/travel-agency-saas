import { Plus, X } from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useWatch } from "react-hook-form"
import type { UseFormRegister } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import type { TripFormValues } from "../schemas/trip.schema"
import {
  PRICING_BASIS_LABELS,
  type TransportMode,
  type AccommodationType,
} from "../types/trip.types"
import type { TripEditor } from "../hooks/use-trip-editor"
import {
  TRANSPORT_OPTIONS,
  ACCOMMODATION_OPTIONS,
  DIFFICULTY_OPTIONS,
  FITNESS_OPTIONS,
  requiresActivityRequirements,
  translateOptions,
} from "../constants/trip-taxonomy"
import { SectionHeading } from "./section-heading"
import { TaxonomyPicker } from "./taxonomy-picker"
import { TripField } from "./trip-field"

type TripDetailsFormProps = Pick<TripEditor, "form" | "fieldArrays">

/** Details section: logistics, inclusions, exclusions, policies, and extras. */
export function TripDetailsForm({ form, fieldArrays }: TripDetailsFormProps) {
  const { t } = useTranslation()
  const { register, control, setValue, formState } = form
  const { included, notIncluded, extras, highlights } = fieldArrays

  const transportModes = useWatch({ name: "transportModes", control }) ?? []
  const accommodationTypes = useWatch({
    name: "accommodationTypes",
    control,
  }) ?? []
  const activities = useWatch({ name: "activities", control }) ?? []

  const transportOptions = useMemo(() => translateOptions(TRANSPORT_OPTIONS, t), [t])
  const accommodationOptions = useMemo(
    () => translateOptions(ACCOMMODATION_OPTIONS, t),
    [t]
  )
  const difficultyOptions = useMemo(
    () => translateOptions(DIFFICULTY_OPTIONS, t),
    [t]
  )
  const fitnessOptions = useMemo(
    () => translateOptions(FITNESS_OPTIONS, t),
    [t]
  )
  const basisOptions = Object.entries(PRICING_BASIS_LABELS)

  const includedTitle = t("trips:details.includedTitle")
  const notIncludedTitle = t("trips:details.notIncludedTitle")
  const notSpecified = t("trips:overview.notSpecified")
  const optionalNumber = (value: string) =>
    value === "" ? undefined : Number(value)
  const showActivityRequirements = requiresActivityRequirements(activities)

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <SectionHeading helper={t("trips:details.contentHelper")}>
          {t("trips:details.contentTitle")}
        </SectionHeading>

        <TripField
          label={t("trips:overview.fullDescription.label")}
          htmlFor="description"
          helper={t("trips:overview.fullDescription.helper")}
        >
          <Textarea
            id="description"
            rows={5}
            placeholder={t("trips:overview.fullDescription.placeholder")}
            {...register("description")}
          />
        </TripField>

        <div className="grid gap-1.5">
          <SectionHeading>
            {t("trips:overview.highlights.title")}
          </SectionHeading>
          {highlights.fields.map((highlight, index) => (
            <div key={highlight.id} className="flex items-center gap-2">
              <Input
                placeholder={t("trips:overview.highlights.placeholder")}
                aria-label={t("trips:overview.highlights.placeholder")}
                {...register(`highlights.${index}.text`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("trips:overview.highlights.removeAria", {
                  n: index + 1,
                })}
                onClick={() => highlights.remove(index)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-self-start text-primary"
            onClick={() => highlights.append({ text: "" })}
          >
            <Plus className="size-4" />
            {t("trips:overview.highlights.add")}
          </Button>
        </div>

        {showActivityRequirements && (
          <div className="grid gap-1.5">
            <SectionHeading>
              {t("trips:overview.activityRequirements.title")}
            </SectionHeading>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TripField
                label={t("trips:overview.difficultyLabel")}
                htmlFor="activityRequirements.difficulty"
              >
                <NativeSelect
                  id="activityRequirements.difficulty"
                  aria-label={t("trips:overview.difficultyLabel")}
                  {...register("activityRequirements.difficulty")}
                >
                  <option value="">{notSpecified}</option>
                  {difficultyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </TripField>

              <TripField
                label={t("trips:overview.fitnessLabel")}
                htmlFor="activityRequirements.fitnessLevel"
              >
                <NativeSelect
                  id="activityRequirements.fitnessLevel"
                  aria-label={t("trips:overview.fitnessLabel")}
                  {...register("activityRequirements.fitnessLevel")}
                >
                  <option value="">{notSpecified}</option>
                  {fitnessOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </TripField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TripField
                label={t("trips:overview.distanceLabel")}
                htmlFor="activityRequirements.distanceKm"
                error={formState.errors.activityRequirements?.distanceKm?.message}
              >
                <Input
                  id="activityRequirements.distanceKm"
                  type="number"
                  min={0}
                  dir="ltr"
                  placeholder="10"
                  {...register("activityRequirements.distanceKm", {
                    setValueAs: optionalNumber,
                  })}
                />
              </TripField>

              <TripField
                label={t("trips:overview.elevationLabel")}
                htmlFor="activityRequirements.elevationGainM"
                error={
                  formState.errors.activityRequirements?.elevationGainM?.message
                }
              >
                <Input
                  id="activityRequirements.elevationGainM"
                  type="number"
                  min={0}
                  dir="ltr"
                  placeholder="800"
                  {...register("activityRequirements.elevationGainM", {
                    setValueAs: optionalNumber,
                  })}
                />
              </TripField>

              <TripField
                label={t("trips:overview.minimumAgeLabel")}
                htmlFor="activityRequirements.minimumAge"
                error={
                  formState.errors.activityRequirements?.minimumAge?.message
                }
              >
                <Input
                  id="activityRequirements.minimumAge"
                  type="number"
                  min={0}
                  dir="ltr"
                  placeholder="10"
                  {...register("activityRequirements.minimumAge", {
                    setValueAs: optionalNumber,
                  })}
                />
              </TripField>
            </div>

            <TripField
              label={t("trips:overview.equipment.label")}
              htmlFor="activityRequirements.requiredEquipment"
            >
              <Input
                id="activityRequirements.requiredEquipment"
                placeholder={t("trips:overview.equipment.placeholder")}
                {...register("activityRequirements.requiredEquipment")}
              />
            </TripField>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <TextList
          title={includedTitle}
          helper={t("trips:details.includedHelper")}
          placeholder={t("trips:details.includedPlaceholder")}
          fieldArray={included}
          registerName="included"
          register={register}
        />
        <TextList
          title={notIncludedTitle}
          helper={t("trips:details.notIncludedHelper")}
          placeholder={t("trips:details.notIncludedPlaceholder")}
          fieldArray={notIncluded}
          registerName="notIncluded"
          register={register}
        />
      </div>

      <div className="grid gap-3">
        <SectionHeading helper={t("trips:details.logisticsHelper")}>
          {t("trips:details.logisticsTitle")}
        </SectionHeading>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TaxonomyPicker
            label={t("trips:details.transportLabel")}
            htmlFor="transportModes"
            options={transportOptions}
            selected={transportModes}
            onAdd={(value) =>
              setValue(
                "transportModes",
                [...transportModes, value] as TransportMode[]
              )
            }
            onRemove={(value) =>
              setValue(
                "transportModes",
                transportModes.filter((mode) => mode !== value)
              )
            }
            onClear={() => setValue("transportModes", [])}
            placeholder={t("trips:details.transportPlaceholder")}
          />

          <TaxonomyPicker
            label={t("trips:details.accommodationLabel")}
            htmlFor="accommodationTypes"
            options={accommodationOptions}
            selected={accommodationTypes}
            onAdd={(value) =>
              setValue(
                "accommodationTypes",
                [...accommodationTypes, value] as AccommodationType[]
              )
            }
            onRemove={(value) =>
              setValue(
                "accommodationTypes",
                accommodationTypes.filter((type) => type !== value)
              )
            }
            onClear={() => setValue("accommodationTypes", [])}
            placeholder={t("trips:details.accommodationPlaceholder")}
            helper={t("trips:details.accommodationHelper")}
          />
        </div>
      </div>

      <div className="grid gap-3">
        <SectionHeading helper={t("trips:details.policiesHelper")}>
          {t("trips:details.policiesTitle")}
        </SectionHeading>

        <TripField
          label={t("trips:details.importantInfo.label")}
          htmlFor="importantInformation"
          helper={t("trips:details.importantInfo.helper")}
        >
          <Textarea
            id="importantInformation"
            rows={4}
            placeholder={t("trips:details.importantInfo.placeholder")}
            {...register("importantInformation")}
          />
        </TripField>

        <TripField
          label={t("trips:details.cancellation.label")}
          htmlFor="cancellationPolicy"
          helper={t("trips:details.cancellation.helper")}
        >
          <Textarea
            id="cancellationPolicy"
            rows={3}
            placeholder={t("trips:details.cancellation.placeholder")}
            {...register("cancellationPolicy")}
          />
        </TripField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TripField
            label={t("trips:details.meetingPoint.label")}
            htmlFor="meetingPoint"
          >
            <Input
              id="meetingPoint"
              placeholder={t("trips:details.meetingPoint.placeholder")}
              {...register("meetingPoint")}
            />
          </TripField>

          <TripField
            label={t("trips:details.meetingInstructions.label")}
            htmlFor="meetingInstructions"
          >
            <Input
              id="meetingInstructions"
              placeholder={t("trips:details.meetingInstructions.placeholder")}
              {...register("meetingInstructions")}
            />
          </TripField>
        </div>
      </div>

      <div className="grid gap-3">
        <SectionHeading helper={t("trips:details.extras.helper")}>
          {t("trips:details.extras.title")}
        </SectionHeading>

        {extras.fields.map((extra, index) => (
          <div key={extra.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <TripField
                  label={t("trips:details.extras.nameLabel")}
                  htmlFor={`extras.${index}.name`}
                >
                  <Input
                    id={`extras.${index}.name`}
                    placeholder={t("trips:details.extras.namePlaceholder")}
                    {...register(`extras.${index}.name`)}
                  />
                </TripField>
                <TripField
                  label={t("trips:details.extras.priceLabel")}
                  htmlFor={`extras.${index}.price`}
                >
                  <div className="flex items-center gap-2">
                    <Input
                      id={`extras.${index}.price`}
                      type="number"
                      min={0}
                      dir="ltr"
                      placeholder={t("trips:details.extras.pricePlaceholder")}
                      {...register(`extras.${index}.price`, {
                        valueAsNumber: true,
                      })}
                    />
                    <span className="text-xs text-muted-foreground">DZD</span>
                  </div>
                </TripField>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("trips:details.extras.removeAria", {
                  n: index + 1,
                })}
                onClick={() => extras.remove(index)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <TripField
                label={t("trips:details.extras.descriptionLabel")}
                htmlFor={`extras.${index}.description`}
              >
                <Textarea
                  id={`extras.${index}.description`}
                  rows={2}
                  placeholder={t("trips:details.extras.descriptionPlaceholder")}
                  {...register(`extras.${index}.description`)}
                />
              </TripField>

              <TripField
                label={t("trips:details.extras.basisLabel")}
                htmlFor={`extras.${index}.basis`}
              >
                <NativeSelect
                  id={`extras.${index}.basis`}
                  className="w-36"
                  {...register(`extras.${index}.basis`)}
                >
                  {basisOptions.map(([value, labelKey]) => (
                    <option key={value} value={value}>
                      {t(labelKey)}
                    </option>
                  ))}
                </NativeSelect>
              </TripField>
            </div>
          </div>
        ))}

        {extras.fields.length === 0 && (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            {t("trips:details.extras.empty")}
          </p>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-self-start text-primary"
          onClick={() =>
            extras.append({
              name: "",
              description: "",
              price: 0,
              basis: "per_person",
            })
          }
        >
          <Plus className="size-4" />
          {t("trips:details.extras.add")}
        </Button>
      </div>
    </div>
  )
}

type TextListProps = {
  title: string
  helper: string
  placeholder: string
  fieldArray:
    | TripEditor["fieldArrays"]["included"]
    | TripEditor["fieldArrays"]["notIncluded"]
  registerName: "included" | "notIncluded"
  register: UseFormRegister<TripFormValues>
}

/** Flat repeatable list editor for included / not-included items. */
function TextList({
  title,
  helper,
  placeholder,
  fieldArray,
  registerName,
  register,
}: TextListProps) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-1.5">
      <SectionHeading helper={helper}>{title}</SectionHeading>
      {fieldArray.fields.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2">
          <Input
            placeholder={placeholder}
            aria-label={t("trips:details.textList.itemAria", {
              label: title,
              n: index + 1,
            })}
            {...register(`${registerName}.${index}.text`)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("trips:details.textList.removeAria", {
              label: title,
              n: index + 1,
            })}
            onClick={() => fieldArray.remove(index)}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-self-start text-primary"
        onClick={() => fieldArray.append({ text: "" })}
      >
        <Plus className="size-4" />
        {t("trips:details.textList.add")}
      </Button>
    </div>
  )
}