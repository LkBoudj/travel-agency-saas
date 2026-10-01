import { render, screen } from '@test-utils';
import { act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { setLocale } from '../../../i18n/index.ts';
import type { MembersPageController } from '../hooks/use-members-page.ts';
import { MembersView } from './members-view.tsx';

beforeAll(async () => {
  await act(async () => {
    setLocale('en');
  });
});

function controller(overrides: Partial<MembersPageController> = {}) {
  return {
    members: [],
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    search: { raw: '', setRaw: vi.fn() },
    canInvite: true,
    canRoleManage: true,
    canAssignRoles: true,
    canUpdate: true,
    canRemove: true,
    openInviteDialog: vi.fn(),
    invitations: [],
    invitationsPending: false,
    canRevoke: true,
    revokeInvitation: vi.fn(),
    ...overrides,
  } as unknown as MembersPageController;
}

function renderView(overrides: Partial<MembersPageController> = {}) {
  return render(
    <MemoryRouter>
      <MembersView {...controller(overrides)} />
    </MemoryRouter>
  );
}

/**
 * The page title is the h1. Each list underneath it is its own section, so a
 * screen reader can jump between the two regions instead of hearing one flat
 * list of forty rows.
 */
describe('MembersView headings', () => {
  test('gives every section its own h2 below the page title', () => {
    renderView();
    expect(screen.getByRole('heading', { level: 1, name: /team/i })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: /members/i })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: /invitations/i })).toBeTruthy();
  });

  test('keeps the members heading when invitations are not allowed', () => {
    renderView({ canInvite: false });
    expect(screen.getByRole('heading', { level: 2, name: /members/i })).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 2, name: /invitations/i })).toBeNull();
  });

  test('keeps the search reachable without a card wrapper around it', () => {
    renderView();
    expect(screen.getByPlaceholderText(/search members/i)).toBeTruthy();
  });
});
