import './monaco-setup';
import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './App';
import { initSettingsPersistence } from './services/settingsPersistence';

// Suppress harmless Monaco diff editor errors caused by React StrictMode
// double mount/unmount in development. These do not occur in production.
const origConsoleError = console.error;
const suppressedPatterns = ['Canceled', 'no diff result available'];
console.error = (...args: unknown[]) => {
  const msg = String(args[0]);
  if (suppressedPatterns.some((p) => msg.includes(p))) return;
  origConsoleError.apply(console, args);
};

function start(): void {
  initSettingsPersistence();

  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

start();
