import { useEffect, useMemo, useState } from 'react';
import { useCombobox } from '@mantine/core';
import { filterEntityOptions, type EntityOption } from './entity-option.ts';
import { quickCreateKeyword, shouldOfferQuickCreate } from './quick-create-flow.ts';

/**
 * Searchable entity selection state for a Combobox.
 *
 * Selection is controlled from outside (`value` + `onSelect`); this hook cares
 * about the search box and the derived option list. Quick-create offers itself
 * whenever `canCreate` is true and the typed keyword matches no code.
 */
export function useEntityPicker({
  options,
  value,
  canCreate,
}: {
  options: readonly EntityOption[];
  value: string;
  canCreate: boolean;
}) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [query, setQuery] = useState('');

  // When the dropdown closes without a pick, collapse the input back to the
  // currently selected option (if any) rather than leaving stale search text.
  useEffect(() => {
    if (!combobox.dropdownOpened) {
      const selected = options.find((option) => option.code === value);
      setQuery(selected?.label ?? '');
    }
  }, [combobox.dropdownOpened]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => filterEntityOptions(options, query), [options, query]);

  const offerQuickCreate = useMemo(
    () => shouldOfferQuickCreate(options, query, canCreate),
    [options, query, canCreate]
  );

  const handleSearchChange = (next: string) => {
    setQuery(next);
    combobox.openDropdown();
    combobox.updateSelectedOptionIndex();
  };

  const handleSelect = (valueString: string) => {
    const selected = options.find((option) => option.code === valueString);
    setQuery(selected?.label ?? '');
    combobox.closeDropdown();
  };

  return {
    combobox,
    query,
    setQuery: handleSearchChange,
    filtered,
    offerQuickCreate,
    keyword: quickCreateKeyword(query),
    handleSelect,
  };
}
