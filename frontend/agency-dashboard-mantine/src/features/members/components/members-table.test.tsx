import { act, render, screen } from '@test-utils';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { setLocale } from '../../../i18n/index.ts';
import type { AgencyMember } from '../types.ts';
import { InvitationsTable } from './invitations-table.tsx';
import { MembersTable } from './members-table.tsx';

beforeAll(async () => {
  await act(async () => {
    setLocale('en');
  });
});

const MEMBER: AgencyMember = {
  code: 'AGM-1',
  firstName: 'Ada',
  lastName: 'Bouzid',
  email: 'ada@example.com',
  accountStatus: 'ACTIVE',
  membershipType: 'EMPLOYEE',
  membershipStatus: 'ACTIVE',
  roles: [{ key: 'RL-1', name: 'Bookings' }],
  joinedAt: '2026-03-04T09:00:00.000Z',
};

const SUSPENDED: AgencyMember = {
  ...MEMBER,
  code: 'AGM-2',
  email: 'omar@example.com',
  firstName: 'Omar',
  lastName: null,
  membershipStatus: 'SUSPENDED',
};

const BASE_PROPS = {
  members: [MEMBER, SUSPENDED],
  currentUserCode: 'AGM-9',
  canRoleManage: true,
  canUpdate: true,
  canRemove: true,
  loading: false,
  isError: false,
  onRetry: vi.fn(),
  onManageRoles: vi.fn(),
  onToggleStatus: vi.fn(),
  onRemove: vi.fn(),
};

function renderMembers(overrides: Partial<typeof BASE_PROPS> = {}) {
  return render(<MembersTable {...BASE_PROPS} {...overrides} />);
}

async function openRowMenu(row = 0) {
  const trigger = screen.getAllByRole('button', { name: /member actions/i })[row];
  await act(async () => {
    await userEvent.click(trigger);
  });
}

describe('MembersTable row actions', () => {
  test('opens the shared row menu for a member', async () => {
    renderMembers();
    await openRowMenu();
    expect(screen.getByRole('menuitem', { name: /manage roles/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /suspend/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /remove/i })).toBeTruthy();
  });

  test('offers reactivate instead of suspend for a suspended member', async () => {
    renderMembers();
    await openRowMenu(1);
    expect(screen.getByRole('menuitem', { name: /reactivate/i })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: /^suspend$/i })).toBeNull();
  });

  test('leaves the row without a trigger when the viewer has no rights', () => {
    renderMembers({ canRoleManage: false, canUpdate: false, canRemove: false });
    expect(screen.queryAllByRole('button', { name: /member actions/i })).toHaveLength(0);
  });

  test('marks a destructive entry with the danger palette', async () => {
    renderMembers();
    await openRowMenu();
    const styles = screen.getByRole('menuitem', { name: /remove/i }).getAttribute('style') ?? '';
    // `red` was hand-picked; the app names the destructive palette `danger`.
    expect(styles).toContain('danger');
    expect(styles).not.toContain('--menu-item-color: var(--mantine-color-red');
  });

  test('warns before suspending and confirms a reactivation', async () => {
    renderMembers();
    await openRowMenu();
    const suspendStyles =
      screen.getByRole('menuitem', { name: /suspend/i }).getAttribute('style') ?? '';
    expect(suspendStyles).toContain('warning');
    expect(suspendStyles).not.toContain('orange-');
  });

  test('confirms a reactivation with the success palette', async () => {
    renderMembers();
    await openRowMenu(1);
    const styles =
      screen.getByRole('menuitem', { name: /reactivate/i }).getAttribute('style') ?? '';
    expect(styles).toContain('success');
    expect(styles).not.toContain('teal-');
  });
});

describe('InvitationsTable row actions', () => {
  const invitation = {
    code: 'AGT-1',
    email: 'new@example.com',
    status: 'PENDING' as const,
    roles: [],
    expiresAt: '2026-10-20T09:00:00.000Z',
    createdAt: '2026-10-01T09:00:00.000Z',
  };

  test('revokes through the shared row menu', async () => {
    const onRevoke = vi.fn();
    render(<InvitationsTable invitations={[invitation]} canRevoke onRevoke={onRevoke} />);
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /revoke/i }));
    });
    const item = screen.getByRole('menuitem', { name: /revoke/i });
    expect(item.getAttribute('style') ?? '').toContain('danger');
    await act(async () => {
      await userEvent.click(screen.getByRole('menuitem', { name: /revoke/i }));
    });
    expect(onRevoke).toHaveBeenCalledWith(invitation);
  });

  test('offers no action when revoking is not allowed', () => {
    render(<InvitationsTable invitations={[invitation]} canRevoke={false} onRevoke={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /revoke/i })).toBeNull();
  });
});
