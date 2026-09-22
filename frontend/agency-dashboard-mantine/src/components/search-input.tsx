import { useEffect, useState } from 'react';
import { IconSearch, IconX } from '@tabler/icons-react';
import { TextInput } from '@mantine/core';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function SearchInput({ value, onChange, placeholder, debounceMs = 250 }: SearchInputProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const id = window.setTimeout(() => onChange(draft), debounceMs);
    return () => window.clearTimeout(id);
  }, [draft, debounceMs]);

  return (
    <TextInput
      value={draft}
      onChange={(event) => setDraft(event.currentTarget.value)}
      placeholder={placeholder}
      leftSection={<IconSearch size={15} />}
      rightSection={
        draft ? (
          <IconX size={14} style={{ cursor: 'pointer' }} onClick={() => setDraft('')} />
        ) : null
      }
      w={{ base: '100%', sm: 280 }}
    />
  );
}

/** Ready-to-use hook keeping a debounced value in sync with a raw input. */
export function useDebouncedSearch(initial = '') {
  const [raw, setRaw] = useState(initial);
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const id = window.setTimeout(() => setValue(raw), 250);
    return () => window.clearTimeout(id);
  }, [raw]);

  return { raw, value, setRaw };
}
