import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Suppress expected console.error noise from providers that fail to load
// external resources (CDN modules, WASM) in the jsdom test environment.
const originalError = console.error;
vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
  const msg = String(args[0]);
  // Filter out known harmless provider load failures in jsdom
  if (msg.includes('failed to load') || msg.includes('failed to fetch version')) {
    return;
  }
  originalError(...args);
});
