// @awa-test: PLAN-004-Step1 (settingsStorage utility)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CURRENT_VERSION,
  loadSettings,
  migrateSettings,
  PersistedSettings,
  saveSettings,
  STORAGE_KEY,
} from './settingsStorage';

const validSettings: PersistedSettings = {
  v: CURRENT_VERSION,
  activeMarkupTab: 'js',
  activeJsonTab: 'wasm',
  showDiffLex: true,
  leftOutputTab: 'diff',
  rightOutputTab: 'lexer',
};

describe('settingsStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('migrateSettings', () => {
    it('returns valid PersistedSettings for current version', () => {
      expect(migrateSettings(validSettings)).toEqual(validSettings);
    });

    it('returns null for null input', () => {
      expect(migrateSettings(null)).toBeNull();
    });

    it('returns null for non-object input', () => {
      expect(migrateSettings('string')).toBeNull();
      expect(migrateSettings(42)).toBeNull();
      expect(migrateSettings(true)).toBeNull();
    });

    it('returns null for missing version field', () => {
      const { v: _, ...noVersion } = validSettings;
      expect(migrateSettings(noVersion)).toBeNull();
    });

    it('returns null for unknown future version', () => {
      expect(migrateSettings({ ...validSettings, v: 999 })).toBeNull();
    });

    it('migrates v1 settings to current version', () => {
      const v1Settings = {
        v: 1,
        activeMarkupTab: 'js',
        activeJsonTab: 'wasm',
        showDiffLex: true,
        leftOutputTab: 'diff',
        rightOutputTab: 'lexer',
      };
      const result = migrateSettings(v1Settings);
      expect(result).toEqual({ ...v1Settings, v: CURRENT_VERSION });
    });

    // @awa-test: PLAN-006-Step7 (v2 → v3 migration preserves prior values)
    it('migrates v2 settings to current version', () => {
      const v2Settings = {
        v: 2,
        activeMarkupTab: 'js',
        activeJsonTab: 'wasmFull',
        showDiffLex: true,
        leftOutputTab: 'diff',
        rightOutputTab: 'lexer',
      };
      const result = migrateSettings(v2Settings);
      expect(result).toEqual({ ...v2Settings, v: CURRENT_VERSION });
    });

    it('accepts wasmFull as valid ParserType', () => {
      expect(migrateSettings({ ...validSettings, activeJsonTab: 'wasmFull' })).toEqual({
        ...validSettings,
        activeJsonTab: 'wasmFull',
      });
    });

    // @awa-test: PLAN-006-Step7 ('wasmCheck' accepted as activeJsonTab at v3)
    it('accepts wasmCheck as valid activeJsonTab', () => {
      expect(migrateSettings({ ...validSettings, activeJsonTab: 'wasmCheck' })).toEqual({
        ...validSettings,
        activeJsonTab: 'wasmCheck',
      });
    });

    // @awa-test: PLAN-006-Step7 ('wasmCheck' rejected as activeMarkupTab)
    it('rejects wasmCheck as activeMarkupTab', () => {
      expect(migrateSettings({ ...validSettings, activeMarkupTab: 'wasmCheck' })).toBeNull();
    });

    // @awa-test: PLAN-006-Step7 ('wasmCheck' rejected as OutputTab)
    it('rejects wasmCheck as leftOutputTab', () => {
      expect(migrateSettings({ ...validSettings, leftOutputTab: 'wasmCheck' })).toBeNull();
    });

    // @awa-test: PLAN-007-Step7 (v3 settings migrate to current version)
    it('migrates v3 settings to current version', () => {
      const v3Settings = {
        v: 3,
        activeMarkupTab: 'wasm',
        activeJsonTab: 'wasmCheck',
        showDiffLex: false,
        leftOutputTab: 'lexer',
        rightOutputTab: 'diff',
      };
      const result = migrateSettings(v3Settings);
      expect(result).toEqual({ ...v3Settings, v: CURRENT_VERSION });
    });

    // @awa-test: PLAN-007-Step7 ('tableHtml' accepted as activeJsonTab at v4)
    it('accepts tableHtml as valid activeJsonTab', () => {
      expect(migrateSettings({ ...validSettings, activeJsonTab: 'tableHtml' })).toEqual({
        ...validSettings,
        activeJsonTab: 'tableHtml',
      });
    });

    // @awa-test: PLAN-007-Step7 ('tableHtml' rejected as activeMarkupTab)
    it('rejects tableHtml as activeMarkupTab', () => {
      expect(migrateSettings({ ...validSettings, activeMarkupTab: 'tableHtml' })).toBeNull();
    });

    // @awa-test: PLAN-007-Step7 ('tableHtml' rejected as OutputTab)
    it('rejects tableHtml as leftOutputTab', () => {
      expect(migrateSettings({ ...validSettings, leftOutputTab: 'tableHtml' })).toBeNull();
    });

    // @awa-test: PLAN-011-Step7 (v4 settings migrate to current version)
    it('migrates v4 settings to current version', () => {
      const v4Settings = {
        v: 4,
        activeMarkupTab: 'wasm',
        activeJsonTab: 'tableHtml',
        showDiffLex: true,
        leftOutputTab: 'diff',
        rightOutputTab: 'lexer',
      };
      const result = migrateSettings(v4Settings);
      expect(result).toEqual({ ...v4Settings, v: CURRENT_VERSION });
    });

    // @awa-test: PLAN-011-Step7 ('text' accepted as activeJsonTab at v5)
    it('accepts text as valid activeJsonTab', () => {
      expect(migrateSettings({ ...validSettings, activeJsonTab: 'text' })).toEqual({
        ...validSettings,
        activeJsonTab: 'text',
      });
    });

    // @awa-test: PLAN-011-Step7 ('text' rejected as activeMarkupTab / OutputTab)
    it('rejects text as activeMarkupTab and leftOutputTab', () => {
      expect(migrateSettings({ ...validSettings, activeMarkupTab: 'text' })).toBeNull();
      expect(migrateSettings({ ...validSettings, leftOutputTab: 'text' })).toBeNull();
    });

    // @awa-test: PLAN-013-Step7 ('xmlNiso' accepted as activeJsonTab at v6)
    it('accepts xmlNiso as valid activeJsonTab', () => {
      expect(migrateSettings({ ...validSettings, activeJsonTab: 'xmlNiso' })).toEqual({
        ...validSettings,
        activeJsonTab: 'xmlNiso',
      });
    });

    // @awa-test: PLAN-013-Step7 ('xmlNiso' rejected as activeMarkupTab / OutputTab)
    it('rejects xmlNiso as activeMarkupTab and leftOutputTab', () => {
      expect(migrateSettings({ ...validSettings, activeMarkupTab: 'xmlNiso' })).toBeNull();
      expect(migrateSettings({ ...validSettings, leftOutputTab: 'xmlNiso' })).toBeNull();
    });

    // @awa-test: PLAN-013-Step7 (v5 settings migrate to current version)
    it('migrates v5 settings to current version', () => {
      const v5Settings = {
        v: 5,
        activeMarkupTab: 'wasm',
        activeJsonTab: 'text',
        showDiffLex: true,
        leftOutputTab: 'diff',
        rightOutputTab: 'lexer',
      };
      const result = migrateSettings(v5Settings);
      expect(result).toEqual({ ...v5Settings, v: CURRENT_VERSION });
    });

    // @awa-test: PLAN-013-Step7 ('xmlNisoEs' accepted as activeJsonTab at v7)
    it('accepts xmlNisoEs as valid activeJsonTab', () => {
      expect(migrateSettings({ ...validSettings, activeJsonTab: 'xmlNisoEs' })).toEqual({
        ...validSettings,
        activeJsonTab: 'xmlNisoEs',
      });
    });

    // @awa-test: PLAN-013-Step7 ('xmlNisoEs' rejected as activeMarkupTab / OutputTab)
    it('rejects xmlNisoEs as activeMarkupTab and leftOutputTab', () => {
      expect(migrateSettings({ ...validSettings, activeMarkupTab: 'xmlNisoEs' })).toBeNull();
      expect(migrateSettings({ ...validSettings, leftOutputTab: 'xmlNisoEs' })).toBeNull();
    });

    // @awa-test: PLAN-013-Step7 (v6 settings migrate to current version)
    it('migrates v6 settings to current version', () => {
      const v6Settings = {
        v: 6,
        activeMarkupTab: 'wasm',
        activeJsonTab: 'xmlNiso',
        showDiffLex: true,
        leftOutputTab: 'diff',
        rightOutputTab: 'lexer',
      };
      const result = migrateSettings(v6Settings);
      expect(result).toEqual({ ...v6Settings, v: CURRENT_VERSION });
    });

    // @awa-test: PLAN-014-Step5 ('mappings' accepted as an output tab at v8)
    it('accepts mappings as a valid output tab', () => {
      expect(migrateSettings({ ...validSettings, leftOutputTab: 'mappings' })).toEqual({
        ...validSettings,
        leftOutputTab: 'mappings',
      });
    });

    // @awa-test: PLAN-014-Step5 ('mappings' rejected as a parser/JSON tab)
    it('rejects mappings as activeMarkupTab and activeJsonTab', () => {
      expect(migrateSettings({ ...validSettings, activeMarkupTab: 'mappings' })).toBeNull();
      expect(migrateSettings({ ...validSettings, activeJsonTab: 'mappings' })).toBeNull();
    });

    // @awa-test: PLAN-014-Step5 (v7 settings migrate to current version)
    it('migrates v7 settings to current version', () => {
      const v7Settings = {
        v: 7,
        activeMarkupTab: 'wasm',
        activeJsonTab: 'xmlNisoEs',
        showDiffLex: true,
        leftOutputTab: 'diff',
        rightOutputTab: 'lexer',
      };
      expect(migrateSettings(v7Settings)).toEqual({ ...v7Settings, v: CURRENT_VERSION });
    });

    it('returns null for invalid activeMarkupTab', () => {
      expect(migrateSettings({ ...validSettings, activeMarkupTab: 'invalid' })).toBeNull();
    });

    it('returns null for invalid activeJsonTab', () => {
      expect(migrateSettings({ ...validSettings, activeJsonTab: 123 })).toBeNull();
    });

    it('returns null for invalid showDiffLex type', () => {
      expect(migrateSettings({ ...validSettings, showDiffLex: 'yes' })).toBeNull();
    });

    it('returns null for invalid leftOutputTab', () => {
      expect(migrateSettings({ ...validSettings, leftOutputTab: 'unknown' })).toBeNull();
    });

    it('returns null for invalid rightOutputTab', () => {
      expect(migrateSettings({ ...validSettings, rightOutputTab: 42 })).toBeNull();
    });
  });

  describe('loadSettings', () => {
    it('returns null when localStorage is empty', () => {
      expect(loadSettings()).toBeNull();
    });

    it('returns null for malformed JSON', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');
      expect(loadSettings()).toBeNull();
    });

    it('returns null for wrong version', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...validSettings, v: 999 }));
      expect(loadSettings()).toBeNull();
    });

    it('returns valid PersistedSettings on correct data', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validSettings));
      expect(loadSettings()).toEqual(validSettings);
    });

    it('handles SecurityError gracefully', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('Blocked', 'SecurityError');
      });
      expect(loadSettings()).toBeNull();
    });
  });

  describe('saveSettings', () => {
    it('writes expected JSON to localStorage', () => {
      saveSettings(validSettings);
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(validSettings);
    });

    it('handles QuotaExceededError gracefully', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      });
      // Should not throw
      expect(() => saveSettings(validSettings)).not.toThrow();
    });

    it('handles SecurityError gracefully', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Blocked', 'SecurityError');
      });
      expect(() => saveSettings(validSettings)).not.toThrow();
    });
  });
});
