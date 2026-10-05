import { AppProviders } from './app/providers/app-providers.tsx';
import { Router } from './app/router/routes.tsx';

export default function App() {
  return (
    <AppProviders>
      <Router />
    </AppProviders>
  );
}
