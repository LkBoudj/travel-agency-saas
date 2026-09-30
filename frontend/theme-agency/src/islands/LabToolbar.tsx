import { useMemo, useState } from "react";

import type {
  SettingsField,
  SettingsSchema,
  SettingsValue,
  ThemeSettings,
} from "../sdk.ts";

/**
 * Theme Lab toolbar (T10).
 *
 * Server-authoritative by design: changing a setting or the direction navigates
 * with updated query params, so the SAME `renderStorefront` path re-renders with
 * draft data (never a client-side theme re-render). Only device-width scaling is
 * client-only — it sets a platform-owned CSS variable consumed by the preview
 * stylesheet in `src/layouts/storefront.astro`.
 */
export interface LabToolbarProps {
  themeId: string;
  /** Public Theme Lab path, e.g. `/_lab/starter/home`. */
  pagePath: string;
  token: string;
  schema: SettingsSchema;
  settings: ThemeSettings;
  dir: "ltr" | "rtl";
}

const DEVICE_WIDTHS = [
  { label: "Mobile", width: 375 },
  { label: "Tablet", width: 768 },
  { label: "Desktop", width: 1280 },
  { label: "Full", width: 0 },
];

const styles = {
  bar: {
    position: "fixed",
    insetBlockEnd: "1rem",
    insetInlineStart: "50%",
    transform: "translateX(-50%)",
    zIndex: 2147483647,
    width: "min(960px, calc(100vw - 2rem))",
    maxHeight: "60vh",
    overflow: "auto",
    background: "#0f172a",
    color: "#e2e8f0",
    borderRadius: "0.75rem",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.35)",
    fontFamily: "system-ui, sans-serif",
    fontSize: "0.8125rem",
    padding: "0.75rem 1rem",
  },
  row: { display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" },
  group: { marginBlockStart: "0.5rem" },
  groupTitle: { opacity: 0.65, textTransform: "uppercase", fontSize: "0.6875rem" },
  field: { display: "flex", alignItems: "center", gap: "0.4rem", marginBlock: "0.25rem" },
  button: {
    background: "#1e293b",
    color: "inherit",
    border: "1px solid #334155",
    borderRadius: "0.375rem",
    padding: "0.25rem 0.6rem",
    cursor: "pointer",
  },
  primary: { background: "#0f766e", borderColor: "#0f766e" },
} as const;

function humanize(key: string): string {
  const leaf = key.split(".").pop() ?? key;
  return leaf
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/^./u, (char) => char.toUpperCase());
}

export default function LabToolbar({
  themeId,
  pagePath,
  token,
  schema,
  settings,
  dir,
}: LabToolbarProps) {
  const [values, setValues] = useState<ThemeSettings>(settings);
  const [rtl, setRtl] = useState(dir === "rtl");
  const [device, setDevice] = useState("Full");

  const groups = useMemo(() => {
    const grouped = new Map<string, SettingsField[]>();
    for (const field of schema.fields) {
      const list = grouped.get(field.group) ?? [];
      list.push(field);
      grouped.set(field.group, list);
    }
    return [...grouped.entries()];
  }, [schema]);

  const update = (key: string, value: SettingsValue) => {
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const apply = () => {
    const params = new URLSearchParams({ t: token, s: JSON.stringify(values) });
    if (rtl) params.set("d", "rtl");
    window.location.assign(`${pagePath}?${params.toString()}`);
  };

  const reset = () => {
    window.location.assign(`${pagePath}?t=${encodeURIComponent(token)}`);
  };

  const selectDevice = (label: string, width: number) => {
    setDevice(label);
    const root = document.documentElement;
    if (width > 0) {
      root.dataset.labDevice = "true";
      root.style.setProperty("--lab-device-width", `${width}px`);
    } else {
      delete root.dataset.labDevice;
      root.style.removeProperty("--lab-device-width");
    }
  };

  const toggleRtl = () => {
    const next = !rtl;
    setRtl(next);
    document.documentElement.dir = next ? "rtl" : "ltr";
  };

  return (
    <section style={styles.bar} aria-label="Theme Lab toolbar" data-theme-lab={themeId}>
      <div style={styles.row}>
        <strong>Theme Lab</strong>
        <span style={{ opacity: 0.65 }}>{themeId}</span>
        <span style={{ flex: 1 }} />
        {DEVICE_WIDTHS.map((option) => (
          <button
            key={option.label}
            type="button"
            style={{ ...styles.button, ...(device === option.label ? styles.primary : {}) }}
            onClick={() => selectDevice(option.label, option.width)}
          >
            {option.label}
          </button>
        ))}
        <button
          type="button"
          style={{ ...styles.button, ...(rtl ? styles.primary : {}) }}
          aria-pressed={rtl}
          onClick={toggleRtl}
        >
          RTL
        </button>
        <button type="button" style={{ ...styles.button, ...styles.primary }} onClick={apply}>
          Apply
        </button>
        <button type="button" style={styles.button} onClick={reset}>
          Reset
        </button>
      </div>

      {groups.map(([group, fields]) => (
        <div key={group} style={styles.group}>
          <div style={styles.groupTitle}>{humanize(group)}</div>
          {fields.map((field) => (
            <label key={field.key} style={styles.field}>
              {renderInput(field, values[field.key], (value) => update(field.key, value))}
              <span>{humanize(field.key)}</span>
            </label>
          ))}
        </div>
      ))}
    </section>
  );
}

function renderInput(
  field: SettingsField,
  value: SettingsValue | undefined,
  onChange: (value: SettingsValue) => void,
) {
  switch (field.type) {
    case "boolean":
      return (
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
      );
    case "select":
      return (
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        >
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {humanize(option.value)}
            </option>
          ))}
        </select>
      );
    case "number":
      return (
        <input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step}
          value={typeof value === "number" ? value : 0}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      );
    case "color":
      return (
        <input
          type="color"
          value={typeof value === "string" ? value : "#000000"}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    default:
      return (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}
