import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import { AppShell } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DashboardHeader } from './dashboard-header.tsx';
import { DashboardSidebar } from './dashboard-sidebar.tsx';
import { SidebarFooter } from './sidebar-footer.tsx';

export function DashboardLayout() {
  const { t } = useTranslation('common');
  const [navOpened, { toggle, close }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 'var(--app-header-height)' }}
      navbar={{
        width: { base: 'var(--app-rail-width)' },
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
      <AppShell.Header
        data-shell-header
        style={{ borderBottom: '1px solid var(--app-border-subtle)' }}
      >
        <DashboardHeader onToggleNav={toggle} />
      </AppShell.Header>
      {/* The rail is a flex column: the nav scrolls, the footer is pinned to the
          bottom edge. Without this the account block would scroll away with the
          links and stop being a stable "where am I logged in" anchor. */}
      <AppShell.Navbar
        data-shell-nav
        p="md"
        className="app-shell-rail"
        style={{ borderInlineEnd: '1px solid var(--app-nav-border)' }}
      >
        <DashboardSidebar onNavigate={close} />
        <SidebarFooter />
      </AppShell.Navbar>
      <AppShell.Main id="main" tabIndex={-1}>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
