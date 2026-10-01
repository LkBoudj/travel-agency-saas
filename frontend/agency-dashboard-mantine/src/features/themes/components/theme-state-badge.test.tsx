import { act, render, screen } from '@test-utils';
import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { setLocale } from '../../../i18n/index.ts';
import type { ThemeCardState } from '../lib/theme-card-state.ts';
import { ThemeStateBadge } from './theme-state-badge.tsx';

function state(overrides: Partial<ThemeCardState> = {}): ThemeCardState {
  return { isCurrent: false, isLive: false, isPendingPublish: false, ...overrides };
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

describe('ThemeStateBadge', () => {
  test('renders nothing for a theme that is neither current nor live', () => {
    const { container } = render(<ThemeStateBadge state={state()} />);
    // Not an empty <Group>: no chip at all, so the card footer keeps its
    // version on the left with nothing competing on the right.
    expect(container.querySelector('.mantine-Badge-root')).toBeNull();
  });

  test('marks the selected theme as current when the site already serves it', () => {
    render(<ThemeStateBadge state={state({ isCurrent: true, isLive: true })} />);
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    // Same theme on both sides: there is nothing left to publish.
    expect(screen.queryByText('Not published')).not.toBeInTheDocument();
  });

  test('adds the pending badge only while the draft differs from the live site', () => {
    render(
      <ThemeStateBadge state={state({ isCurrent: true, isLive: false, isPendingPublish: true })} />
    );
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Not published')).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });

  test('keeps the live badge on the theme the site still serves', () => {
    render(<ThemeStateBadge state={state({ isCurrent: false, isLive: true })} />);
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.queryByText('Current')).not.toBeInTheDocument();
    expect(screen.queryByText('Not published')).not.toBeInTheDocument();
  });

  test('uses the success palette for the live badge', () => {
    render(<ThemeStateBadge state={state({ isCurrent: true, isLive: true })} />);
    const badge = screen.getByText('Live').closest('.mantine-Badge-root');
    const styles = badge?.getAttribute('style') ?? '';
    expect(styles).toContain('success');
    // `teal` was the old hand-picked hue; the app's status vocabulary pairs
    // "live" with the `success` palette (see STATUS_COLORS in theme/colors.ts).
    expect(styles).not.toContain('teal');
  });

  test('uses the warning palette for the not-yet-published badge', () => {
    render(
      <ThemeStateBadge state={state({ isCurrent: true, isLive: false, isPendingPublish: true })} />
    );
    const badge = screen.getByText('Not published').closest('.mantine-Badge-root');
    const styles = badge?.getAttribute('style') ?? '';
    expect(styles).toContain('warning');
    expect(styles).not.toContain('yellow');
  });
});
