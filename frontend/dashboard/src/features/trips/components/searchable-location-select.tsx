import { Combobox } from "@base-ui/react/combobox"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { useMemo, useState } from "react"
import { cn } from "cn"

type LocationOption = { value: string; label: string }

type SearchableLocationSelectProps = {
  id: string
  options: LocationOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  ariaLabel: string
  emptyText: string
  clearAria: string
  /**
   * Aria label for the trigger button (speaks the popup state). Plain label
   * reused for both open/close to stay under the 32px control density.
   */
  triggerAria: string
  error?: string
  disabled?: boolean
}

/**
 * Searchable location picker built on Base UI's Combobox primitive. Used for
 * long controlled lists (Algerian wilayas) where a plain native dropdown is
 * not acceptable. Typing filters, keyboard navigation is native to the
 * primitive, and the stored value is a stable code, not a translated label.
 */
export function SearchableLocationSelect({
  id,
  options,
  value,
  onValueChange,
  placeholder,
  ariaLabel,
  emptyText,
  clearAria,
  triggerAria,
  error,
  disabled,
}: SearchableLocationSelectProps) {
  const [query, setQuery] = useState("")

  const labelByCode = useMemo(
    () => new Map(options.map((option) => [option.value, option.label])),
    [options]
  )

  // Base UI renders the selected value in the input through this callback.
  // Without it a raw string value (the wilaya code) is shown verbatim instead
  // of the localized label. It also receives item objects while filtering.
  const textForValue = useMemo(() => {
    return (item: LocationOption | string | null | undefined) => {
      if (item == null) return ""
      if (typeof item === "string") {
        return labelByCode.get(item) ?? item
      }
      if (typeof item === "object" && "label" in item) {
        return String(item.label ?? "")
      }
      return String(item)
    }
  }, [labelByCode])

  const filteredOptions = useMemo(() => {
    const search = query.trim().toLocaleLowerCase()
    if (!search) return options
    return options.filter((option) =>
      option.label.toLocaleLowerCase().includes(search)
    )
  }, [options, query])

  return (
    <Combobox.Root
      items={filteredOptions}
      value={value || null}
      itemToStringLabel={textForValue}
      onValueChange={(next) =>
        onValueChange(typeof next === "string" ? next : "")
      }
      onInputValueChange={(input) => setQuery(input)}
    >
      <Combobox.InputGroup className="relative h-8">
        <Combobox.Input
          id={id}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-invalid={error ? true : undefined}
          disabled={disabled}
          className="h-8 w-full min-w-0 cursor-pointer rounded-lg border border-input bg-transparent py-1 ps-2.5 pe-14 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30"
        />
        <div className="absolute inset-y-0 end-0 flex items-center gap-0.5 pe-1 text-muted-foreground">
          {value ? (
            <Combobox.Clear
              aria-label={clearAria}
              className="flex size-6 items-center justify-center rounded-md transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </Combobox.Clear>
          ) : null}
          <Combobox.Trigger
            aria-label={triggerAria}
            aria-disabled={disabled}
            className={cn(
              "flex size-6 items-center justify-center rounded-md transition-colors hover:bg-muted hover:text-foreground",
              disabled && "pointer-events-none opacity-50"
            )}
          >
            <ChevronsUpDown className="size-4" />
          </Combobox.Trigger>
        </div>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner
          sideOffset={4}
          align="start"
          className="z-50 outline-none"
        >
          <Combobox.Popup className="w-[var(--anchor-width)] min-w-[var(--anchor-width)] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none">
            <Combobox.Empty className="px-2 py-1.5 text-sm text-muted-foreground">
              {emptyText}
            </Combobox.Empty>
            <Combobox.List className="max-h-64 overflow-y-auto overscroll-contain py-0.5 outline-none">
              {(item: LocationOption) => (
                <Combobox.Item
                  key={item.value}
                  value={item.value}
                  className="relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-muted data-selected:font-medium"
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <Combobox.ItemIndicator className="text-primary">
                    <Check className="size-3.5" aria-hidden />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}