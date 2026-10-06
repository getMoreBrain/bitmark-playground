import { describe, expect, it, vi } from 'vitest';

import { createFakeMonaco } from '../testing/fakeMonaco';
import { applyBitmarkTheme } from './applyTheme';
import {
  buildBitmarkHighlightCss,
  LIGHT_TOKEN_STYLES,
  STYLED_MODIFIERS,
  TOKEN_STYLES,
  tokenVar,
} from './tokens';

/** A media query whose `matches` the test flips. */
const fakeMedia = (dark: boolean) => {
  const listeners = new Set<() => void>();
  const mq = {
    matches: dark,
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  };
  return {
    matchMedia: () => mq as unknown as MediaQueryList,
    set: (next: boolean) => {
      mq.matches = next;
      for (const l of listeners) l();
    },
    listeners,
  };
};

describe('the theme stylesheet (PLAN-020 D11)', () => {
  const css = buildBitmarkHighlightCss();

  // @awa-test: PLAN-021-Step5a (every token type and modifier, both palettes)
  it('has variables for every token type and modifier in both theme classes', () => {
    const light = css.match(/\.bm-theme-light\{([^}]*)\}/)![1]!;
    const dark = css.match(/\.bm-theme-dark\{([^}]*)\}/)![1]!;
    for (const key of [...Object.keys(TOKEN_STYLES), ...Object.keys(STYLED_MODIFIERS)]) {
      const hostVar = tokenVar(key as never, 'color');
      const themeVar = hostVar.replace('--bm-', '--bm-theme-');
      expect(light).toContain(`${themeVar}:`);
      expect(dark).toContain(`${themeVar}:`);
      // The theme classes never set the host's variable, so a host's wins (D12).
      expect(light).not.toContain(`${hostVar}:`);
      expect(dark).not.toContain(`${hostVar}:`);
    }
  });

  // @awa-test: PLAN-021-Step5a (dark is the fallback: no theme class needed)
  it('falls back to the dark palette when no theme class applies', () => {
    expect(css).toContain(
      `.monaco-editor .bm-tok-bitType{color:var(--bm-tok-bitType-color,var(--bm-theme-tok-bitType-color,${TOKEN_STYLES.bitType.color}));`,
    );
  });

  it('gives the light palette different colours from the dark one', () => {
    expect(LIGHT_TOKEN_STYLES.bitType.color).not.toBe(TOKEN_STYLES.bitType.color);
    expect(LIGHT_TOKEN_STYLES.bitType.fontWeight).toBe(TOKEN_STYLES.bitType.fontWeight);
  });
});

describe('applyBitmarkTheme (PLAN-020 D11)', () => {
  // @awa-test: PLAN-021-Step5a (dark and light classes)
  it('puts the theme class on the element, and switches it', () => {
    const el = document.createElement('div');
    const theme = applyBitmarkTheme(el, 'light');
    expect(el.classList.contains('bm-theme-light')).toBe(true);
    theme.setTheme('dark');
    expect(el.classList.contains('bm-theme-dark')).toBe(true);
    expect(el.classList.contains('bm-theme-light')).toBe(false);
    theme.dispose();
    expect(el.className).toBe('');
  });

  // @awa-test: PLAN-021-Step5a (auto follows prefers-color-scheme live)
  it('follows prefers-color-scheme with auto, live', () => {
    const el = document.createElement('div');
    const media = fakeMedia(true);
    const theme = applyBitmarkTheme(el, 'auto', { matchMedia: media.matchMedia });
    expect(theme.base).toBe('dark');
    media.set(false);
    expect(theme.base).toBe('light');
    expect(el.classList.contains('bm-theme-light')).toBe(true);
    theme.dispose();
    expect(media.listeners.size).toBe(0);
  });

  // @awa-test: PLAN-021-Step5a (an injected Monaco's theme is not touched unless asked)
  it('sets the Monaco theme only with applyMonacoTheme', () => {
    const fake = createFakeMonaco();
    applyBitmarkTheme(document.createElement('div'), 'light', { monaco: fake.monaco });
    expect(fake.setTheme).not.toHaveBeenCalled();
    applyBitmarkTheme(document.createElement('div'), 'light', {
      monaco: fake.monaco,
      applyMonacoTheme: true,
    });
    expect(fake.setTheme).toHaveBeenLastCalledWith('vs');
    applyBitmarkTheme(
      document.createElement('div'),
      { base: 'dark', monacoTheme: 'site-dark' },
      { monaco: fake.monaco, applyMonacoTheme: true },
    );
    expect(fake.setTheme).toHaveBeenLastCalledWith('site-dark');
  });

  // @awa-test: PLAN-021-Step5a (a custom token override wins)
  it('puts a custom theme’s token overrides on the element, and removes them on change', () => {
    const el = document.createElement('div');
    const theme = applyBitmarkTheme(el, {
      base: 'light',
      tokens: {
        bitType: { color: 'rgb(1, 2, 3)', fontWeight: 'bold' },
        comment: { color: 'gray' },
      },
    });
    expect(el.style.getPropertyValue('--bm-tok-bitType-color')).toBe('rgb(1, 2, 3)');
    expect(el.style.getPropertyValue('--bm-tok-bitType-weight')).toBe('bold');
    expect(el.style.getPropertyValue('--bm-mod-comment-color')).toBe('gray');
    theme.setTheme('light');
    expect(el.style.getPropertyValue('--bm-tok-bitType-color')).toBe('');
  });

  it('works where matchMedia is missing (auto resolves dark)', () => {
    const theme = applyBitmarkTheme(document.createElement('div'), 'auto', {
      matchMedia: vi.fn(() => undefined) as never,
    });
    expect(theme.base).toBe('dark');
  });
});
