import { Box, Button, Group, Modal, Stack, Text } from '@mantine/core';
import { ErrorState } from '../../../components/empty-state.tsx';
import { CreatePageDialog } from '../components/pages/create-page-dialog.tsx';
import { EditHomeSectionsDrawer } from '../components/pages/edit-home-sections-drawer.tsx';
import { EditPageDialog } from '../components/pages/edit-page-dialog.tsx';
import { PagesView } from '../components/pages/pages-view.tsx';
import { usePagesPage } from '../hooks/use-pages-page.ts';

export function PagesPage() {
  const controller = usePagesPage();

  if (controller.isPending) {
    return <Box py="xl" />;
  }

  if (controller.isError || controller.draft === null) {
    return (
      <ErrorState
        title="Could not load pages"
        description="The website draft is currently unavailable. Please try again."
        onRetry={controller.refetch}
      />
    );
  }

  return (
    <>
      <PagesView {...controller} />
      <CreatePageDialog
        opened={controller.isCreateOpen}
        onClose={controller.closeCreate}
        onSubmit={controller.createPage}
        loading={controller.isSaving}
      />
      <EditPageDialog
        page={controller.editTarget}
        onClose={controller.closeEdit}
        onSubmit={controller.updatePage}
        loading={controller.isSaving}
      />
      <EditHomeSectionsDrawer
        opened={controller.isHomeSectionsDrawerOpen}
        onClose={controller.closeHomeSectionsDrawer}
        draft={controller.draft}
        onSubmit={controller.saveHomeSections}
        loading={controller.isSaving}
      />
      <Modal
        opened={controller.deleteTarget !== null}
        onClose={controller.closeDeleteConfirm}
        title="Delete Page"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete &ldquo;{controller.deleteTarget?.title}&rdquo;? This
            action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={controller.closeDeleteConfirm}
              disabled={controller.isSaving}
            >
              Cancel
            </Button>
            <Button
              color="red"
              loading={controller.isSaving}
              onClick={() =>
                controller.deleteTarget && controller.deletePage(controller.deleteTarget.id)
              }
            >
              Delete Page
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
