import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { ChatMessage, ChatResponse, Conversation } from '@carbon-glint/sdk';
import { apiUrl } from '../../test/constants';
import { buildMe } from '../../test/fixtures';
import { apiError } from '../../test/mocks/handlers';
import { server } from '../../test/mocks/server';
import { signIn } from '../../test/mocks/session';
import { renderApp } from '../../test/render';

const CONV = 'cv000000-0000-4000-8000-000000000001';
const answer: ChatMessage = {
  id: 'm2000000-0000-4000-8000-000000000002',
  role: 'assistant',
  content: 'Your total is **16 tCO2e**.',
  chart: {
    type: 'bar',
    title: 'By scope',
    unit: 'tCO2e',
    categories: ['Scope 1', 'Scope 2'],
    series: [{ name: 'Emissions', data: [3.1, 12] }],
  },
  sources: ['Emissions summary'],
  createdAt: '2026-11-20T10:00:01.000Z',
};

describe('AI assistant', () => {
  it('asks a starter question and renders a grounded answer with chart, data table, sources and follow-ups', async () => {
    signIn(buildMe());
    let body: unknown;
    let stored: ChatMessage[] = [];
    server.use(
      http.get(apiUrl('/assistant/conversations'), () =>
        HttpResponse.json<Conversation[]>(
          stored.length ? [{ id: CONV, title: 'Totals', updatedAt: answer.createdAt }] : [],
        ),
      ),
      http.post(apiUrl('/assistant/chat'), async ({ request }) => {
        body = await request.json();
        stored = [
          {
            id: 'm1000000-0000-4000-8000-000000000001',
            role: 'user',
            content: 'What are our total emissions by scope?',
            chart: null,
            sources: [],
            createdAt: '2026-11-20T10:00:00.000Z',
          },
          answer,
        ];
        return HttpResponse.json<ChatResponse>({
          conversationId: CONV,
          message: answer,
          suggestions: ['Which BU emits most?'],
        });
      }),
      http.get(apiUrl('/assistant/conversations/:id/messages'), () => HttpResponse.json<ChatMessage[]>(stored)),
    );
    const { user } = renderApp('/app/assistant');
    await user.click(await screen.findByText('What are our total emissions by scope?'));

    expect(await screen.findByText('16 tCO2e')).toBeInTheDocument();
    expect(body).toEqual({ message: 'What are our total emissions by scope?' });
    expect(screen.getByTestId('echarts')).toBeInTheDocument();
    expect(screen.getByText('Emissions summary')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View data' }));
    const table = screen.getByRole('table', { name: 'By scope' });
    expect(within(table).getByText('12')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CSV' })).toHaveAttribute('href', expect.stringContaining('data:text/csv'));
    expect(screen.getByText('Which BU emits most?')).toBeInTheDocument();
    expect(await within(screen.getByRole('list', { name: 'Conversations' })).findByText('Totals')).toBeInTheDocument();
  });

  it('shows a clear message when AI is not configured', async () => {
    signIn(buildMe());
    server.use(
      http.get(apiUrl('/assistant/conversations'), () => HttpResponse.json([])),
      http.post(apiUrl('/assistant/chat'), () =>
        apiError(422, { code: 'AI_NOT_CONFIGURED', message: 'The assistant needs a Gemini API key (GEMINI_API_KEY).' }),
      ),
    );
    const { user } = renderApp('/app/assistant');
    await user.type(await screen.findByRole('textbox', { name: 'Message' }), 'hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText(/needs a Gemini API key/)).toBeInTheDocument();
  });

  it('offers the floating launcher on other app pages', async () => {
    signIn(buildMe());
    const { user } = renderApp('/app/settings');
    await user.click(await screen.findByRole('button', { name: 'Ask AI assistant' }));
    await waitFor(() => expect(screen.getByText("Ask about your company's emissions")).toBeInTheDocument());
  });
});
