import { useEffect, useState } from 'react';
import { Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import type { MenuItemInput, NavigationLinkItem } from '../../types/menu.types.ts';

export interface EditMenuItemDialogProps {
  item: NavigationLinkItem | null;
  onClose: () => void;
  onSubmit: (input: MenuItemInput) => void;
  title?: string;
}

export function EditMenuItemDialog({
  item,
  onClose,
  onSubmit,
  title = 'Edit Menu Link',
}: EditMenuItemDialogProps) {
  const [label, setLabel] = useState('');
  const [href, setHref] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setLabel(item.label);
      setHref(item.href);
      setError(null);
    }
  }, [item]);

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

  return (
    <Modal opened={item !== null} onClose={onClose} title={title} centered size="sm">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
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
            placeholder="e.g. /trips or https://..."
            value={href}
            onChange={(e) => setHref(e.currentTarget.value)}
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
              Save Link
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
