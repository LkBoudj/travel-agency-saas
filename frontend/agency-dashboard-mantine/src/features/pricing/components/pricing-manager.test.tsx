import { render, screen } from '@test-utils';
import { describe, expect, test, vi } from 'vitest';
import type { PricingOption } from '../types.ts';
import { PricingManager } from './pricing-manager.tsx';

const OPTIONS: PricingOption[] = [
  {
    code: 'PRC-1',
    name: 'Adult',
    description: 'Standard adult seat',
    basis: 'per_person',
    currency: 'DZD',
    status: 'ACTIVE',
    pricedDepartureCount: 3,
    createdAt: '2026-03-04T09:00:00.000Z',
    updatedAt: '2026-03-04T09:00:00.000Z',
  },
  {
    code: 'PRC-2',
    name: 'Child',
    description: null,
    basis: 'per_person',
    currency: 'DZD',
    status: 'INACTIVE',
    pricedDepartureCount: 0,
    createdAt: '2026-03-04T09:00:00.000Z',
    updatedAt: '2026-03-04T09:00:00.000Z',
  },
];

vi.mock('../hooks/use-pricing.ts', () => ({
  usePricingOverview: () => ({
    data: { options: OPTIONS, startingPrice: 4500, pricedOpenDepartureCount: 2 },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
  usePricingMutations: () => ({
    create: { mutate: vi.fn(), isPending: false },
    update: { mutate: vi.fn(), isPending: false },
    deactivate: { mutate: vi.fn(), isPending: false },
  }),
}));

const BASE_PROPS = { tourCode: 'TUR-1', canCreate: true, canEdit: true, canDeactivate: true };

describe('PricingManager', () => {
  test('leads with the three numbers as tiles, not as loose labels', () => {
    render(<PricingManager {...BASE_PROPS} />);

    // Each number keeps a label above it, so a reader can tell what "2" counts.
    expect(screen.getByText('Starting price')).toBeInTheDocument();
    expect(screen.getByText('Options')).toBeInTheDocument();
    expect(screen.getByText('2 options')).toBeInTheDocument();
  });

  test('counts the options it is showing, including the inactive one', () => {
    render(<PricingManager {...BASE_PROPS} />);

    // An inactive option still exists and still occupies a row; hiding it from
    // the count but not the table would be the inconsistency.
    expect(screen.getByText('2 options')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Child/ })).toBeInTheDocument();
  });

  test('names the options table', () => {
    render(<PricingManager {...BASE_PROPS} />);

    expect(screen.getByRole('table', { name: 'Pricing options' })).toBeInTheDocument();
  });

  test('offers no row menu for an inactive option, which cannot be edited', () => {
    render(<PricingManager {...BASE_PROPS} />);

    expect(screen.getByRole('button', { name: /Option actions Adult/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /PRC-2/ })).toBeNull();
  });

  test('shows the lifecycle status through the shared badge', () => {
    render(<PricingManager {...BASE_PROPS} />);

    // Same vocabulary as trips and bookings, so an option cannot look "off" in a
    // colour that means something else everywhere else.
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});
