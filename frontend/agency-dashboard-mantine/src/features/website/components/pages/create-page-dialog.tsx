import { useState, useEffect } from 'react';
import { Button, Group, Modal, Stack, Switch, TextInput, Textarea } from '@mantine/core';
import type { CreatePageInput } from '../../types/pages.types.ts';

export interface CreatePageDialogProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (input: CreatePageInput) => Promise<void>;
  loading: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CreatePageDialog({ opened, onClose, onSubmit, loading }: CreatePageDialogProps) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [isSlugPristine, setIsSlugPristine] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (opened) {
      setTitle('');
      setSlug('');
      setContent('');
      setIsPublished(true);
      setIsSlugPristine(true);
      setError(null);
    }
  }, [opened]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (isSlugPristine) {
      setSlug(val ? `/${slugify(val)}` : '');
    }
  };

  const handleSlugChange = (val: string) => {
    setIsSlugPristine(false);
    setSlug(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    const cleanSlug = slug.trim() || `/${slugify(title)}`;
    if (!cleanSlug) {
      setError('Slug is required');
      return;
    }
    setError(null);
    await onSubmit({
      title: title.trim(),
      slug: cleanSlug,
      content,
      isPublished,
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Create New Page" centered size="md">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Page Title"
            placeholder="e.g. About Us, Terms & Conditions"
            value={title}
            onChange={(e) => handleTitleChange(e.currentTarget.value)}
            required
            error={error}
          />
          <TextInput
            label="URL Slug"
            placeholder="e.g. /about-us"
            value={slug}
            onChange={(e) => handleSlugChange(e.currentTarget.value)}
            description="The web address path for this page"
            required
          />
          <Textarea
            label="Page Content"
            placeholder="Write page content, description or markdown..."
            value={content}
            onChange={(e) => setContent(e.currentTarget.value)}
            minRows={4}
            maxRows={10}
            autosize
          />
          <Switch
            label="Publish page immediately"
            description="When enabled, this page will be publicly accessible once published"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.currentTarget.checked)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              styles={{
                root: {
                  backgroundColor: 'var(--app-action-primary)',
                  fontWeight: 600,
                },
              }}
            >
              Create Page
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
