import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { LandingPage } from './LandingPage';

describe('LandingPage', () => {
  it('invites signed-out visitors to sign up or sign in', () => {
    renderWithProviders(<LandingPage isSignedIn={false} appPath="/login" />);
    expect(screen.getByRole('heading', { level: 1, name: /Every tonne has a/ })).toBeInTheDocument();
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(within(header).getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/signup');
    expect(screen.getAllByRole('link', { name: 'Start with your work email' })[0]).toHaveAttribute('href', '/signup');
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

  it('explains the flow in order', () => {
    renderWithProviders(<LandingPage isSignedIn={false} appPath="/login" />);
    const flow = screen.getByRole('list', { name: 'How Carbon Glint works' });
    expect(within(flow).getAllByRole('listitem')).toHaveLength(5);
  });

  it('only links to sections that exist on the page', () => {
    renderWithProviders(<LandingPage isSignedIn={false} appPath="/login" />);
    const nav = screen.getByRole('navigation', { name: 'Page sections' });
    within(nav)
      .getAllByRole('link')
      .forEach((l) => {
        const id = l.getAttribute('href')?.slice(1) ?? '';
        expect(document.getElementById(id), `#${id}`).not.toBeNull();
      });
  });

  it('answers the FAQ', () => {
    renderWithProviders(<LandingPage isSignedIn={false} appPath="/login" />);
    expect(screen.getByRole('button', { name: 'Does the AI make up the numbers?' })).toBeInTheDocument();
  });
});
