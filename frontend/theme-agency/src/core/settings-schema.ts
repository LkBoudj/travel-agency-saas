import type {
  SettingsField,
  SettingsSchema,
  ThemeSettings,
} from "./contracts.ts";

/**
 * Settings schema validation (ported from storefront themes semantics,
 * extended to `text | color | number`).
 */

const FIELD_TYPES: readonly SettingsField["type"][] = [
  "boolean",
  "select",
  "text",
  "color",
  "number",
];

export interface SchemaError {
  key: string;
  message: string;
}

/**
 * Checks whether a single value is valid for the given field. Unknown keys
 * reject only when the value is present — merge logic relies on this.
 */
export function isValidFieldValue(
  field: SettingsField,
  value: unknown,
): boolean {
  if (value === undefined || value === null) return false;
  switch (field.type) {
    case "boolean":
      return typeof value === "boolean";
    case "select":
      return (
        typeof value === "string" &&
        field.options?.some((option) => option.value === value) === true
      );
    case "text":
      return typeof value === "string";
    case "color":
      return typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value);
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) return false;
      if (field.min !== undefined && value < field.min) return false;
      if (field.max !== undefined && value > field.max) return false;
      return true;
  }
}

/** Validates the schema structure itself (used by `theme:check`, T12). */
export function validateSettingsSchema(
  schema: SettingsSchema,
): SchemaError[] {
  const errors: SchemaError[] = [];
  const seen = new Set<string>();

  for (const field of schema.fields) {
    if (seen.has(field.key)) {
      errors.push({
        key: field.key,
        message: `duplicate setting key "${field.key}"`,
      });
    }
    seen.add(field.key);

    if (typeof field.key !== "string" || field.key.trim() === "") {
      errors.push({ key: field.key, message: "setting key must be a non-empty string" });
    }
    if (!FIELD_TYPES.includes(field.type)) {
      errors.push({
        key: field.key,
        message: `unknown setting type "${field.type}"`,
      });
    }
    if (typeof field.group !== "string" || field.group.trim() === "") {
      errors.push({
        key: field.key,
        message: `setting "${field.key}" must declare a group`,
      });
    }
    if (typeof field.labelKey !== "string" || field.labelKey === "") {
      errors.push({
        key: field.key,
        message: `setting "${field.key}" must declare a labelKey`,
      });
    }

    if (field.type === "select") {
      if (!field.options || field.options.length === 0) {
        errors.push({
          key: field.key,
          message: `select "${field.key}" must declare options`,
        });
      } else {
        const optionValues = new Set<string>();
        for (const option of field.options) {
          if (optionValues.has(option.value)) {
            errors.push({
              key: field.key,
              message: `select "${field.key}" has duplicate option value "${option.value}"`,
            });
          }
          optionValues.add(option.value);
        }
      }
    }

    if (field.type === "number") {
      if (
        field.min !== undefined &&
        field.max !== undefined &&
        field.min > field.max
      ) {
        errors.push({
          key: field.key,
          message: `number "${field.key}" has min > max`,
        });
      }
    }
  }

  return errors;
}

/** Defaults are theme-owned; every field must be defaulted to a valid value. */
export function validateThemeDefaults(
  schema: SettingsSchema,
  defaults: ThemeSettings,
): SchemaError[] {
  const errors: SchemaError[] = [];
  for (const field of schema.fields) {
    if (!Object.hasOwn(defaults, field.key)) {
      errors.push({
        key: field.key,
        message: `setting "${field.key}" is missing a default value`,
      });
    } else if (!isValidFieldValue(field, defaults[field.key])) {
      errors.push({
        key: field.key,
        message: `default value for "${field.key}" is invalid for type "${field.type}"`,
      });
    }
  }
  return errors;
}

/** Reports unknown keys present in an override bag (theme lab / dashboard). */
export function unknownSettingKeys(
  schema: SettingsSchema,
  values: Record<string, unknown>,
): string[] {
  const known = new Set(schema.fields.map((field) => field.key));
  return Object.keys(values).filter((key) => !known.has(key));
}