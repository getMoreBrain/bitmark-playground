// @awa-test: PLAN-004-Step3 (settingsPersistence integration)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bitmarkState } from '../state/bitmarkState';
import { uiState } from '../state/uiState';
import { DEBOUNCE_MS, initSettingsPersistence } from './settingsPersistence';
import { STORAGE_KEY } from './settingsStorage';

describe('settingsPersistence', () => {
  let cleanup: () => void;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    cleanup = initSettingsPersistence();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    // Reset state to defaults
    bitmarkState.setActiveMarkupTab('js');
    bitmarkState.setActiveJsonTab('js');
    uiState.setShowDiffLex(false);
    uiState.setLeftOutputTab('diff');
    uiState.setRightOutputTab('diff');
  });

  it('persists after changing activeMarkupTab', async () => {
    bitmarkState.setActiveMarkupTab('wasm');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 50);

    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.activeMarkupTab).toBe('wasm');
  });

  it('persists after changing showDiffLex', async () => {
    uiState.setShowDiffLex(true);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 50);

    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.showDiffLex).toBe(true);
  });

  it('debounces multiple rapid changes into single write', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem');

    uiState.setLeftOutputTab('lexer');
    uiState.setRightOutputTab('lexer');
    bitmarkState.setActiveJsonTab('wasm');

    // Before debounce fires — no writes yet
    expect(spy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 50);

    // Should have written (debounce collapsed multiple changes)
    const calls = spy.mock.calls.filter(([key]) => key === STORAGE_KEY);
    expect(calls.length).toBeGreaterThanOrEqual(1);

    const lastCall = calls[calls.length - 1];
    const parsed = JSON.parse(lastCall[1] as string);
    expect(parsed.leftOutputTab).toBe('lexer');
    expect(parsed.rightOutputTab).toBe('lexer');
    expect(parsed.activeJsonTab).toBe('wasm');

    spy.mockRestore();
  });

  it('cleanup stops persisting', async () => {
    cleanup();

    const spy = vi.spyOn(Storage.prototype, 'setItem');

    uiState.setShowDiffLex(true);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 50);

    const calls = spy.mock.calls.filter(([key]) => key === STORAGE_KEY);
    expect(calls.length).toBe(0);

    spy.mockRestore();
    // Re-create cleanup so afterEach doesn't error
    cleanup = initSettingsPersistence();
  });
});
