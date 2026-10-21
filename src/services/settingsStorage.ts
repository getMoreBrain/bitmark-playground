import { log } from '../logging/log';
import type { JsonTabType, MarkupTabType } from '../state/bitmarkState';
import type { OutputTab } from '../state/uiState';

export interface PersistedSettings {
  /** Schema version — bump on breaking changes */
  v: number;
  activeMarkupTab: MarkupTabType;
  activeJsonTab: JsonTabType;
  showBottomPanels: boolean;
  leftOutputTab: OutputTab;
  linkScroll: boolean;
  toggleTags: boolean;
  fullOutput: boolean;
  showLegacy: boolean;
}

export const STORAGE_KEY = 'bitmark-playground-settings';
export const CURRENT_VERSION = 12;

const VALID_MARKUP_TABS: readonly string[] = ['bitmark', 'legacy'];
// Not 'xmlNisoEs': that tab is disabled (PLAN-026 D5).
const VALID_JSON_TABS: readonly string[] = ['json', 'tableHtml', 'xmlNiso', 'text', 'legacy'];
const VALID_OUTPUT_TABS: readonly string[] = ['info', 'mappings', 'lexer'];

/**
 * v11 → v12 (PLAN-026 D11): the parser tabs become Bitmark / JSON (the WASM
 * mode is a setting), WASM Check, Diff and the bottom-right panel's tab go,
 * the legacy parser is off.
 */
function migrateV11(obj: Record<string, unknown>): void {
  obj.fullOutput = obj.activeMarkupTab === 'wasmFull';
  obj.activeMarkupTab = 'bitmark';
  if (['js', 'wasm', 'wasmFull', 'wasmCheck', 'xmlNisoEs'].includes(obj.activeJsonTab as string)) {
    obj.activeJsonTab = 'json';
  }
  obj.showLegacy = false;
  obj.showBottomPanels = obj.showDiffLex;
  delete obj.showDiffLex;
  if (obj.leftOutputTab === 'diff') obj.leftOutputTab = 'info';
  delete obj.rightOutputTab;
}

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
    obj.v = 8;
    // Fall through
  }

  // Migrate v8 → v9: 'info' added as valid output tab, existing values still valid
  if (obj.v === 8) {
    obj.v = 9;
    // Fall through
  }

  // Migrate v9 → v10: 'linkScroll' added, on by default
  if (obj.v === 9) {
    obj.v = 10;
    obj.linkScroll = true;
    // Fall through
  }

  // Migrate v10 → v11: 'toggleTags' added, off by default
  if (obj.v === 10) {
    obj.v = 11;
    obj.toggleTags = false;
    // Fall through
  }

  // Migrate v11 → v12: the tab rework (PLAN-026)
  if (obj.v === 11) {
    obj.v = CURRENT_VERSION;
    migrateV11(obj);
    // Fall through to v12 validation
  }

  if (obj.v === CURRENT_VERSION) {
    // Validate shape
    if (
      typeof obj.activeMarkupTab === 'string' &&
      VALID_MARKUP_TABS.includes(obj.activeMarkupTab) &&
      typeof obj.activeJsonTab === 'string' &&
      VALID_JSON_TABS.includes(obj.activeJsonTab) &&
      typeof obj.showBottomPanels === 'boolean' &&
      typeof obj.leftOutputTab === 'string' &&
      VALID_OUTPUT_TABS.includes(obj.leftOutputTab) &&
      typeof obj.linkScroll === 'boolean' &&
      typeof obj.toggleTags === 'boolean' &&
      typeof obj.fullOutput === 'boolean' &&
      typeof obj.showLegacy === 'boolean'
    ) {
      // A Legacy tab is only shown with the legacy parser (PLAN-026 D12).
      if (!obj.showLegacy) {
        if (obj.activeMarkupTab === 'legacy') obj.activeMarkupTab = 'bitmark';
        if (obj.activeJsonTab === 'legacy') obj.activeJsonTab = 'json';
      }
      return obj as unknown as PersistedSettings;
    }
    return null;
  }

  // Unknown or future version — discard
  return null;
}

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

function saveSettings(settings: PersistedSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    // QuotaExceededError, SecurityError, etc.
    log.warn('Failed to persist settings to localStorage', e);
  }
}

export { loadSettings, migrateSettings, saveSettings };
