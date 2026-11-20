import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Me, Tenant } from '@carbon-glint/sdk';
import { apiUrl } from './constants';
import { buildMe, superAdminMe } from './fixtures';
import { apiError } from './mocks/handlers';
import { server } from './mocks/server';
import { session, signIn } from './mocks/session';
import { renderApp } from './render';

/** App-level journeys: real routes, guards, containers and SDK; network mocked by MSW. */
describe('session routing', () => {
  it('sends signed-out users from /app to /login', async () => {
    const { router } = renderApp('/app/dashboard');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('sends a signed-in, onboarded admin from /login to the dashboard with tabs and tenant name', async () => {
    signIn(buildMe());
    const { router } = renderApp('/login');
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/dashboard'));
    expect(await screen.findByRole('tab', { name: 'Org Units' })).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });

  it('forces onboarding before the app', async () => {
    signIn(buildMe({ tenant: { onboarded: false, industry: null } }));
    const { router } = renderApp('/app/dashboard');
    await waitFor(() => expect(router.state.location.pathname).toBe('/onboarding'));
  });

  it('keeps super admins in the platform console and out of tenant routes', async () => {
    signIn(superAdminMe());
    server.use(http.get(apiUrl('/platform/tenants'), () => HttpResponse.json([])));
    const { router } = renderApp('/app/settings');
    await waitFor(() => expect(router.state.location.pathname).toBe('/platform'));
    expect(await screen.findByRole('heading', { name: 'Companies' })).toBeInTheDocument();
  });
});

describe('login', () => {
  it('signs in and routes to onboarding for a new company', async () => {
    server.use(
      http.post(apiUrl('/auth/login'), async ({ request }) => {
        expect(await request.json()).toEqual({ email: 'asha@acme.com', password: 'correct-horse-9' });
        const me = buildMe({ tenant: { onboarded: false, industry: null } });
        signIn(me);
        return HttpResponse.json<Me>(me);
      }),
    );
    const { user, router } = renderApp('/login');
    await user.type(await screen.findByLabelText(/Work email/), 'asha@acme.com');
    await user.type(screen.getByLabelText(/Password/), 'correct-horse-9');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/onboarding'));
  });

  it('offers to resend the verification link for unverified accounts', async () => {
    let resent = false;
    server.use(
      http.post(apiUrl('/auth/login'), () =>
        apiError(403, { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email first.' }),
      ),
      http.post(apiUrl('/auth/resend-verification'), () => {
        resent = true;
        return HttpResponse.json({ message: 'ok' }, { status: 202 });
      }),
    );
    const { user } = renderApp('/login');
    await user.type(await screen.findByLabelText(/Work email/), 'asha@acme.com');
    await user.type(screen.getByLabelText(/Password/), 'x');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Please verify your email first.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Resend link' }));
    expect(await screen.findByText(/new verification link is on its way/)).toBeInTheDocument();
    expect(resent).toBe(true);
  });
});

describe('sign up + verify', () => {
  it('shows "check your inbox" after sign-up', async () => {
    server.use(http.post(apiUrl('/auth/signup'), () => HttpResponse.json({ message: 'ok' }, { status: 202 })));
    const { user } = renderApp('/signup');
    await user.type(await screen.findByLabelText(/Full name/), 'Asha Rao');
    await user.type(screen.getByLabelText(/Work email/), 'asha@acme.com');
    await user.type(screen.getByLabelText(/Password/), 'correct-horse-9');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Check your inbox')).toBeInTheDocument();
    expect(screen.getByText('asha@acme.com')).toBeInTheDocument();
  });

  it('shows the work-email error from the API', async () => {
    server.use(
      http.post(apiUrl('/auth/signup'), () =>
        apiError(422, { code: 'WORK_EMAIL_REQUIRED', message: 'Please use your work email address.' }),
      ),
    );
    const { user } = renderApp('/signup');
    await user.type(await screen.findByLabelText(/Full name/), 'A');
    await user.type(screen.getByLabelText(/Work email/), 'a@gmail.com');
    await user.type(screen.getByLabelText(/Password/), 'correct-horse-9');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Please use your work email address.')).toBeInTheDocument();
  });

  it('verifies the email link exactly once and lands on onboarding', async () => {
    let calls = 0;
    server.use(
      http.post(apiUrl('/auth/verify-email'), () => {
        calls += 1;
        const me = buildMe({ tenant: { onboarded: false, industry: null } });
        signIn(me);
        return HttpResponse.json<Me>(me);
      }),
    );
    const { router } = renderApp(`/verify-email?token=${'t'.repeat(43)}`);
    await waitFor(() => expect(router.state.location.pathname).toBe('/onboarding'));
    expect(calls).toBe(1);
  });
});

describe('onboarding wizard', () => {
  it('collects all answers across steps and opens the dashboard', async () => {
    signIn(buildMe({ tenant: { onboarded: false, industry: null, name: 'Acme' } }));
    let body: unknown;
    server.use(
      http.put(apiUrl('/tenant/onboarding'), async ({ request }) => {
        body = await request.json();
        session.me = buildMe();
        return HttpResponse.json<Tenant>(session.me.tenant!);
      }),
    );
    const { user, router } = renderApp('/onboarding');

    const industry = await screen.findByRole('combobox', { name: /Nature of industry/ });
    await user.click(industry);
    await user.click(await screen.findByRole('option', { name: 'Manufacturing' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.click(await screen.findByRole('combobox', { name: /Number of employees/ }));
    await user.click(await screen.findByRole('option', { name: '251-1000' }));
    await user.type(screen.getByLabelText(/branches/), '7');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.type(await screen.findByLabelText(/LinkedIn/), 'https://www.linkedin.com/company/acme');
    await user.click(screen.getByRole('button', { name: /Finish/ }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/app/dashboard'));
    expect(body).toEqual({
      companyName: 'Acme',
      industryId: '22222222-2222-4222-8222-222222222222',
      employeeBand: '251-1000',
      businessUnitCount: 7,
      website: 'https://acme.com',
      linkedinUrl: 'https://www.linkedin.com/company/acme',
    });
  });
});

describe('settings: team', () => {
  it('invites a colleague and refreshes the list', async () => {
    signIn(buildMe());
    let invited: unknown;
    server.use(
      http.post(apiUrl('/invitations'), async ({ request }) => {
        invited = await request.json();
        return HttpResponse.json(
          {
            id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
            email: 'cy@acme.com',
            status: 'pending',
            expiresAt: '2026-11-27T00:00:00.000Z',
            createdAt: '2026-11-20T00:00:00.000Z',
          },
          { status: 201 },
        );
      }),
    );
    const { user } = renderApp('/app/settings');
    const inviteCard = (await screen.findByText('Invite a colleague')).closest('.MuiCard-root') as HTMLElement;
    await user.type(within(inviteCard).getByLabelText(/Work email/), 'cy@acme.com');
    await user.click(within(inviteCard).getByRole('button', { name: 'Send invite' }));
    expect(await screen.findByText('Invitation sent to cy@acme.com.')).toBeInTheDocument();
    expect(invited).toEqual({ email: 'cy@acme.com' });
  });

  it('signs out from the account menu', async () => {
    signIn(buildMe());
    const { user, router } = renderApp('/app/settings');
    await user.click(await screen.findByRole('button', { name: 'Account menu' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});
