import type { ReactElement } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router';
import { AppProviders } from '../providers/AppProviders';
import { routes } from '../routes';

/** Fresh QueryClient per test: no retries, no cache bleed between tests. */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });

/** Render a component with the same providers as the real app (React Query + MUI theme) inside a router. */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'> & { route?: string }) {
  const queryClient = createTestQueryClient();
  return {
    user: userEvent.setup(),
    queryClient,
    ...render(ui, {
      wrapper: ({ children }) => (
        <AppProviders queryClient={queryClient}>
          <MemoryRouter initialEntries={[options?.route ?? '/']}>{children}</MemoryRouter>
        </AppProviders>
      ),
      ...options,
    }),
  };
}

/** Render the whole app (real routes, guards and containers) at a URL. `router.state.location` shows where it went. */
export function renderApp(path: string) {
  const queryClient = createTestQueryClient();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return {
    user: userEvent.setup(),
    router,
    queryClient,
    ...render(
      <AppProviders queryClient={queryClient}>
        <RouterProvider router={router} />
      </AppProviders>,
    ),
  };
}
