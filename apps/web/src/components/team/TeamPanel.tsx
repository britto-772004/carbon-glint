import type { FormEvent } from 'react';
import type { Invitation, User } from '@carbon-glint/sdk';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { formValues } from '../../lib/errors';

import type { Pagination } from '../../lib/pagination';
import { TablePager } from '../common/TablePager';

export interface TeamPanelProps {
  /** The current page of members / invitations. */
  users?: User[];
  invitations?: Invitation[];
  userPagination: Pagination;
  invitationPagination: Pagination;
  isLoading: boolean;
  error?: string;
  currentUserId: string;
  emailDomain: string;
  onInvite: (email: string) => void;
  isInviting: boolean;
  inviteError?: string;
  inviteSentTo?: string;
  onRevoke: (invitationId: string) => void;
  onResend: (invitationId: string) => void;
  onSetUserStatus: (userId: string, status: 'active' | 'disabled') => void;
}

const STATUS_COLOR = { active: 'success', pending: 'warning', disabled: 'default' } as const;
const INVITE_COLOR = { pending: 'info', accepted: 'success', revoked: 'default', expired: 'warning' } as const;
const date = (iso: string) => new Date(iso).toLocaleDateString();

export function TeamPanel(props: TeamPanelProps) {
  const { users, invitations, isLoading, error, currentUserId, emailDomain } = props;
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    props.onInvite(formValues(e.currentTarget).email ?? '');
    e.currentTarget.reset();
  };

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Stack spacing={3}>
      <Card>
        <CardHeader title="Invite a colleague" subheader={`Colleagues must use an @${emailDomain} email.`} />
        <CardContent>
          <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={2} onSubmit={submit}>
            <TextField name="email" type="email" label="Work email" required fullWidth size="small" />
            <Button type="submit" variant="contained" loading={props.isInviting} sx={{ whiteSpace: 'nowrap' }}>
              Send invite
            </Button>
          </Stack>
          {props.inviteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {props.inviteError}
            </Alert>
          )}
          {props.inviteSentTo && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Invitation sent to {props.inviteSentTo}.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Team" />
        {isLoading ? (
          <CardContent>
            <Skeleton role="status" height={120} />
          </CardContent>
        ) : (
          <>
            <TableContainer>
              <Table size="small" aria-label="Team members">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last sign-in</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(users ?? []).map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        {u.name}
                        {u.id === currentUserId && (
                          <Typography component="span" color="text.secondary" variant="body2">
                            {' '}
                            (you)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Chip size="small" label={u.status} color={STATUS_COLOR[u.status]} />
                      </TableCell>
                      <TableCell>{u.lastLoginAt ? date(u.lastLoginAt) : '—'}</TableCell>
                      <TableCell align="right">
                        {u.id !== currentUserId && u.status !== 'pending' && (
                          <Button
                            size="small"
                            color={u.status === 'active' ? 'error' : 'primary'}
                            onClick={() => props.onSetUserStatus(u.id, u.status === 'active' ? 'disabled' : 'active')}
                          >
                            {u.status === 'active' ? 'Disable' : 'Enable'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePager {...props.userPagination} />
          </>
        )}
      </Card>

      {!isLoading && (invitations?.length ?? 0) > 0 && (
        <Card>
          <CardHeader title="Invitations" />
          <TableContainer>
            <Table size="small" aria-label="Invitations">
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invitations!.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.email}</TableCell>
                    <TableCell>
                      <Chip size="small" label={i.status} color={INVITE_COLOR[i.status]} />
                    </TableCell>
                    <TableCell>{date(i.expiresAt)}</TableCell>
                    <TableCell align="right">
                      {(i.status === 'pending' || i.status === 'expired') && (
                        <Button size="small" onClick={() => props.onResend(i.id)}>
                          Resend
                        </Button>
                      )}
                      {i.status === 'pending' && (
                        <Button size="small" color="error" onClick={() => props.onRevoke(i.id)}>
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePager {...props.invitationPagination} />
        </Card>
      )}
    </Stack>
  );
}
