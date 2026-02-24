// @zen-component: PLAN-004-SettingsPersistence
import { subscribe } from 'valtio';

import { bitmarkState } from '../state/bitmarkState';
import { uiState } from '../state/uiState';

import { CURRENT_VERSION, saveSettings } from './settingsStorage';
import type { PersistedSettings } from './settingsStorage';

const DEBOUNCE_MS = 300;

// @zen-impl: PLAN-004-Step3 (persist on change)
function collectSettings(): PersistedSettings {
  return {
    v: CURRENT_VERSION,
    activeMarkupTab: bitmarkState.activeMarkupTab,
    activeJsonTab: bitmarkState.activeJsonTab,
    showDiffLex: uiState.showDiffLex,
    leftOutputTab: uiState.leftOutputTab,
    rightOutputTab: uiState.rightOutputTab,
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

export { initSettingsPersistence, collectSettings, DEBOUNCE_MS };
