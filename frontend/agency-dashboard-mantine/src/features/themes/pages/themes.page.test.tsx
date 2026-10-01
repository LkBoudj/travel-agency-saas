import { act, render, screen } from '@test-utils';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { setLocale } from '../../../i18n/index.ts';
import type { ThemesPageController } from '../hooks/use-themes-page.ts';
import type { ThemeManifestEntry } from '../types.ts';
import { ThemesPage } from './themes.page.tsx';

const useThemesPage = vi.hoisted(() => vi.fn());
vi.mock('../hooks/use-themes-page.ts', () => ({ useThemesPage }));

const STARTER: ThemeManifestEntry = {
  themeId: 'starter',
  nameKey: 'themes.starter.name',
  descriptionKey: 'themes.starter.description',
  version: '1.4.0',
  previewImage: '/themes/starter/preview.png',
  settingsSchema: {
    fields: [
      { key: 'brand.primary', type: 'color', group: 'brand', labelKey: 'label' },
      { key: 'homepage.showFeaturedTours', type: 'boolean', group: 'homepage', labelKey: 'label' },
    ],
  },
};

function controller(overrides: Partial<ThemesPageController> = {}) {
  const value = {
    manifest: [STARTER],
    manifestPending: false,
    manifestError: false,
    refetchManifest: vi.fn(),
    draft: { slug: 'atlas-escapes', themeId: 'starter' },
    draftPending: false,
    isPublished: true,
    liveTheme: 'starter',
    publishState: 'in-sync',
    cardState: () => ({ isCurrent: true, isLive: true, isPendingPublish: false }),
    activeTheme: STARTER,
    canEditTheme: true,
    canPublish: true,
    savingTheme: false,
    publishing: false,
    previewing: false,
    activate: vi.fn(),
    saveCustomization: vi.fn(),
    openPreview: vi.fn(),
    publishWebsite: vi.fn(),
    ...overrides,
  };
  useThemesPage.mockReturnValue(value);
  return value as unknown as ThemesPageController;
}

async function useLocale(locale: 'en' | 'ar') {
  await act(async () => {
    setLocale(locale);
  });
}

beforeAll(async () => {
  await useLocale('en');
});

afterEach(async () => {
  await useLocale('en');
});

describe('ThemesPage', () => {
  test('skeletons the catalog instead of spinning a bare loader', () => {
    controller({ manifestPending: true });
    render(<ThemesPage />);
    // A lone <Loader> says "something is happening" but not what will appear
    // here; the skeleton reserves the same space the cards will take.
    expect(document.querySelectorAll('.mantine-Skeleton-root').length).toBeGreaterThan(0);
    expect(document.querySelector('.mantine-Loader-root')).toBeNull();
  });

  test('offers an empty state when the registry has no themes', () => {
    controller({ manifest: [] });
    render(<ThemesPage />);
    expect(screen.getByText('No themes available')).toBeVisible();
    expect(screen.getByText('No themes could be loaded from the theme registry.')).toBeVisible();
    // The shared EmptyState, not a bare dimmed sentence: it owns the icon and
    // the reserved block, which is what every other list on the page does.
    const block = screen.getByText('No themes available').closest('.mantine-Box-root');
    expect(block?.querySelector('svg')).not.toBeNull();
  });

  test('renders one card per manifest entry inside the grid', () => {
    controller({
      manifest: [STARTER, { ...STARTER, themeId: 'atlas', nameKey: 'themes.atlas.name' }],
      cardState: (themeId: string) => ({
        isCurrent: themeId === 'starter',
        isLive: themeId === 'starter',
        isPendingPublish: false,
      }),
    });
    const { container } = render(<ThemesPage />);
    const grid = container.querySelector('.mantine-SimpleGrid-root');
    expect(grid?.querySelectorAll('.mantine-Card-root')).toHaveLength(2);
    // Exactly one card is the selection, however many themes the registry has.
    expect(container.querySelectorAll('[data-current="true"]')).toHaveLength(1);
  });

  test('gives every catalog card a heading so the grid is navigable', () => {
    controller({
      manifest: [STARTER, { ...STARTER, themeId: 'atlas', nameKey: 'themes.atlas.name' }],
      cardState: (themeId: string) => ({
        isCurrent: themeId === 'starter',
        isLive: themeId === 'starter',
        isPendingPublish: false,
      }),
    });
    render(<ThemesPage />);
    // The page owns the h1; each theme in the catalog is the next level down.
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(2);
  });

  test('names the manifest groups with real labels in both languages', async () => {
    controller();
    const { rerender } = render(<ThemesPage />);
    await act(async () => {
      // The customize drawer holds the grouped settings form.
      await userOpenCustomize();
    });
    expect(screen.getByText('Brand')).toBeInTheDocument();
    expect(screen.getByText('Homepage')).toBeInTheDocument();

    await useLocale('ar');
    rerender(<ThemesPage />);
    await act(async () => {
      await userOpenCustomize();
    });
    expect(screen.getByText('الهوية البصرية')).toBeInTheDocument();
    expect(screen.getByText('الصفحة الرئيسية')).toBeInTheDocument();
  });

  test.each(['en', 'ar'] as const)('never renders a raw themes.* key in %s', async (locale) => {
    await useLocale(locale);
    controller();
    render(<ThemesPage />);
    expect(document.body.textContent).not.toMatch(/themes\.[a-z]/);
    expect(document.body.textContent).not.toMatch(/settings\.[a-z]/);
  });
});

async function userOpenCustomize() {
  const { default: userEvent } = await import('@testing-library/user-event');
  await userEvent.setup().click(screen.getByRole('button', { name: /Customize|تخصيص/ }));
}
