// @awa-component: PLAN-004-SettingsStorage
import { log } from '../logging/log';
import type { ParserType } from '../state/bitmarkState';
import type { OutputTab } from '../state/uiState';

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
export const CURRENT_VERSION = 2;

const VALID_PARSER_TYPES: readonly string[] = ['js', 'wasm', 'wasmFull'];
const VALID_OUTPUT_TABS: readonly string[] = ['diff', 'lexer'];

// @awa-impl: PLAN-004-Step1 (migrateSettings)
function migrateSettings(raw: unknown): PersistedSettings | null {
  if (raw == null || typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;
  if (typeof obj.v !== 'number') return null;

  // Migrate v1 → v2: 'wasmFull' added as valid ParserType, existing values still valid
  if (obj.v === 1) {
    obj.v = CURRENT_VERSION;
    // Fall through to v2 validation
  }

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

  // Unknown or future version — discard
  return null;
}

// @awa-impl: PLAN-004-Step1 (loadSettings)
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

// @awa-impl: PLAN-004-Step1 (saveSettings)
function saveSettings(settings: PersistedSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    // QuotaExceededError, SecurityError, etc.
    log.warn('Failed to persist settings to localStorage', e);
  }
}

export { loadSettings, migrateSettings, saveSettings };
