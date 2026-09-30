import { ColorInput, NumberInput, Select, Stack, Switch, Text, TextInput } from '@mantine/core';
import { useQualifiedKey } from '../../../../i18n/hooks/use-qualified-key.ts';
import { groupSettingsFields } from '../../lib/settings-map.ts';
import type { SettingsField, SettingsMap, SettingsSchema } from '../../types.ts';

export interface SchemaSettingsRendererProps {
  schema: SettingsSchema;
  value: SettingsMap;
  onChange: (value: SettingsMap) => void;
  disabled?: boolean;
}

/**
 * Renders a theme's `settingsSchema` as Mantine controls. Field labels are the
 * theme's own `labelKey` i18n keys, resolved in the namespace they name
 * (`settings.<themeId>.<group>.<field>`) with a raw-key fallback, so a theme
 * that ships a key with no translation still shows something readable.
 */
export function SchemaSettingsRenderer({
  schema,
  value,
  onChange,
  disabled = false,
}: SchemaSettingsRendererProps) {
  const setField = (key: string) => (next: SettingsMap[typeof key]) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <Stack gap="lg">
      {groupSettingsFields(schema).map(({ group, fields }) => (
        <Stack key={group} gap="sm">
          <Text fw={600} size="sm" tt="capitalize">
            {group}
          </Text>
          {fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              currentValue={value[field.key]}
              onChange={setField(field.key)}
              disabled={disabled}
            />
          ))}
        </Stack>
      ))}
    </Stack>
  );
}

function FieldInput({
  field,
  currentValue,
  onChange,
  disabled,
}: {
  field: SettingsField;
  currentValue: SettingsMap[string];
  onChange: (value: SettingsMap[string]) => void;
  disabled: boolean;
}) {
  const labelKey = useQualifiedKey();

  switch (field.type) {
    case 'boolean':
      return (
        <Switch
          label={labelKey(field.labelKey)}
          checked={currentValue === true}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
      );
    case 'select':
      return (
        <Select
          label={labelKey(field.labelKey)}
          data={(field.options ?? []).map((option) => ({
            value: option.value,
            label: labelKey(option.labelKey),
          }))}
          value={typeof currentValue === 'string' ? currentValue : undefined}
          disabled={disabled}
          onChange={(next) => onChange((next ?? '') as SettingsMap[string])}
          searchable
          clearable={false}
        />
      );
    case 'color':
      return (
        <ColorInput
          label={labelKey(field.labelKey)}
          format="hex"
          value={typeof currentValue === 'string' ? currentValue : '#000000'}
          disabled={disabled}
          onChange={(next) => onChange(next as SettingsMap[string])}
        />
      );
    case 'number':
      return (
        <NumberInput
          label={labelKey(field.labelKey)}
          min={field.min}
          max={field.max}
          step={field.step}
          value={typeof currentValue === 'number' ? currentValue : 0}
          disabled={disabled}
          onChange={(next) => onChange((Number(next) || 0) as SettingsMap[string])}
        />
      );
    case 'text':
      return (
        <TextInput
          label={labelKey(field.labelKey)}
          value={typeof currentValue === 'string' ? currentValue : ''}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      );
  }
}
