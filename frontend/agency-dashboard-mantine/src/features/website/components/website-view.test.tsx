import { render, screen, waitFor } from '@test-utils';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { setLocale } from '../../../i18n/index.ts';
import type { ViewWebsiteController } from '../hooks/use-view-website.ts';
import type { WebsiteDraftResponse } from '../types.ts';
import { WebsiteView, type WebsiteViewProps } from './website-view.tsx';

const DRAFT: WebsiteDraftResponse = {
  slug: 'atlas-escapes',
  locale: 'en',
  themeId: 'theme-atlas',
  themeSettings: {},
  content: {
    hero: { title: 'Atlas Escapes', subtitle: 'Morocco, slowly.', image: '' },
    trustPoints: [],
    promotion: { eyebrow: '', title: '', text: '', ctaLabel: '', ctaHref: '' },
    testimonials: [],
    finalCta: { title: '', subtitle: '', ctaLabel: '', ctaHref: '' },
    featuredTourCodes: [],
  },
  branding: { name: 'Atlas Escapes', tagline: '', logo: '' },
  navigation: [{ label: 'Tours', href: '/tours' }],
  footer: { description: '', columns: [], legal: [] },
  publishedAt: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const VIEW: ViewWebsiteController = {
  mode: 'live',
  url: 'https://example.test/atlas-escapes',
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

function renderView(overrides: Partial<WebsiteViewProps> = {}) {
  const props: WebsiteViewProps = {
    draft: DRAFT,
    tourCatalog: [],
    catalogPending: false,
    isPublished: false,
    canEditContent: true,
    canPublish: true,
    isSaving: false,
    isPublishing: false,
    onSave: vi.fn(),
    onPublish: vi.fn(),
    viewWebsite: VIEW,
    ...overrides,
  };
  const result = render(<WebsiteView {...props} />);
  return { ...result, props };
}

describe('WebsiteView', () => {
  test('leads with one h1 and gives the open tab its own section heading', () => {
    renderView();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 2, name: 'Home' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Hero, trust points, promotion, testimonials and the closing call to action.'
      )
    ).toBeInTheDocument();
  });

  test('puts status and slug under the title, Publish filled, View light', () => {
    renderView({ isPublished: true });
    const heading = screen.getByRole('heading', { level: 1 });
    const meta = heading.parentElement?.parentElement ?? heading.parentElement;
    expect(meta).toHaveTextContent('Published');
    expect(meta).toHaveTextContent('atlas-escapes');
    // Mantine expresses a button variant through `--button-bg`, so the filled
    // Publish and the light View have to resolve to different surfaces.
    const publish = screen.getByRole('button', { name: 'Publish' });
    const view = screen.getByRole('button', { name: 'View live site' });
    expect(publish.style.getPropertyValue('--button-bg')).not.toBe(
      view.style.getPropertyValue('--button-bg')
    );
  });

  test('hides Publish without the permission but keeps the read-only editor', () => {
    renderView({ canPublish: false, canEditContent: false });
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(screen.getByText(/permissions don't allow saving changes/)).toBeInTheDocument();
  });

  test('reports the dirty state and clears it once the draft round-trips', async () => {
    const user = userEvent.setup();
    const { rerender, props } = renderView();
    expect(screen.getByText('Everything is saved.')).toBeInTheDocument();

    const title = screen.getByLabelText('Headline');
    await user.clear(title);
    await user.type(title, 'Atlas');
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    rerender(
      <WebsiteView
        {...props}
        draft={{
          ...DRAFT,
          content: {
            ...DRAFT.content,
            hero: { ...(DRAFT.content.hero as object), title: 'Atlas' },
          },
        }}
      />
    );
    expect(screen.getByText('Everything is saved.')).toBeInTheDocument();
  });

  test('keeps Save in a sticky bar so it is reachable without scrolling', () => {
    renderView();
    const save = screen.getByRole('button', { name: 'Save changes' });
    expect(save.closest('.app-sticky-save-bar')).not.toBeNull();
  });

  test('announces a failed submit through the error summary', async () => {
    const user = userEvent.setup();
    const { props } = renderView();
    // A trust point row with an empty title is the editor's real failure mode:
    // the row is valid to add but not to save.
    await user.click(screen.getByRole('button', { name: 'Add trust point' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/highlighted/i);
    expect(props.onSave).not.toHaveBeenCalled();
  });

  test('saves the form values once validation passes', async () => {
    const user = userEvent.setup();
    const { props } = renderView();
    const onSave = vi.mocked(props.onSave);
    await user.type(screen.getByLabelText('Headline'), '!');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].hero.title).toBe('Atlas Escapes!');
  });
});
