import { useMemo, useState } from "react";

import { countNights, isIsoDate, nextIsoDate } from "../sdk.ts";
import type { DatePickerProps } from "../sdk.ts";
import "./islands.css";

/**
 * Start/end date range built from native date inputs: the browser owns the
 * picker UI, the island owns the constrained range and the derived stay length.
 * Native controls also keep keyboard, RTL and mobile behaviour correct for free.
 */
export default function DatePicker(props: DatePickerProps) {
  const {
    label,
    startLabel = "Start",
    endLabel = "End",
    min,
    max,
    initialStart = "",
    initialEnd = "",
    nightsLabel = "nights",
    id = "island-date-picker",
  } = props;

  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);

  const nights = useMemo(() => countNights(start, end), [start, end]);
  // The end field can never be earlier than the chosen start.
  const endMin = useMemo(() => nextIsoDate(start) ?? min, [start, min]);
  const rangeInvalid = start !== "" && end !== "" && nights === null;

  return (
    <div className="island-field" data-island="date-picker">
      <span className="island-label" id={`${id}-label`}>
        {label}
      </span>
      <div className="island-date-grid">
        <label className="island-field" htmlFor={`${id}-start`}>
          <span className="island-label">{startLabel}</span>
          <input
            id={`${id}-start`}
            className="island-input"
            type="date"
            value={start}
            min={min}
            max={max}
            onChange={(event) => {
              setStart(isIsoDate(event.target.value) ? event.target.value : "");
              if (end !== "" && event.target.value >= end) setEnd("");
            }}
          />
        </label>
        <label className="island-field" htmlFor={`${id}-end`}>
          <span className="island-label">{endLabel}</span>
          <input
            id={`${id}-end`}
            className="island-input"
            type="date"
            value={end}
            min={endMin}
            max={max}
            onChange={(event) => {
              setEnd(isIsoDate(event.target.value) ? event.target.value : "");
            }}
          />
        </label>
      </div>
      <p className="island-summary" role="status" aria-live="polite">
        {rangeInvalid
          ? "The end date must be after the start date."
          : nights !== null
            ? `${nights} ${nightsLabel}`
            : ""}
      </p>
    </div>
  );
}
