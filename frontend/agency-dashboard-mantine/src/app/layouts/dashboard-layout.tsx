import { Outlet } from 'react-router-dom';
import { AppShell } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DashboardHeader } from './dashboard-header.tsx';
import { DashboardSidebar } from './dashboard-sidebar.tsx';

const glassStyle = {
  backgroundColor: 'var(--app-glass-bg)',
  backdropFilter: 'var(--app-glass-blur)',
  WebkitBackdropFilter: 'var(--app-glass-blur)',
  borderColor: 'var(--app-glass-border)',
} as const;

export function DashboardLayout() {
  const [navOpened, { toggle, close }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: { base: 260 },
        breakpoint: 'sm',
        collapsed: { mobile: !navOpened },
      }}
      padding="md"
    >
      <AppShell.Header style={glassStyle}>
        <DashboardHeader onToggleNav={toggle} />
      </AppShell.Header>
      <AppShell.Navbar p="xs" style={glassStyle}>
        <DashboardSidebar onNavigate={close} />
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
