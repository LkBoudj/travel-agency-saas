import { OverviewView } from '../components/overview-view.tsx';
import { useOverviewPage } from '../hooks/use-overview-page.ts';

export function OverviewPage() {
  const controller = useOverviewPage();

  return <OverviewView controller={controller} />;
}
