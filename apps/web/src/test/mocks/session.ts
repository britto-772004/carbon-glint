import type { Me } from '@carbon-glint/sdk';

/** Mutable "server-side session" shared by MSW handlers. Reset after each test. */
export const session: { me: Me | null } = { me: null };

export const signIn = (me: Me) => {
  session.me = me;
};
export const resetSession = () => {
  session.me = null;
};
