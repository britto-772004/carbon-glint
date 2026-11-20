import { SettingsPage } from '../../components/settings/SettingsPage';
import { HealthContainer } from '../HealthContainer';
import { TeamContainer } from '../team/TeamContainer';
import { EmissionFactorSourcesContainer } from './EmissionFactorSourcesContainer';

export function SettingsContainer() {
  return (
    <SettingsPage team={<TeamContainer />} factors={<EmissionFactorSourcesContainer />} system={<HealthContainer />} />
  );
}
