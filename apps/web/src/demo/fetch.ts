import { isDemoMode } from './session';

/** fetch for the SDK: demo mode answers from the in-browser store, otherwise the real network (resolved at call time). */
export const switchingFetch: typeof fetch = async (input, init) => {
  if (isDemoMode()) {
    const { handleDemoRequest } = await import('./handler');
    return handleDemoRequest(input instanceof Request ? input : new Request(input, init));
  }
  return globalThis.fetch(input, init);
};
