import { useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

export function formatRange(range: DateRange | undefined): string {
  if (!range?.from) return "";
  const fromStr = format(range.from, "d MMM");
  if (!range.to) return fromStr;
  return `${fromStr} – ${format(range.to, "d MMM")}`;
}

export function useDateRange() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  return { dateRange, setDateRange };
}