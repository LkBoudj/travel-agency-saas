import { render, screen } from '@test-utils';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { setLocale } from '../../../../i18n/index.ts';
import type { MenuPageController } from '../../hooks/use-menu-page.ts';
import type {
  FooterColumnItem,
  FooterLegalItem,
  NavigationLinkItem,
} from '../../types/menu.types.ts';
import { MenuView } from './menu-view.tsx';

const HEADER_ITEMS: NavigationLinkItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Trips', href: '/trips' },
  { label: 'About', href: '/about-us' },
];

const FOOTER_COLUMNS: FooterColumnItem[] = [
  {
    title: 'Explore',
    links: [
      { label: 'Desert Tours', href: '/trips' },
      { label: 'Mountain Hikes', href: '/trips' },
    ],
  },
];

const FOOTER_LEGAL: FooterLegalItem[] = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
];

const VIEW_CONTROLLER = {
  mode: 'live',
  url: 'https://example.test/atlas',
  servesAnotherTenant: false,
  devTenantSlug: null,
  isOpening: false,
  open: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

beforeAll(async () => {
  await act(async () => {
    setLocale('en');
  });
});

function renderMenuView(overrides: Partial<MenuPageController> = {}) {
  const controller: MenuPageController = {
    draft: null,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    isPublished: true,
    canEditContent: true,
    canPublish: true,
    isSaving: false,
    isPublishing: false,
    isDirty: false,
    headerItems: HEADER_ITEMS,
    footerDescription: 'Crafted travel agency in Algiers.',
    setFooterDescription: vi.fn(),
    footerColumns: FOOTER_COLUMNS,
    footerLegal: FOOTER_LEGAL,
    availablePageOptions: [],
    isAddHeaderOpen: false,
    openAddHeader: vi.fn(),
    closeAddHeader: vi.fn(),
    editHeaderTarget: null,
    openEditHeader: vi.fn(),
    closeEditHeader: vi.fn(),
    isAddFooterColumnOpen: false,
    openAddFooterColumn: vi.fn(),
    closeAddFooterColumn: vi.fn(),
    addFooterLinkTarget: null,
    openAddFooterLink: vi.fn(),
    closeAddFooterLink: vi.fn(),
    editFooterLinkTarget: null,
    openEditFooterLink: vi.fn(),
    closeEditFooterLink: vi.fn(),
    isAddLegalOpen: false,
    openAddLegal: vi.fn(),
    closeAddLegal: vi.fn(),
    editLegalTarget: null,
    openEditLegal: vi.fn(),
    closeEditLegal: vi.fn(),
    addHeaderItem: vi.fn(),
    editHeaderItem: vi.fn(),
    removeHeaderItem: vi.fn(),
    moveHeaderItemUp: vi.fn(),
    moveHeaderItemDown: vi.fn(),
    addFooterColumn: vi.fn(),
    removeFooterColumn: vi.fn(),
    addFooterColumnLink: vi.fn(),
    editFooterColumnLink: vi.fn(),
    removeFooterColumnLink: vi.fn(),
    addFooterLegalLink: vi.fn(),
    editFooterLegalLink: vi.fn(),
    removeFooterLegalLink: vi.fn(),
    save: vi.fn(),
    reset: vi.fn(),
    publish: vi.fn(),
    viewWebsite: VIEW_CONTROLLER,
    ...overrides,
  };

  const result = render(<MenuView {...controller} />);
  return { ...result, controller };
}

describe('MenuView', () => {
  test('renders header navigation links with order arrows and paths', () => {
    renderMenuView();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Menu & Navigation' })
    ).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Trips')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('/about-us')).toBeInTheDocument();
  });

  test('calls moveHeaderItemUp and moveHeaderItemDown when arrows clicked', async () => {
    const user = userEvent.setup();
    const { controller } = renderMenuView();
    const downButtons = screen.getAllByRole('button', { name: 'Move link down' });
    await user.click(downButtons[0]);
    expect(controller.moveHeaderItemDown).toHaveBeenCalledWith(0);
  });

  test('renders footer tab and shows columns and legal links', async () => {
    const user = userEvent.setup();
    renderMenuView();
    const footerTab = screen.getByRole('tab', { name: 'Footer Navigation' });
    await user.click(footerTab);

    expect(screen.getByText('Explore')).toBeInTheDocument();
    expect(screen.getByText('Desert Tours')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  test('Save Changes button is disabled when not dirty and enabled when dirty', () => {
    const { rerender, controller } = renderMenuView({ isDirty: false });
    const saveBtn = screen.getByRole('button', { name: 'Save Changes' });
    expect(saveBtn).toBeDisabled();

    rerender(<MenuView {...controller} isDirty />);
    const activeSaveBtn = screen.getByRole('button', { name: 'Save Changes' });
    expect(activeSaveBtn).not.toBeDisabled();
  });
});
