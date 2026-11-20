import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildInvitation, buildUser } from '../../test/fixtures';
import { renderWithProviders } from '../../test/render';
import { TeamPanel, type TeamPanelProps } from './TeamPanel';

const base: TeamPanelProps = {
  users: [buildUser(), buildUser({ id: 'u2', name: 'Ben', email: 'ben@acme.com' })],
  invitations: [buildInvitation(), buildInvitation({ id: 'i2', email: 'old@acme.com', status: 'revoked' })],
  isLoading: false,
  currentUserId: buildUser().id,
  emailDomain: 'acme.com',
  onInvite: vi.fn(),
  isInviting: false,
  onRevoke: vi.fn(),
  onResend: vi.fn(),
  onSetUserStatus: vi.fn(),
};

describe('TeamPanel', () => {
  it('loading branch', () => {
    renderWithProviders(<TeamPanel {...base} isLoading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('error branch', () => {
    renderWithProviders(<TeamPanel {...base} error="Nope" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Nope');
  });

  it('marks you, hides self-disable, disables others', async () => {
    const onSetUserStatus = vi.fn();
    const { user } = renderWithProviders(<TeamPanel {...base} onSetUserStatus={onSetUserStatus} />);
    const team = screen.getByRole('table', { name: 'Team members' });
    expect(within(team).getByText('(you)')).toBeInTheDocument();
    expect(within(team).getAllByRole('button', { name: 'Disable' })).toHaveLength(1);
    await user.click(within(team).getByRole('button', { name: 'Disable' }));
    expect(onSetUserStatus).toHaveBeenCalledWith('u2', 'disabled');
  });

  it('pending invitations can be resent or revoked; revoked ones cannot', async () => {
    const onRevoke = vi.fn();
    const { user } = renderWithProviders(<TeamPanel {...base} onRevoke={onRevoke} />);
    const invites = screen.getByRole('table', { name: 'Invitations' });
    expect(within(invites).getAllByRole('button', { name: 'Revoke' })).toHaveLength(1);
    await user.click(within(invites).getByRole('button', { name: 'Revoke' }));
    expect(onRevoke).toHaveBeenCalledWith(buildInvitation().id);
  });

  it('shows invite feedback', () => {
    renderWithProviders(<TeamPanel {...base} inviteError="Wrong domain" inviteSentTo={undefined} />);
    expect(screen.getByText('Wrong domain')).toBeInTheDocument();
  });
});
