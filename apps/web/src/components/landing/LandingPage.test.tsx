import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { LandingPage } from './LandingPage';

describe('LandingPage', () => {
  it('invites signed-out visitors to sign up or sign in', () => {
    renderWithProviders(<LandingPage isSignedIn={false} appPath="/login" />);
    expect(screen.getByRole('heading', { level: 1, name: /auditors will trust/ })).toBeInTheDocument();
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(within(header).getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('link', { name: 'Start with your work email' })).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('link', { name: 'I already have an account' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open workspace' })).not.toBeInTheDocument();
  });

  it('sends signed-in users straight to their workspace', () => {
    renderWithProviders(<LandingPage isSignedIn appPath="/app/dashboard" />);
    const links = screen.getAllByRole('link', { name: 'Open workspace' });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((l) => expect(l).toHaveAttribute('href', '/app/dashboard'));
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'I already have an account' })).not.toBeInTheDocument();
  });

  it('has section navigation and the marketing sections', () => {
    renderWithProviders(<LandingPage isSignedIn={false} appPath="/login" />);
    const nav = screen.getByRole('navigation', { name: 'Page sections' });
    expect(within(nav).getByRole('link', { name: 'Features' })).toHaveAttribute('href', '#features');
    expect(within(nav).getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '#faq');
    expect(
      screen.getByRole('heading', { name: 'Everything you need to measure and report emissions' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'From spreadsheet to report in four steps' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Which emissions does Carbon Glint cover?' })).toBeInTheDocument();
  });
});
