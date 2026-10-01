import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import { AppShell } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DashboardHeader } from './dashboard-header.tsx';
import { DashboardSidebar } from './dashboard-sidebar.tsx';

export function DashboardLayout() {
  const { t } = useTranslation('common');
  const [navOpened, { toggle, close }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 'var(--app-header-height)' }}
      navbar={{
        width: { base: 260 },
        breakpoint: 'sm',
        collapsed: { mobile: !navOpened },
      }}
      padding="0"
    >
      {/* First focusable thing in the document, so a keyboard user can bypass the
          header and the eight nav links on every page. Off-screen rather than
          hidden: `display: none` would drop it from the tab order entirely. */}
      <a className="skip-link" href="#main">
        {t('shell.skipToContent')}
      </a>
      <AppShell.Header style={{ borderBottom: '1px solid var(--app-border-subtle)' }}>
        <DashboardHeader onToggleNav={toggle} />
      </AppShell.Header>
      <AppShell.Navbar p="md" style={{ borderInlineEnd: '1px solid var(--app-border-subtle)' }}>
        <DashboardSidebar onNavigate={close} />
      </AppShell.Navbar>
      <AppShell.Main id="main" tabIndex={-1}>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
