import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Polyfill ResizeObserver for jsdom (used by MonacoEditorAutoResize / MonacoDiffEditorAutoResize)
// Fires callback immediately on observe() with realistic dimensions so components render.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    private cb: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb;
    }
    observe(target: Element) {
      // Simulate a resize entry with non-zero dimensions
      Object.defineProperty(target, 'clientWidth', { value: 600, configurable: true });
      Object.defineProperty(target, 'clientHeight', { value: 200, configurable: true });
      this.cb([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
}

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
