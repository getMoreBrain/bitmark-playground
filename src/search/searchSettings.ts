import { log } from '../logging/log';
import type { SearchOptions } from './findAll';

/** The search options that persist (PLAN-024 D11); never the term. */
export interface SearchSettings extends SearchOptions {
  readonly includeHidden: boolean;
}

export const SEARCH_STORAGE_KEY = 'bitmark-playground-search';

export const DEFAULT_SEARCH_SETTINGS: SearchSettings = {
  matchCase: false,
  wholeWord: false,
  regex: false,
  includeHidden: false,
};

const KEYS = Object.keys(DEFAULT_SEARCH_SETTINGS) as (keyof SearchSettings)[];

function loadSearchSettings(): SearchSettings {
  try {
    const raw = localStorage.getItem(SEARCH_STORAGE_KEY);
    if (raw == null) return DEFAULT_SEARCH_SETTINGS;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed == null || typeof parsed !== 'object') return DEFAULT_SEARCH_SETTINGS;
    const settings = { ...DEFAULT_SEARCH_SETTINGS };
    for (const key of KEYS) {
      if (typeof parsed[key] === 'boolean') settings[key] = parsed[key];
    }
    return settings;
  } catch {
    return DEFAULT_SEARCH_SETTINGS;
  }
}

function saveSearchSettings(settings: SearchSettings): void {
  try {
    const stored = Object.fromEntries(KEYS.map((key) => [key, settings[key]]));
    localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(stored));
  } catch (e) {
    log.warn('Failed to persist search settings to localStorage', e);
  }
}

export { loadSearchSettings, saveSearchSettings };
