import { Router } from './Router';
import { AppProviders } from './theme/provider';

export default function App() {
  return (
    <AppProviders>
      <Router />
    </AppProviders>
  );
}
