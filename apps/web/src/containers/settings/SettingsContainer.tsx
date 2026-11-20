import { SettingsPage } from '../../components/settings/SettingsPage';
import { HealthContainer } from '../HealthContainer';
import { TeamContainer } from '../team/TeamContainer';

export function SettingsContainer() {
  return <SettingsPage team={<TeamContainer />} system={<HealthContainer />} />;
}
