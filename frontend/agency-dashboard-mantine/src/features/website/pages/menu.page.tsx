import { Box } from '@mantine/core';
import { ErrorState } from '../../../components/empty-state.tsx';
import { AddFooterColumnDialog } from '../components/menu/add-footer-column-dialog.tsx';
import { AddMenuItemDialog } from '../components/menu/add-menu-item-dialog.tsx';
import { EditMenuItemDialog } from '../components/menu/edit-menu-item-dialog.tsx';
import { MenuView } from '../components/menu/menu-view.tsx';
import { useMenuPage } from '../hooks/use-menu-page.ts';

export function MenuPage() {
  const controller = useMenuPage();

  if (controller.isPending) {
    return <Box py="xl" />;
  }

  if (controller.isError || controller.draft === null) {
    return (
      <ErrorState
        title="Could not load menu"
        description="The website draft is currently unavailable. Please try again."
        onRetry={controller.refetch}
      />
    );
  }

  return (
    <>
      <MenuView {...controller} />
      <AddMenuItemDialog
        opened={controller.isAddHeaderOpen}
        onClose={controller.closeAddHeader}
        onSubmit={controller.addHeaderItem}
        title="Add Header Navigation Link"
        pageOptions={controller.availablePageOptions}
      />
      <EditMenuItemDialog
        item={controller.editHeaderTarget?.item ?? null}
        onClose={controller.closeEditHeader}
        onSubmit={(input) =>
          controller.editHeaderTarget &&
          controller.editHeaderItem(controller.editHeaderTarget.index, input)
        }
        title="Edit Header Navigation Link"
      />
      <AddFooterColumnDialog
        opened={controller.isAddFooterColumnOpen}
        onClose={controller.closeAddFooterColumn}
        onSubmit={controller.addFooterColumn}
      />
      <AddMenuItemDialog
        opened={controller.addFooterLinkTarget !== null}
        onClose={controller.closeAddFooterLink}
        onSubmit={(input) =>
          controller.addFooterLinkTarget &&
          controller.addFooterColumnLink(controller.addFooterLinkTarget.columnIndex, input)
        }
        title="Add Link to Column"
        pageOptions={controller.availablePageOptions}
      />
      <EditMenuItemDialog
        item={controller.editFooterLinkTarget?.item ?? null}
        onClose={controller.closeEditFooterLink}
        onSubmit={(input) =>
          controller.editFooterLinkTarget &&
          controller.editFooterColumnLink(
            controller.editFooterLinkTarget.columnIndex,
            controller.editFooterLinkTarget.linkIndex,
            input
          )
        }
        title="Edit Column Link"
      />
      <AddMenuItemDialog
        opened={controller.isAddLegalOpen}
        onClose={controller.closeAddLegal}
        onSubmit={controller.addFooterLegalLink}
        title="Add Legal Link"
        pageOptions={controller.availablePageOptions}
      />
      <EditMenuItemDialog
        item={controller.editLegalTarget?.item ?? null}
        onClose={controller.closeEditLegal}
        onSubmit={(input) =>
          controller.editLegalTarget &&
          controller.editFooterLegalLink(controller.editLegalTarget.index, input)
        }
        title="Edit Legal Link"
      />
    </>
  );
}
