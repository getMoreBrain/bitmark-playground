// @awa-component: PLAN-023-Theme
import type { Monaco } from '../monaco/types';
import { THEME_CLASS, TokenKey, TokenStyle, tokenVar } from './tokens';

export type ThemeBase = 'dark' | 'light';

/** A theme built on `dark`, `light` or `auto`, with token overrides (PLAN-022 D11). */
export interface CustomTheme {
  base: ThemeBase | 'auto';
  /** A Monaco theme the host registered with `defineTheme`. Default: `vs-dark` / `vs`. */
  monacoTheme?: string;
  /** Per token type or modifier: the properties to change. */
  tokens?: Partial<Record<TokenKey, Partial<TokenStyle>>>;
}

export type BitmarkTheme = ThemeBase | 'auto' | CustomTheme;

export interface ApplyThemeOptions {
  /** The Monaco to set the theme on, when `applyMonacoTheme` is true. */
  monaco?: Monaco;
  /**
   * Call `monaco.editor.setTheme`. Monaco's theme is global per instance, so
   * the package does this only when it owns Monaco (`/bundled`) or the host
   * asks; an injected Monaco keeps the host's theme (D11).
   */
  applyMonacoTheme?: boolean;
  /** For tests: the media query source. */
  matchMedia?: (query: string) => MediaQueryList;
}

export interface AppliedTheme {
  setTheme(theme: BitmarkTheme): void;
  /** The base in effect now (`auto` resolved). */
  readonly base: ThemeBase;
  dispose(): void;
}

const PROPS: { key: keyof TokenStyle; name: 'color' | 'weight' | 'style' | 'decoration' }[] = [
  { key: 'color', name: 'color' },
  { key: 'fontWeight', name: 'weight' },
  { key: 'fontStyle', name: 'style' },
  { key: 'textDecoration', name: 'decoration' },
];

/**
 * Theme `element` (a pane, or any ancestor of its editor): the theme class
 * picks the palette's variables, a custom theme's overrides go on the
 * element itself, and `auto` follows `prefers-color-scheme` live.
 */
// @awa-impl: PLAN-023-Step5a (dark, light, auto and custom themes)
export const applyBitmarkTheme = (
  element: HTMLElement,
  theme: BitmarkTheme,
  options: ApplyThemeOptions = {},
): AppliedTheme => {
  const media = (options.matchMedia ?? globalThis.matchMedia?.bind(globalThis))?.(
    '(prefers-color-scheme: dark)',
  );
  let current = theme;
  let base: ThemeBase = 'dark';
  let inlineVars: string[] = [];

  const apply = () => {
    const custom = typeof current === 'object' ? current : undefined;
    const name = custom ? custom.base : (current as ThemeBase | 'auto');
    base = name === 'auto' ? (media?.matches === false ? 'light' : 'dark') : name;

    element.classList.remove(THEME_CLASS.dark, THEME_CLASS.light);
    element.classList.add(THEME_CLASS[base]);

    for (const v of inlineVars) element.style.removeProperty(v);
    inlineVars = [];
    for (const [key, style] of Object.entries(custom?.tokens ?? {}) as [
      TokenKey,
      Partial<TokenStyle>,
    ][]) {
      for (const { key: prop, name: varName } of PROPS) {
        const value = style[prop];
        if (value === undefined) continue;
        const v = tokenVar(key, varName);
        element.style.setProperty(v, value);
        inlineVars.push(v);
      }
    }

    if (options.applyMonacoTheme && options.monaco) {
      options.monaco.editor.setTheme(custom?.monacoTheme ?? (base === 'dark' ? 'vs-dark' : 'vs'));
    }
  };

  const onMedia = () => {
    const name = typeof current === 'object' ? current.base : current;
    if (name === 'auto') apply();
  };
  media?.addEventListener?.('change', onMedia);
  apply();

  return {
    setTheme: (next) => {
      current = next;
      apply();
    },
    get base() {
      return base;
    },
    dispose: () => {
      media?.removeEventListener?.('change', onMedia);
      element.classList.remove(THEME_CLASS.dark, THEME_CLASS.light);
      for (const v of inlineVars) element.style.removeProperty(v);
      inlineVars = [];
    },
  };
};
