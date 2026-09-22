import { FullPageLoader } from '../../../components/full-page-loader.tsx';
import { AgencyChooserView } from '../components/agency-chooser-view.tsx';
import { useAgencyChooser } from '../hooks/use-agency-chooser.ts';

export function AgencyChooserPage() {
  const { isPending, sortedAgencies, autoEntered, enterAgency, signOut } = useAgencyChooser();

  if (isPending) {
    return <FullPageLoader />;
  }

  return (
    <AgencyChooserView
      agencies={sortedAgencies}
      autoEntered={autoEntered}
      onSelect={enterAgency}
      onSignOut={signOut}
    />
  );
}
