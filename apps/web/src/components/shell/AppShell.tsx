import type { ReactNode } from 'react';
import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import FactoryOutlined from '@mui/icons-material/FactoryOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import PlayCircleOutline from '@mui/icons-material/PlayCircleOutlined';
import ScienceOutlined from '@mui/icons-material/ScienceOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';
import { BrandMark } from '../common/BrandMark';
import { ChangePasswordDialog, type ChangePasswordDialogProps } from './ChangePasswordDialog';

export type NavIcon =
  'dashboard' | 'org' | 'activities' | 'factors' | 'reports' | 'assistant' | 'settings' | 'companies';

export interface ShellTab {
  label: string;
  path: string;
  icon: NavIcon;
  /** Stable hook for the guided tour (`data-tour` attribute). */
  tourId?: string;
}

const ICONS: Record<NavIcon, ReactNode> = {
  dashboard: <DashboardOutlined fontSize="small" />,
  org: <AccountTreeOutlined fontSize="small" />,
  activities: <FactoryOutlined fontSize="small" />,
  factors: <ScienceOutlined fontSize="small" />,
  reports: <DescriptionOutlined fontSize="small" />,
  assistant: <AutoAwesomeOutlined fontSize="small" />,
  settings: <SettingsOutlined fontSize="small" />,
  companies: <BusinessOutlined fontSize="small" />,
};

export const NAV_WIDTH = 248;

export interface AppShellProps {
  /** Company name (tenant) — or a label like "Platform" for the super-admin console. */
  contextLabel: string;
  userName: string;
  userEmail: string;
  tabs: ShellTab[];
  activePath: string | false;
  mobileNavOpen: boolean;
  onToggleMobileNav: () => void;
  menuAnchor: HTMLElement | null;
  onOpenMenu: (anchor: HTMLElement) => void;
  onCloseMenu: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
  /** Shows the "Guided tour" entry when provided. */
  onStartTour?: () => void;
  showTemporaryPasswordBanner: boolean;
  changePassword: ChangePasswordDialogProps;
  /** Optional floating widgets (AI assistant launcher, guided tour). */
  floating?: ReactNode;
  children: ReactNode;
}

export function AppShell(p: AppShellProps) {
  const initials = p.userName
    .split(' ')
    .map((x) => x[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const nav = (
    <Stack sx={{ height: '100%' }}>
      <Box sx={{ px: 2.5, py: 2 }}>
        <BrandMark />
      </Box>
      <Box sx={{ px: 2.5, pb: 1.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>
          Workspace
        </Typography>
        <Typography variant="subtitle2" noWrap title={p.contextLabel}>
          {p.contextLabel}
        </Typography>
      </Box>
      <Divider />
      <List component="nav" aria-label="Main navigation" sx={{ px: 1.5, py: 1.5, flex: 1 }}>
        {p.tabs.map((t) => {
          const selected = p.activePath === t.path;
          return (
            <ListItemButton
              key={t.path}
              component={RouterLink}
              to={t.path}
              selected={selected}
              aria-current={selected ? 'page' : undefined}
              data-tour={t.tourId}
              onClick={() => p.mobileNavOpen && p.onToggleMobileNav()}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                py: 0.9,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': { color: 'inherit' },
                  '&:hover': { bgcolor: 'primary.dark' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{ICONS[t.icon]}</ListItemIcon>
              <ListItemText primary={t.label} slotProps={{ primary: { variant: 'body2', sx: { fontWeight: 600 } } }} />
            </ListItemButton>
          );
        })}
      </List>
      {p.onStartTour && (
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<PlayCircleOutline />}
            onClick={p.onStartTour}
            data-tour="tour-button"
          >
            Guided tour
          </Button>
        </Box>
      )}
    </Stack>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box component="aside" sx={{ width: { md: NAV_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={p.mobileNavOpen}
          onClose={p.onToggleMobileNav}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: NAV_WIDTH } }}
        >
          {nav}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: NAV_WIDTH, boxSizing: 'border-box', borderRight: 1, borderColor: 'divider' },
          }}
        >
          {nav}
        </Drawer>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
        >
          <Toolbar variant="dense" sx={{ gap: 1, minHeight: 56 }}>
            <IconButton
              aria-label="Open navigation"
              onClick={p.onToggleMobileNav}
              sx={{ display: { md: 'none' } }}
              edge="start"
            >
              <MenuIcon />
            </IconButton>
            <Box sx={{ display: { md: 'none' } }}>
              <BrandMark size={26} />
            </Box>
            <Box sx={{ flex: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {p.userName}
            </Typography>
            <IconButton aria-label="Account menu" onClick={(e) => p.onOpenMenu(e.currentTarget)}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13 }}>{initials}</Avatar>
            </IconButton>
            <Menu anchorEl={p.menuAnchor} open={Boolean(p.menuAnchor)} onClose={p.onCloseMenu}>
              <MenuItem disabled>
                <ListItemText primary={p.userName} secondary={p.userEmail} />
              </MenuItem>
              <Divider />
              <MenuItem onClick={p.onChangePassword}>Change password</MenuItem>
              <MenuItem onClick={p.onLogout}>Sign out</MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        {p.showTemporaryPasswordBanner && (
          <Alert
            severity="warning"
            square
            action={
              <Button color="inherit" size="small" onClick={p.onChangePassword}>
                Change now
              </Button>
            }
          >
            You signed in with an emailed password. Please choose a new one.
          </Alert>
        )}
        <Box component="main" sx={{ flex: 1, px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 }, minWidth: 0 }}>
          <Stack spacing={3}>{p.children}</Stack>
        </Box>
      </Box>
      <ChangePasswordDialog {...p.changePassword} />
      {p.floating}
    </Box>
  );
}
