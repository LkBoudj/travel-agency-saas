import { render } from '@test-utils';
import { act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { setLocale } from '../../../i18n/index.ts';
import type { DeparturesPageController } from '../hooks/use-departures-page.ts';
import { DeparturesView } from './departures-view.tsx';

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

function emptyController() {
  return {
    toursPending: false,
    toursEmpty: true,
    goToTrips: vi.fn(),
  } as unknown as DeparturesPageController;
}

/**
 * "Back to tours" is a directional affordance: an arrow that keeps pointing
 * left while the Arabic page reads rightwards sends the reader the wrong way.
 */
describe('DeparturesView back action in RTL', () => {
  test('points the back arrow the other way in Arabic', async () => {
    const { container, rerender } = render(
      <MemoryRouter>
        <DeparturesView controller={emptyController()} />
      </MemoryRouter>
    );
    expect(container.querySelector('.tabler-icon-arrow-left')).not.toBeNull();

    await useLocale('ar');
    rerender(
      <MemoryRouter>
        <DeparturesView controller={emptyController()} />
      </MemoryRouter>
    );
    expect(container.querySelector('.tabler-icon-arrow-right')).not.toBeNull();
    expect(container.querySelector('.tabler-icon-arrow-left')).toBeNull();
  });
});
