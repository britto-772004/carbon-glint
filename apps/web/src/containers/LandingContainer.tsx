import { useEffect, useState } from 'react';
import { LandingPage } from '../components/landing/LandingPage';
import { homePath, useMe } from './session/useMe';

/** Passes the session and the scroll state to the landing page (the header changes once you scroll). */
export function LandingContainer() {
  const { me } = useMe();
  const [isScrolled, setIsScrolled] = useState(() => window.scrollY > 24);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return <LandingPage isSignedIn={Boolean(me)} appPath={me ? homePath(me) : '/login'} isScrolled={isScrolled} />;
}
