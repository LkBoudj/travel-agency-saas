import type { ReactNode } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { Combobox, Group, InputBase, Loader, Text } from '@mantine/core';
import type { EntityOption } from './entity-option.ts';
import {
  isQuickCreateValue,
  keywordFromQuickCreateValue,
  quickCreateOptionValue,
} from './quick-create-flow.ts';
import { useEntityPicker } from './use-entity-picker.ts';

/**
 * Searchable dropdown over a flat entity list.
 *
 * Options are filtered live as the operator types. When quick-create is
 * offered and accepted, `onQuickCreate(keyword)` is called and the picker
 * stays open — the caller owns whatever creation dialog follows and should
 * pass the new entity's code back through the controlled `value`.
 */
export function EntityCombobox({
  options,
  value,
  onSelect,
  onQuickCreate,
  canCreate = false,
  label,
  placeholder,
  nothingFound,
  loadLabel,
  createLabel,
  disabled,
  loading,
}: {
  options: readonly EntityOption[];
  value: string;
  onSelect: (code: string) => void;
  onQuickCreate?: (keyword: string) => void;
  canCreate?: boolean;
  label?: ReactNode;
  placeholder?: string;
  nothingFound?: ReactNode;
  loadLabel?: ReactNode;
  createLabel?: (keyword: string) => ReactNode;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { combobox, query, setQuery, filtered, offerQuickCreate, keyword, handleSelect } =
    useEntityPicker({ options, value, canCreate });

  const handleSubmit = (valueString: string) => {
    if (isQuickCreateValue(valueString)) {
      onQuickCreate?.(keywordFromQuickCreateValue(valueString));
      return;
    }
    handleSelect(valueString);
    onSelect(valueString);
  };

  return (
    <Combobox store={combobox} onOptionSubmit={handleSubmit} disabled={disabled}>
      <Combobox.Target>
        <InputBase
          label={label}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
          placeholder={placeholder}
          rightSection={loading ? <Loader size={16} /> : <Combobox.Chevron />}
          rightSectionPointerEvents="none"
          disabled={disabled}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {loading ? (
            <Combobox.Empty>{loadLabel ?? 'Loading…'}</Combobox.Empty>
          ) : filtered.length > 0 ? (
            filtered.map((option) => <OptionsRow key={option.code} option={option} value={value} />)
          ) : (
            <Combobox.Empty>{nothingFound ?? 'No matches.'}</Combobox.Empty>
          )}

          {!loading && offerQuickCreate ? (
            <Combobox.Option value={quickCreateOptionValue(keyword)}>
              <Group gap="xs" wrap="nowrap">
                <IconPlus size={14} />
                <Text size="sm">{createLabel ? createLabel(keyword) : `Create "${keyword}"`}</Text>
              </Group>
            </Combobox.Option>
          ) : null}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

function OptionsRow({ option, value }: { option: EntityOption; value: string }) {
  return (
    <Combobox.Option value={option.code} active={option.code === value}>
      <Group gap="sm" wrap="nowrap">
        <Text size="sm">{option.label}</Text>
        {option.sublabel ? (
          <Text size="xs" c="dimmed" truncate>
            {option.sublabel}
          </Text>
        ) : null}
      </Group>
    </Combobox.Option>
  );
}
