// @awa-component: PLAN-004-SettingsStorage
import { log } from '../logging/log';
import type { JsonTabType, ParserType } from '../state/bitmarkState';
import type { OutputTab } from '../state/uiState';

export interface PersistedSettings {
  /** Schema version — bump on breaking changes */
  v: number;
  activeMarkupTab: ParserType;
  activeJsonTab: JsonTabType;
  showDiffLex: boolean;
  leftOutputTab: OutputTab;
  rightOutputTab: OutputTab;
}

export const STORAGE_KEY = 'bitmark-playground-settings';
export const CURRENT_VERSION = 8;

const VALID_PARSER_TYPES: readonly string[] = ['js', 'wasm', 'wasmFull'];
const VALID_JSON_TABS: readonly string[] = [
  'js',
  'wasm',
  'wasmFull',
  'wasmCheck',
  'tableHtml',
  'text',
  'xmlNiso',
  'xmlNisoEs',
];
const VALID_OUTPUT_TABS: readonly string[] = ['diff', 'lexer', 'mappings'];

// @awa-impl: PLAN-004-Step1 (migrateSettings)
// @awa-impl: PLAN-006-Step7 (v2 → v3 migration)
// @awa-impl: PLAN-007-Step7 (v3 → v4 migration)
// @awa-impl: PLAN-011-Step7 (v4 → v5 migration)
// @awa-impl: PLAN-013-Step7 (v5 → v6 migration)
// @awa-impl: PLAN-014-Step5 (v7 → v8 migration)
function migrateSettings(raw: unknown): PersistedSettings | null {
  if (raw == null || typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;
  if (typeof obj.v !== 'number') return null;

  // Migrate v1 → v2: 'wasmFull' added as valid ParserType, existing values still valid
  if (obj.v === 1) {
    obj.v = 2;
    // Fall through
  }

  // Migrate v2 → v3: 'wasmCheck' added as valid JSON tab, existing values still valid
  if (obj.v === 2) {
    obj.v = 3;
    // Fall through
  }

  // Migrate v3 → v4: 'tableHtml' added as valid JSON tab, existing values still valid
  if (obj.v === 3) {
    obj.v = 4;
    // Fall through
  }

  // Migrate v4 → v5: 'text' added as valid JSON tab, existing values still valid
  if (obj.v === 4) {
    obj.v = 5;
    // Fall through
  }

  // Migrate v5 → v6: 'xmlNiso' added as valid JSON tab, existing values still valid
  if (obj.v === 5) {
    obj.v = 6;
    // Fall through
  }

  // Migrate v6 → v7: 'xmlNisoEs' added as valid JSON tab, existing values still valid
  if (obj.v === 6) {
    obj.v = 7;
    // Fall through
  }

  // Migrate v7 → v8: 'mappings' added as valid output tab, existing values still valid
  if (obj.v === 7) {
    obj.v = CURRENT_VERSION;
    // Fall through to v8 validation
  }

  if (obj.v === CURRENT_VERSION) {
    // Validate shape
    if (
      typeof obj.activeMarkupTab === 'string' &&
      VALID_PARSER_TYPES.includes(obj.activeMarkupTab) &&
      typeof obj.activeJsonTab === 'string' &&
      VALID_JSON_TABS.includes(obj.activeJsonTab) &&
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
