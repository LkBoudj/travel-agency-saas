import { act, render, screen } from '@test-utils';
import { afterEach, describe, expect, test } from 'vitest';
import { setLocale } from '../../../i18n/index.ts';
import type { Customer } from '../types.ts';
import { CustomersTable } from './customers-table.tsx';

const CUSTOMER: Customer = {
  code: 'CUS-F941C9F036F2',
  firstName: 'Amina',
  lastName: 'Belaid',
  email: 'amina@example.com',
  phone: '+213 555 010 203',
  notes: null,
  status: 'ACTIVE',
  createdAt: '2026-03-04T09:00:00.000Z',
  updatedAt: '2026-03-04T09:00:00.000Z',
};

function renderTable(customers: Customer[], emptyAction?: React.ReactNode) {
  return render(
    <CustomersTable
      customers={customers}
      canUpdate={false}
      canArchive={false}
      onEdit={() => {}}
      onArchive={() => {}}
      emptyAction={emptyAction}
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

describe('CustomersTable cells', () => {
  test('renders the created date in the active locale', async () => {
    renderTable([CUSTOMER]);
    expect(await screen.findByText('Mar 4, 2026')).toBeInTheDocument();

    await useLocale('ar');
    expect(await screen.findByText('04‏/03‏/2026')).toBeInTheDocument();
  });

  test('states the next action when there is nothing to list', async () => {
    renderTable([], <button type="button">Add customer</button>);

    expect(
      await screen.findByText('Add the people you quote and book trips for.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add customer' })).toBeInTheDocument();
  });
});
