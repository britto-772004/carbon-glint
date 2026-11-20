import type { ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Toolbar from '@mui/material/Toolbar';
import { Link as RouterLink } from 'react-router';
import { BrandMark } from '../common/BrandMark';
import { ChangePasswordDialog, type ChangePasswordDialogProps } from './ChangePasswordDialog';

export interface ShellTab {
  label: string;
  path: string;
}

export interface AppShellProps {
  /** Company name (tenant) — or a label like "Platform" for the super-admin console. */
  contextLabel: string;
  userName: string;
  userEmail: string;
  tabs: ShellTab[];
  activePath: string | false;
  menuAnchor: HTMLElement | null;
  onOpenMenu: (anchor: HTMLElement) => void;
  onCloseMenu: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
  showTemporaryPasswordBanner: boolean;
  changePassword: ChangePasswordDialogProps;
  children: ReactNode;
}

export function AppShell({
  contextLabel,
  userName,
  userEmail,
  tabs,
  activePath,
  menuAnchor,
  onOpenMenu,
  onCloseMenu,
  onChangePassword,
  onLogout,
  showTemporaryPasswordBanner,
  changePassword,
  children,
}: AppShellProps) {
  const initials = userName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2 }}>
          <BrandMark />
          <Chip label={contextLabel} variant="outlined" color="primary" sx={{ display: { xs: 'none', sm: 'flex' } }} />
          <Box sx={{ flex: 1 }} />
          <IconButton aria-label="Account menu" onClick={(e) => onOpenMenu(e.currentTarget)}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}>{initials}</Avatar>
          </IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={onCloseMenu}>
            <MenuItem disabled>
              <ListItemText primary={userName} secondary={userEmail} />
            </MenuItem>
            <Divider />
            <MenuItem onClick={onChangePassword}>Change password</MenuItem>
            <MenuItem onClick={onLogout}>Sign out</MenuItem>
          </Menu>
        </Toolbar>
        {tabs.length > 0 && (
          <Tabs value={activePath} variant="scrollable" scrollButtons="auto" sx={{ px: { xs: 1, sm: 2 } }}>
            {tabs.map((t) => (
              <Tab key={t.path} label={t.label} value={t.path} component={RouterLink} to={t.path} />
            ))}
          </Tabs>
        )}
      </AppBar>
      {showTemporaryPasswordBanner && (
        <Alert
          severity="warning"
          square
          action={
            <Button color="inherit" size="small" onClick={onChangePassword}>
              Change now
            </Button>
          }
        >
          You signed in with an emailed password. Please choose a new one.
        </Alert>
      )}
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        <Stack spacing={3}>{children}</Stack>
      </Container>
      <ChangePasswordDialog {...changePassword} />
    </Box>
  );
}
