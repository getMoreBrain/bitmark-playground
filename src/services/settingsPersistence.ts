import { subscribe } from 'valtio';

import { bitmarkState } from '../state/bitmarkState';
import { uiState } from '../state/uiState';
import type { PersistedSettings } from './settingsStorage';
import { CURRENT_VERSION, saveSettings } from './settingsStorage';

const DEBOUNCE_MS = 300;

function collectSettings(): PersistedSettings {
  return {
    v: CURRENT_VERSION,
    activeMarkupTab: bitmarkState.activeMarkupTab,
    activeJsonTab: bitmarkState.activeJsonTab,
    showBottomPanels: uiState.showBottomPanels,
    leftOutputTab: uiState.leftOutputTab,
    linkScroll: uiState.linkScroll,
    toggleTags: uiState.toggleTags,
    fullOutput: uiState.fullOutput,
    showLegacy: uiState.showLegacy,
  };
}

function initSettingsPersistence(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const scheduleSave = () => {
    if (timer != null) clearTimeout(timer);
    timer = setTimeout(() => {
      saveSettings(collectSettings());
      timer = null;
    }, DEBOUNCE_MS);
  };

  const unsub1 = subscribe(bitmarkState, scheduleSave);
  const unsub2 = subscribe(uiState, scheduleSave);

  // Return cleanup function
  return () => {
    unsub1();
    unsub2();
    if (timer != null) clearTimeout(timer);
  };
}

export { collectSettings, DEBOUNCE_MS, initSettingsPersistence };
