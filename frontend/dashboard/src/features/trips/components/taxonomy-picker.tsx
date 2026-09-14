import { X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"

type TaxonomyOption = { value: string; label: string }

type TaxonomyPickerProps = {
  label: string
  htmlFor: string
  options: TaxonomyOption[]
  selected: string[]
  onAdd: (value: string) => void
  onRemove: (value: string) => void
  onClear: () => void
  placeholder: string
  helper?: string
}

/**
 * Compact multi-select picker used across the trip classification fields.
 *
 * Options are added through a native select and removed as chips, avoiding
 * wall-of-checkboxes layouts while staying fully keyboard accessible.
 */
export function TaxonomyPicker({
  label,
  htmlFor,
  options,
  selected,
  onAdd,
  onRemove,
  onClear,
  placeholder,
  helper,
}: TaxonomyPickerProps) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={htmlFor}>{label}</Label>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("trips:taxonomy.clearAll")}
          </button>
        )}
      </div>

      <NativeSelect
        id={htmlFor}
        value=""
        onChange={(e) => {
          if (e.target.value) onAdd(e.target.value)
        }}
        aria-label={t("trips:taxonomy.addAria", { label })}
        className="w-full"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>

      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((value) => {
          const option = options.find((o) => o.value === value)
          const labelText = option?.label ?? value
          return (
            <span
              key={value}
              className="inline-flex items-center gap-1 rounded-md border bg-muted/40 py-0.5 ps-2 pe-1 text-xs text-foreground"
            >
              {labelText}
              <button
                type="button"
                aria-label={t("trips:taxonomy.removeAria", {
                  label: labelText,
                })}
                onClick={() => onRemove(value)}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </span>
          )
        })}
      </div>

      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  )
}