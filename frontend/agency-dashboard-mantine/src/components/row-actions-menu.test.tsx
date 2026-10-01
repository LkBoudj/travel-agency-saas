import { act, render, screen } from '@test-utils';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
// Side effect: the trigger's accessible name comes from the shared catalog, so
// the suite has to boot i18n the way the app does.
import { setLocale } from '../i18n/index.ts';
import { RowActionsMenu } from './row-actions-menu.tsx';

async function useLocale(locale: 'en' | 'ar') {
  await act(async () => {
    setLocale(locale);
  });
}

afterEach(async () => {
  await useLocale('en');
});

/**
 * The row-level action shell. What matters is not the icon but that the trigger
 * is named, reachable and keyboard-operable — an unlabelled ellipsis is
 * invisible to a screen reader.
 */
const ACTIONS = [
  { key: 'edit', label: 'Edit', onClick: vi.fn() },
  { key: 'archive', label: 'Archive', color: 'red', onClick: vi.fn() },
];

describe('RowActionsMenu', () => {
  test('names the trigger instead of leaving an unlabelled ellipsis', async () => {
    render(<RowActionsMenu actions={ACTIONS} />);

    expect(await screen.findByRole('button', { name: 'Row actions' })).toBeInTheDocument();
  });

  test('translates the trigger name', async () => {
    render(<RowActionsMenu actions={ACTIONS} />);
    expect(await screen.findByRole('button', { name: 'Row actions' })).toBeInTheDocument();

    await useLocale('ar');
    expect(await screen.findByRole('button', { name: 'إجراءات الصف' })).toBeInTheDocument();
  });

  test('lets a row name itself, so one menu does not read the same for every row', async () => {
    render(<RowActionsMenu actions={ACTIONS} label="Departure actions DEP-1" />);

    expect(
      await screen.findByRole('button', { name: 'Departure actions DEP-1' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Row actions' })).toBeNull();
  });

  test('runs an action from the keyboard alone', async () => {
    const onClick = vi.fn();
    render(<RowActionsMenu actions={[{ key: 'edit', label: 'Edit', onClick }]} />);

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Row actions' })).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('hides actions the caller left out entirely', async () => {
    render(<RowActionsMenu actions={[]} />);

    expect(screen.queryByRole('button', { name: 'Row actions' })).toBeNull();
  });
});
