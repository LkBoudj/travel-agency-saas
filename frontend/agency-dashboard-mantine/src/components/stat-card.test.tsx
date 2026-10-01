import { render, screen } from '@test-utils';
import { act } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { setLocale } from '../i18n/index.ts';
import { StatCard } from './stat-card.tsx';

/**
 * Arabic is a product language, so the drill-in affordance cannot keep pointing
 * at the physical right edge: in RTL "forward" is leftwards.
 */
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

describe('StatCard in RTL', () => {
  test('points its drill-in chevron the other way in Arabic', async () => {
    const { container, rerender } = render(
      <StatCard label="Open departures" value="12" onClick={vi.fn()} />
    );
    expect(container.querySelector('.tabler-icon-chevron-right')).not.toBeNull();

    await useLocale('ar');
    rerender(<StatCard label="Open departures" value="12" onClick={vi.fn()} />);
    expect(container.querySelector('.tabler-icon-chevron-left')).not.toBeNull();
    expect(container.querySelector('.tabler-icon-chevron-right')).toBeNull();
  });

  test('keeps the label and value as the accessible name of the tile', () => {
    render(<StatCard label="Open departures" value="12" onClick={vi.fn()} />);
    expect(screen.getByRole('button').textContent).toMatch(/departures/i);
    expect(screen.getByRole('button').textContent).toContain('12');
  });
});
