// @awa-test: PLAN-016-Step1 (stylesheet covers every parser token type and the styled modifiers)
import { describe, expect, it } from 'vitest';

import { buildBitmarkHighlightCss, TOKEN_STYLES, tokenClassName } from './tokens';

describe('tokenClassName', () => {
  it('uses the type class alone when no modifier changes the look', () => {
    expect(tokenClassName('tagText', ['property'])).toBe('bm-tok-tagText');
  });

  it('appends comment / unclosed modifier classes', () => {
    expect(tokenClassName('text', ['comment'])).toBe('bm-tok-text bm-mod-comment');
    expect(tokenClassName('tagSigil', ['gap', 'unclosed'])).toBe('bm-tok-tagSigil bm-mod-unclosed');
  });
});

describe('TOKEN_STYLES', () => {
  it('gives each divider kind its own colour', () => {
    const dividers = [
      'cardDivider',
      'sideDivider',
      'variantDivider',
      'footerDivider',
      'textDivider',
    ] as const;
    const colours = new Set(dividers.map((d) => TOKEN_STYLES[d].color));
    expect(colours.size).toBe(dividers.length);
  });
});

describe('buildBitmarkHighlightCss', () => {
  const css = buildBitmarkHighlightCss();

  it('has a rule for every token type', () => {
    for (const type of Object.keys(TOKEN_STYLES)) {
      expect(css).toContain(`.bm-tok-${type}{`);
    }
  });

  it('puts modifier rules after type rules so they win at equal specificity', () => {
    expect(css.indexOf('.bm-mod-comment{')).toBeGreaterThan(css.lastIndexOf('.bm-tok-'));
    expect(css).toContain(
      '.bm-mod-unclosed{color:var(--bm-mod-unclosed-color,#ff5555);text-decoration:var(--bm-mod-unclosed-decoration,underline);}',
    );
  });
});
