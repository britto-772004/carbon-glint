import type { ReactElement } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProviders } from '../providers/AppProviders';

/** Fresh QueryClient per test: no retries, no cache bleed between tests. */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });

/** Render with the same providers as the real app (React Query + MUI theme). */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  const queryClient = createTestQueryClient();
  return {
    user: userEvent.setup(),
    queryClient,
    ...render(ui, {
      wrapper: ({ children }) => <AppProviders queryClient={queryClient}>{children}</AppProviders>,
      ...options,
    }),
  };
}
