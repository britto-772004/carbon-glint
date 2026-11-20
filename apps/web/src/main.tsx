import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/livvic/400.css';
import '@fontsource/livvic/500.css';
import '@fontsource/livvic/600.css';
import '@fontsource/livvic/700.css';
import { initSdk } from './lib/sdk';
import { queryClient } from './lib/queryClient';
import { AppProviders } from './providers/AppProviders';
import { App } from './App';

initSdk();

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing');

createRoot(root).render(
  <StrictMode>
    <AppProviders queryClient={queryClient}>
      <App />
    </AppProviders>
  </StrictMode>,
);
