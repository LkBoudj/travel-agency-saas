import { ThemesView } from '../components/themes-view.tsx';
import { useThemesPage } from '../hooks/use-themes-page.ts';

export function ThemesPage() {
  const controller = useThemesPage();
  return <ThemesView {...controller} />;
}
