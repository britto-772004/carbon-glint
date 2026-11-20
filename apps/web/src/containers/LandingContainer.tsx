import { LandingPage } from '../components/landing/LandingPage';
import { homePath, useMe } from './session/useMe';

export function LandingContainer() {
  const { me } = useMe();
  return <LandingPage isSignedIn={Boolean(me)} appPath={me ? homePath(me) : '/login'} />;
}
