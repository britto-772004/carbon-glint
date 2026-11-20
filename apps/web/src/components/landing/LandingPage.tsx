import { NatureLanding } from './variants/NatureLanding';

export interface LandingPageProps {
  isSignedIn: boolean;
  appPath: string;
  /** True once the page has scrolled a little (the header changes from transparent to a white pill). */
  isScrolled?: boolean;
}

export function LandingPage({ isSignedIn, appPath, isScrolled }: LandingPageProps) {
  return <NatureLanding isSignedIn={isSignedIn} appPath={appPath} isScrolled={isScrolled} />;
}
