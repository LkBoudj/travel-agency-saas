import { QuickCreateDrawer } from '../components/quick-create-drawer.tsx';
import { TripsView } from '../components/trips-view.tsx';
import { useTripsPage } from '../hooks/use-trips-page.ts';

export function TripsPage() {
  const controller = useTripsPage();

  return (
    <>
      <TripsView {...controller} />
      <QuickCreateDrawer
        opened={controller.isQuickCreateOpen}
        submitting={controller.isSubmitting}
        suggestedDestinations={controller.suggestedDestinations}
        onClose={controller.closeQuickCreate}
        onSubmit={controller.submitQuickCreate}
      />
    </>
  );
}
