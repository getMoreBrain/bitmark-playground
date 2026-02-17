// @zen-test: PLAN-004-Step1 (settingsStorage utility)
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
