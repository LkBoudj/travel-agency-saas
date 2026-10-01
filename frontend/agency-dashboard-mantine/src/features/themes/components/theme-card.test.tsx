import { act, render, screen } from '@test-utils';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { setLocale } from '../../../i18n/index.ts';
import type { ThemeCardState } from '../lib/theme-card-state.ts';
import { ThemeCard, type ThemeCardProps } from './theme-card.tsx';

function state(overrides: Partial<ThemeCardState> = {}): ThemeCardState {
  return { isCurrent: false, isLive: false, isPendingPublish: false, ...overrides };
}

function card(overrides: Partial<ThemeCardProps> = {}) {
  const props: ThemeCardProps = {
    themeId: 'starter',
    name: 'Starter',
    description: 'A single-column layout with a hero and featured tours.',
    version: '1.4.0',
    previewUrl: null,
    state: state(),
    canEdit: true,
    busy: false,
    onPreview: vi.fn(),
    onCustomize: vi.fn(),
    onActivate: vi.fn(),
    ...overrides,
  };
  return { ...render(<ThemeCard {...props} />), props };
}

beforeAll(async () => {
  await act(async () => {
    setLocale('en');
  });
});

afterEach(async () => {
  await act(async () => {
    setLocale('en');
  });
});

/** Mantine expresses a button variant through `--button-bg`. */
function variantOf(button: HTMLElement): string {
  return button.style.getPropertyValue('--button-bg');
}

describe('ThemeCard', () => {
  test('marks the selected card with data-current and the accent border token', () => {
    card({ state: state({ isCurrent: true, isLive: true }) });
    const selected = screen.getByText('Starter').closest('.mantine-Card-root');
    expect(selected).toHaveAttribute('data-current', 'true');
    expect(selected?.getAttribute('style')).toContain('--app-accent-border');
  });

  test('leaves the other cards unmarked and on the normal border', () => {
    card();
    const other = screen.getByText('Starter').closest('.mantine-Card-root');
    expect(other).toHaveAttribute('data-current', 'false');
    expect(other?.getAttribute('style') ?? '').not.toContain('--app-accent-border');
  });

  test('offers Activate as the primary action on a theme that is not selected', async () => {
    const user = userEvent.setup();
    const { props } = card();
    const activate = screen.getByRole('button', { name: 'Activate' });
    const preview = screen.getByRole('button', { name: 'Preview' });
    // Primary filled, tertiary subtle — they must not resolve to the same
    // surface, or the page has two competing calls to action per card.
    expect(variantOf(activate)).not.toBe('');
    expect(variantOf(activate)).not.toBe(variantOf(preview));
    expect(screen.queryByRole('button', { name: 'Customize' })).not.toBeInTheDocument();

    await user.click(activate);
    expect(props.onActivate).toHaveBeenCalledTimes(1);
  });

  test('offers Customize instead of Activate on the selected theme', () => {
    card({ state: state({ isCurrent: true }) });
    expect(screen.getByRole('button', { name: 'Customize' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Activate' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument();
  });

  test('keeps version and state on one footer row so cards line up', () => {
    card({ state: state({ isCurrent: true, isLive: true }) });
    const footer = screen.getByText('v1.4.0').closest('.mantine-Group-root');
    expect(footer).toHaveStyle({ '--group-justify': 'space-between' });
    expect(footer).toHaveTextContent('Current');
    expect(footer).toHaveTextContent('Live');
  });

  test('keeps Preview available while a mutation is in flight', () => {
    card({ busy: true });
    expect(screen.getByRole('button', { name: 'Preview' })).toBeDisabled();
  });

  test('hides every action and explains why without edit permission', () => {
    card({ canEdit: false });
    expect(screen.queryByRole('button', { name: 'Preview' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Activate' })).not.toBeInTheDocument();
    expect(
      screen.getByText("You can view themes, but your permissions don't allow changing them.")
    ).toBeInTheDocument();
  });
});
