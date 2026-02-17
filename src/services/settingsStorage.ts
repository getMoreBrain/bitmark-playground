// @zen-component: PLAN-004-SettingsStorage
import type { OutputTab } from '../state/uiState';
import type { ParserType } from '../state/bitmarkState';

import { log } from '../logging/log';

export interface PersistedSettings {
  /** Schema version — bump on breaking changes */
  v: number;
  activeMarkupTab: ParserType;
  activeJsonTab: ParserType;
  showDiffLex: boolean;
  leftOutputTab: OutputTab;
  rightOutputTab: OutputTab;
}

export const STORAGE_KEY = 'bitmark-playground-settings';
export const CURRENT_VERSION = 1;

const VALID_PARSER_TYPES: readonly string[] = ['js', 'wasm'];
const VALID_OUTPUT_TABS: readonly string[] = ['diff', 'lexer'];

// @zen-impl: PLAN-004-Step1 (migrateSettings)
function migrateSettings(raw: unknown): PersistedSettings | null {
  if (raw == null || typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;
  if (typeof obj.v !== 'number') return null;

  if (obj.v === CURRENT_VERSION) {
    // Validate shape
    if (
      typeof obj.activeMarkupTab === 'string' &&
      VALID_PARSER_TYPES.includes(obj.activeMarkupTab) &&
      typeof obj.activeJsonTab === 'string' &&
      VALID_PARSER_TYPES.includes(obj.activeJsonTab) &&
      typeof obj.showDiffLex === 'boolean' &&
      typeof obj.leftOutputTab === 'string' &&
      VALID_OUTPUT_TABS.includes(obj.leftOutputTab) &&
      typeof obj.rightOutputTab === 'string' &&
      VALID_OUTPUT_TABS.includes(obj.rightOutputTab)
    ) {
      return obj as unknown as PersistedSettings;
    }
    return null;
  }

  // Future: if (obj.v < CURRENT_VERSION) apply migrations
  // Unknown or future version — discard
  return null;
}

// @zen-impl: PLAN-004-Step1 (loadSettings)
function loadSettings(): PersistedSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return null;
    const parsed: unknown = JSON.parse(raw);
    return migrateSettings(parsed);
  } catch {
    // SecurityError (private browsing), SyntaxError (malformed JSON), etc.
    return null;
  }
}

// @zen-impl: PLAN-004-Step1 (saveSettings)
function saveSettings(settings: PersistedSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    // QuotaExceededError, SecurityError, etc.
    log.warn('Failed to persist settings to localStorage', e);
  }
}

export { loadSettings, saveSettings, migrateSettings };
