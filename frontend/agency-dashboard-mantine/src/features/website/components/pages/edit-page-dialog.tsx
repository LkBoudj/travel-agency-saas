import { useState, useEffect } from 'react';
import { Button, Group, Modal, Stack, Switch, TextInput, Textarea } from '@mantine/core';
import type { CustomWebsitePage, UpdatePageInput } from '../../types/pages.types.ts';

export interface EditPageDialogProps {
  page: CustomWebsitePage | null;
  onClose: () => void;
  onSubmit: (id: string, input: UpdatePageInput) => Promise<void>;
  loading: boolean;
}

export function EditPageDialog({ page, onClose, onSubmit, loading }: EditPageDialogProps) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setSlug(page.slug);
      setContent(page.content || '');
      setIsPublished(page.isPublished);
      setError(null);
    }
  }, [page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!page) {
      return;
    }
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    const cleanSlug = slug.trim();
    if (!cleanSlug) {
      setError('Slug is required');
      return;
    }
    setError(null);
    await onSubmit(page.id, {
      title: title.trim(),
      slug: cleanSlug,
      content,
      isPublished,
    });
  };

  return (
    <Modal
      opened={page !== null}
      onClose={onClose}
      title={`Edit Page: ${page?.title || ''}`}
      centered
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Page Title"
            placeholder="e.g. About Us, Terms & Conditions"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            required
            error={error}
          />
          <TextInput
            label="URL Slug"
            placeholder="e.g. /about-us"
            value={slug}
            onChange={(e) => setSlug(e.currentTarget.value)}
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
            label="Published"
            description="When disabled, this page will be saved as draft"
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
              Save Changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
