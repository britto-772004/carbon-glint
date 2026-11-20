/** What the landing page receives. */
export interface LandingVariantProps {
  isSignedIn: boolean;
  appPath: string;
  /** True once the page has scrolled a little (set by the container; used by the floating header). */
  isScrolled?: boolean;
}
