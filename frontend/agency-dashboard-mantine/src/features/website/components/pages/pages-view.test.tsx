import { render, screen } from '@test-utils';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { setLocale } from '../../../../i18n/index.ts';
import type { PagesPageController } from '../../hooks/use-pages-page.ts';
import type { CustomWebsitePage, SystemWebsitePage } from '../../types/pages.types.ts';
import { PagesView } from './pages-view.tsx';

const SYSTEM_PAGES: SystemWebsitePage[] = [
  {
    id: 'home',
    title: 'Home Page',
    slug: '/',
    kind: 'system',
    isPublished: true,
    description: 'Main storefront landing page.',
  },
  {
    id: 'trips',
    title: 'Tours & Trips Catalog',
    slug: '/trips',
    kind: 'system',
    isPublished: true,
    description: 'Public catalog listing tours.',
  },
];

const CUSTOM_PAGES: CustomWebsitePage[] = [
  {
    id: 'page-1',
    title: 'About Our Story',
    slug: '/about-us',
    content: 'We are experienced travel experts.',
    isPublished: true,
    updatedAt: '2026-03-15T12:00:00.000Z',
  },
  {
    id: 'page-2',
    title: 'Terms of Service',
    slug: '/terms',
    content: 'Standard terms.',
    isPublished: false,
    updatedAt: '2026-03-16T12:00:00.000Z',
  },
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

function renderPagesView(overrides: Partial<PagesPageController> = {}) {
  const controller: PagesPageController = {
    draft: null,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    systemPages: SYSTEM_PAGES,
    customPages: CUSTOM_PAGES,
    filteredCustomPages: CUSTOM_PAGES,
    searchQuery: '',
    setSearchQuery: vi.fn(),
    isPublished: true,
    canEditContent: true,
    canPublish: true,
    isSaving: false,
    isPublishing: false,
    isCreateOpen: false,
    openCreate: vi.fn(),
    closeCreate: vi.fn(),
    editTarget: null,
    openEdit: vi.fn(),
    closeEdit: vi.fn(),
    deleteTarget: null,
    openDeleteConfirm: vi.fn(),
    closeDeleteConfirm: vi.fn(),
    isHomeSectionsDrawerOpen: false,
    openHomeSectionsDrawer: vi.fn(),
    closeHomeSectionsDrawer: vi.fn(),
    createPage: vi.fn(),
    updatePage: vi.fn(),
    deletePage: vi.fn(),
    togglePageStatus: vi.fn(),
    saveHomeSections: vi.fn(),
    publish: vi.fn(),
    viewWebsite: VIEW_CONTROLLER,
    ...overrides,
  };

  const result = render(<PagesView {...controller} />);
  return { ...result, controller };
}

describe('PagesView', () => {
  test('renders page heading, system pages table, and custom pages table', () => {
    renderPagesView();
    expect(screen.getByRole('heading', { level: 1, name: 'Pages' })).toBeInTheDocument();
    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.getByText('Tours & Trips Catalog')).toBeInTheDocument();
    expect(screen.getByText('About Our Story')).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
  });

  test('calls openCreate when Add Page button is clicked', async () => {
    const user = userEvent.setup();
    const { controller } = renderPagesView();
    const addButton = screen.getByRole('button', { name: 'Add Page' });
    await user.click(addButton);
    expect(controller.openCreate).toHaveBeenCalledTimes(1);
  });

  test('calls openHomeSectionsDrawer when Customize Sections is clicked', async () => {
    const user = userEvent.setup();
    const { controller } = renderPagesView();
    const customizeBtn = screen.getByRole('button', { name: 'Customize Sections' });
    await user.click(customizeBtn);
    expect(controller.openHomeSectionsDrawer).toHaveBeenCalledTimes(1);
  });

  test('calls openEdit when edit action icon is clicked', async () => {
    const user = userEvent.setup();
    const { controller } = renderPagesView();
    const editBtn = screen.getByRole('button', { name: 'Edit About Our Story' });
    await user.click(editBtn);
    expect(controller.openEdit).toHaveBeenCalledWith(CUSTOM_PAGES[0]);
  });

  test('shows empty state when no custom pages exist', () => {
    renderPagesView({ customPages: [], filteredCustomPages: [] });
    expect(screen.getByText('No custom pages yet')).toBeInTheDocument();
  });
});
