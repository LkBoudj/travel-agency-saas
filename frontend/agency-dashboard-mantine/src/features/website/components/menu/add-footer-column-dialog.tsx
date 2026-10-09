import { useEffect, useState } from 'react';
import { Button, Group, Modal, Stack, TextInput } from '@mantine/core';

export interface AddFooterColumnDialogProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (title: string) => void;
}

export function AddFooterColumnDialog({ opened, onClose, onSubmit }: AddFooterColumnDialogProps) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (opened) {
      setTitle('');
      setError(null);
    }
  }, [opened]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Column title is required');
      return;
    }
    setError(null);
    onSubmit(title.trim());
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Add Footer Column" centered size="sm">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Column Heading"
            placeholder="e.g. Quick Links, Destinations, Company"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            required
            error={error}
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
              Add Column
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
