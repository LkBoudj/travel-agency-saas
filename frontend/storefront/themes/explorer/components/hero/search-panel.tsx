"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { startOfMonth } from "date-fns";
import { MapPin, CalendarDays, Users, Search, ChevronDown } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  formatRange,
  SEARCHABLE_DESTINATIONS,
  useTourSearch,
} from "@/features/search";

const FIELD_CELL =
  "relative flex items-center gap-4 px-5 py-[22px] sm:px-8 transition-colors hover:bg-slate-50/60 focus-within:bg-[color-mix(in_srgb,var(--panel-primary)_5%,transparent)]";

const SEPARATOR =
  "pointer-events-none absolute left-0 top-1/2 hidden h-10 w-px -translate-y-1/2 bg-slate-900/[0.08] lg:block";

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
      {children}
    </span>
  );
}

function TravelerControl({
  label,
  sublabel,
  value,
  min,
  onChange,
}: {
  label: string;
  sublabel: string;
  value: number;
  min: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="text-[15px] font-medium text-slate-900">{label}</div>
        <div className="text-[13px] text-slate-500">{sublabel}</div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="w-5 text-center text-[15px] font-medium tabular-nums text-slate-900">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function SearchPanel() {
  const {
    destination,
    setDestination,
    dateRange,
    setDateRange,
    adults,
    children,
    travelerLabel,
    setAdults,
    setChildren,
  } = useTourSearch();

  const [monthCount, setMonthCount] = useState(1);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () => setMonthCount(mq.matches ? 2 : 1);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <div
      className="rounded-panel border border-white/60 bg-white/95 p-3.5 shadow-raised ring-1 ring-black/5 backdrop-blur-xl"
      style={{ "--panel-primary": "var(--primary)" } as CSSProperties}
    >
      <form
        role="search"
        aria-label="Search tours"
        className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-[1.35fr_1.05fr_1fr_auto] lg:gap-0"
      >
        {/* Destination */}
        <div className={FIELD_CELL}>
          <MapPin className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.8} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <FieldLabel>Destination</FieldLabel>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger
                className={cn(
                  "h-auto cursor-pointer border-0 bg-transparent p-0 text-[16px] leading-[1.4] shadow-none ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 [&>svg]:hidden",
                  destination
                    ? "font-medium text-slate-900"
                    : "font-normal text-slate-400",
                )}
              >
                <SelectValue placeholder="Where do you want to go?" />
              </SelectTrigger>
              <SelectContent
                className="w-[var(--radix-select-trigger-width)]"
                sideOffset={10}
                position="popper"
              >
                {SEARCHABLE_DESTINATIONS.map((dest) => (
                  <SelectItem key={dest.value} value={dest.value}>
                    {dest.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:right-8" />
        </div>

        {/* Travel Dates */}
        <div className={FIELD_CELL}>
          <span aria-hidden="true" className={SEPARATOR} />
          <CalendarDays
            className="h-5 w-5 shrink-0 text-primary"
            strokeWidth={1.8}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <FieldLabel>Travel Dates</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full cursor-pointer bg-transparent text-left text-[16px] leading-[1.4] outline-none",
                    dateRange?.from
                      ? "font-medium text-slate-900"
                      : "font-normal text-slate-400",
                  )}
                >
                  {dateRange?.from
                    ? formatRange(dateRange) || "Select dates"
                    : "Select dates"}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={10}
                className="w-auto p-0"
              >
                <Calendar
                  mode="range"
                  defaultMonth={startOfMonth(new Date())}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={monthCount}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Travelers */}
        <div className={FIELD_CELL}>
          <span aria-hidden="true" className={SEPARATOR} />
          <Users className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.8} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <FieldLabel>Travelers</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between bg-transparent text-left text-[16px] font-medium leading-[1.4] text-slate-900 outline-none"
                >
                  <span>{travelerLabel}</span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" sideOffset={10} className="w-72">
                <div className="divide-y divide-slate-100">
                  <TravelerControl
                    label="Adults"
                    sublabel="18+ years"
                    value={adults}
                    min={1}
                    onChange={setAdults}
                  />
                  <TravelerControl
                    label="Children"
                    sublabel="0–17 years"
                    value={children}
                    min={0}
                    onChange={setChildren}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Search Button */}
        <div className="relative flex items-center lg:pl-4">
          <span aria-hidden="true" className={SEPARATOR} />
          <button
            type="submit"
            className="flex h-[64px] w-full items-center justify-center gap-2.5 rounded-[14px] bg-primary px-8 text-[16px] font-semibold text-white transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--panel-primary)] lg:w-[210px]"
          >
            <Search className="h-5 w-5" strokeWidth={2} />
            Search Tours
          </button>
        </div>
      </form>
    </div>
  );
}