import { useEffect, useState } from 'react';
import { Button, Group, Modal, Select, Stack, TextInput } from '@mantine/core';
import type { PageLinkOption } from '../../hooks/use-menu-page.ts';
import type { MenuItemInput } from '../../types/menu.types.ts';

export interface AddMenuItemDialogProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (input: MenuItemInput) => void;
  title?: string;
  pageOptions: PageLinkOption[];
}

export function AddMenuItemDialog({
  opened,
  onClose,
  onSubmit,
  title = 'Add Menu Item',
  pageOptions,
}: AddMenuItemDialogProps) {
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [href, setHref] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (opened) {
      setSelectedPage(null);
      setLabel('');
      setHref('');
      setError(null);
    }
  }, [opened]);

  const handleSelectPage = (val: string | null) => {
    setSelectedPage(val);
    if (!val) {
      return;
    }
    const found = pageOptions.find((p) => p.href === val);
    if (found) {
      setHref(found.href);
      if (!label.trim()) {
        const cleanLabel = found.label.split(' (')[0];
        setLabel(cleanLabel);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Label is required');
      return;
    }
    if (!href.trim()) {
      setError('URL / path is required');
      return;
    }
    setError(null);
    onSubmit({
      label: label.trim(),
      href: href.trim(),
    });
  };

  const selectData = pageOptions.map((opt) => ({
    value: opt.href,
    label: opt.label,
    group: opt.group,
  }));

  return (
    <Modal opened={opened} onClose={onClose} title={title} centered size="sm">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {selectData.length > 0 ? (
            <Select
              label="Choose an existing page (optional)"
              placeholder="Select page to auto-fill link"
              data={selectData}
              value={selectedPage}
              onChange={handleSelectPage}
              clearable
            />
          ) : null}

          <TextInput
            label="Link Label"
            placeholder="e.g. Tours, About Us, Contact"
            value={label}
            onChange={(e) => setLabel(e.currentTarget.value)}
            required
            error={error}
          />

          <TextInput
            label="Link Destination (URL / Path)"
            placeholder="e.g. /trips or https://example.com"
            value={href}
            onChange={(e) => setHref(e.currentTarget.value)}
            description="Use relative paths like /about or absolute URLs"
            required
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              styles={{
                root: {
                  backgroundColor: 'var(--app-action-primary)',
                  fontWeight: 600,
                },
              }}
            >
              Add Link
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
