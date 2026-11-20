import { useQuery } from '@tanstack/react-query';
import { getMeOptions, type Me } from '@carbon-glint/sdk';

/** The signed-in session (null when signed out). Shared by guards and shells. */
export function useMe() {
  const query = useQuery({ ...getMeOptions(), retry: false, staleTime: 60_000 });
  return { me: query.isError ? null : query.data, isPending: query.isPending && !query.isError };
}

/** Where a signed-in user belongs. */
export function homePath(me: Me): string {
  if (me.user.role === 'superadmin') return '/platform';
  if (!me.tenant?.onboarded) return '/onboarding';
  return '/app/dashboard';
}
