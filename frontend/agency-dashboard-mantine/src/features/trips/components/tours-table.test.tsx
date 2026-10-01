import { act, render, screen } from '@test-utils';
import { afterEach, describe, expect, test } from 'vitest';
import { setLocale } from '../../../i18n/index.ts';
import type { TourListRow } from '../types.ts';
import { ToursTable } from './tours-table.tsx';

const TOUR: TourListRow = {
  code: 'TUR-63C5B04471ED',
  name: 'Ghardaïa M’zab',
  internalRef: null,
  status: 'PUBLISHED',
  coverImageUrl: null,
  format: 'circuit',
  geographicScope: 'domestic',
  availabilityMode: 'scheduled',
  days: 3,
  nights: 2,
  hours: null,
  destinations: [{ place: 'Ghardaïa', cityId: null, wilayaCode: null }],
  startingPrice: 24000,
  createdAt: '2026-03-04T09:00:00.000Z',
  updatedAt: '2026-03-05T09:00:00.000Z',
};

function row(overrides: Partial<TourListRow> = {}): TourListRow {
  return { ...TOUR, ...overrides };
}

function renderTable(rows: TourListRow[]) {
  return render(
    <ToursTable
      tours={rows}
      canUpdate={false}
      canPublish={false}
      canArchive={false}
      onEdit={() => {}}
      onPublish={() => {}}
      onUnpublish={() => {}}
      onArchive={() => {}}
    />
  );
}

async function useLocale(locale: 'en' | 'ar') {
  await act(async () => {
    setLocale(locale);
  });
}

afterEach(async () => {
  await useLocale('en');
});

describe('ToursTable cells', () => {
  test('renders the created date in the active locale', async () => {
    renderTable([row()]);
    expect(await screen.findByText('Mar 4, 2026')).toBeInTheDocument();

    // `ar-DZ` renders day/month/year with RLM marks, not the English month name
    // `dayjs().format('ll')` used to hardcode.
    await useLocale('ar');
    expect(await screen.findByText('04‏/03‏/2026')).toBeInTheDocument();
  });

  test('labels the schedule in days', async () => {
    renderTable([row()]);
    expect(await screen.findByText('3 days')).toBeInTheDocument();
  });

  test('labels an hours-only trip in hours instead of showing it as days', async () => {
    renderTable([row({ days: null, nights: null, hours: 8 })]);
    expect(await screen.findByText('8 hours')).toBeInTheDocument();
    expect(screen.queryByText('8 days')).toBeNull();
  });

  test('falls back to a dash when the trip has no duration at all', async () => {
    renderTable([row({ days: null, nights: null, hours: null })]);
    expect(await screen.findByText('—')).toBeInTheDocument();
  });

  test('offers the next action when there is nothing to list', async () => {
    render(
      <ToursTable
        tours={[]}
        canUpdate={false}
        canPublish={false}
        canArchive={false}
        onEdit={() => {}}
        onPublish={() => {}}
        onUnpublish={() => {}}
        onArchive={() => {}}
        emptyAction={<button type="button">New trip</button>}
      />
    );

    expect(await screen.findByText('New trip')).toBeInTheDocument();
  });
});
describe('ToursTable in Arabic', () => {
  test('uses Arabic plural forms, not the English unit', async () => {
    renderTable([row({ days: 3 }), row({ days: 1 }), row({ days: null, nights: null, hours: 8 })]);

    await useLocale('ar');
    // 3 → few, 1 → one, and the hours-only trip still reads as hours.
    expect(await screen.findByText('3 أيام')).toBeInTheDocument();
    expect(screen.getByText('يوم واحد')).toBeInTheDocument();
    expect(screen.getByText('8 ساعات')).toBeInTheDocument();
  });
});
