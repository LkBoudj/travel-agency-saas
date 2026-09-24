import { DeparturesView } from '../components/departures-view.tsx';
import { useDeparturesPage } from '../hooks/use-departures-page.ts';

export function DeparturesPage() {
  const controller = useDeparturesPage();

  return <DeparturesView controller={controller} />;
}
