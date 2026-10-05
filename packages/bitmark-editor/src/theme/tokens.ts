// @awa-component: PLAN-016-BitmarkTheme
// @awa-component: PLAN-021-Theme
import type { SemanticTokenModifier, SemanticTokenType } from '@gmb/bitmark-parser';

/** Monaco theme name used by every editor in the playground. */
export const MONACO_THEME = 'vs-dark';

export interface TokenStyle {
  color: string;
  fontWeight?: 'bold';
  fontStyle?: 'italic';
  textDecoration?: 'underline';
}

/** The colour roles a palette fills. */
type Role =
  | 'sigil' // brackets and tag syntax
  | 'bitType'
  | 'format'
  | 'value' // tag values, resource types, sources
  | 'key' // property keys, language names
  | 'text'
  | 'emphasis'
  | 'light'
  | 'highlight'
  | 'mark' // mark sigils (`**`, `__`, …)
  | 'divider' // paragraph breaks, attr sigils, urls
  // One hue per divider kind so card structure can be read at a glance.
  | 'cardDivider' // `====`
  | 'sideDivider' // `--`
  | 'variantDivider' // `++`
  | 'footerDivider' // `==== footer ====`
  | 'textDivider' // `==== text ====`
  | 'comment';

export type Palette = Record<Role, string>;

/** Dark: carried over from the previous tree-sitter theme so the look stays familiar. */
export const DARK_PALETTE: Palette = {
  sigil: '#ffd700',
  bitType: '#44cc44',
  format: '#8959a8',
  value: '#ce9178',
  key: '#9cdcfe',
  text: '#d0d0d0',
  emphasis: '#ffffff',
  light: '#a0a0a0',
  highlight: '#f5d76e',
  mark: '#ff5555',
  divider: '#3e999f',
  cardDivider: '#3e999f',
  sideDivider: '#d670d6',
  variantDivider: '#569cd6',
  footerDivider: '#6a9955',
  textDivider: '#dcdcaa',
  comment: '#8e908c',
};

/** Light: the same roles, darkened for contrast on white (PLAN-020 D11). */
export const LIGHT_PALETTE: Palette = {
  sigil: '#9a6700',
  bitType: '#116329',
  format: '#8250df',
  value: '#a3401a',
  key: '#0550ae',
  text: '#24292f',
  emphasis: '#000000',
  light: '#6e7781',
  highlight: '#7d5a00',
  mark: '#cf222e',
  divider: '#1b7c83',
  cardDivider: '#1b7c83',
  sideDivider: '#a626a4',
  variantDivider: '#0969da',
  footerDivider: '#4b7a2a',
  textDivider: '#7d6608',
  comment: '#6e7781',
};

interface RoleStyle extends Omit<TokenStyle, 'color'> {
  role: Role;
}

/**
 * Style per parser token type. Typed against the parser's `SemanticTokenType`
 * so a legend change in the parser fails the build here rather than silently
 * un-colouring tokens.
 */
const TYPE_ROLES: Record<SemanticTokenType, RoleStyle> = {
  frontmatter: { role: 'comment', fontStyle: 'italic' },
  bitSigil: { role: 'sigil' },
  bitType: { role: 'bitType', fontWeight: 'bold' },
  bitFormat: { role: 'format' },
  bitResourceType: { role: 'value' },
  tagSigil: { role: 'sigil' },
  propertyKey: { role: 'key' },
  resourceType: { role: 'value' },
  tagText: { role: 'value' },
  cardDivider: { role: 'cardDivider', fontWeight: 'bold' },
  sideDivider: { role: 'sideDivider', fontWeight: 'bold' },
  variantDivider: { role: 'variantDivider', fontWeight: 'bold' },
  footerDivider: { role: 'footerDivider', fontWeight: 'bold' },
  textDivider: { role: 'textDivider', fontWeight: 'bold' },
  paragraphBreak: { role: 'divider' },
  headingSigil: { role: 'sigil' },
  heading: { role: 'emphasis', fontWeight: 'bold' },
  listMarker: { role: 'sigil' },
  codeSigil: { role: 'sigil' },
  codeLanguage: { role: 'key' },
  codeBody: { role: 'text' },
  imageSigil: { role: 'sigil' },
  imageSrc: { role: 'value' },
  markSigil: { role: 'mark' },
  bold: { role: 'emphasis', fontWeight: 'bold' },
  italic: { role: 'emphasis', fontStyle: 'italic' },
  highlight: { role: 'highlight' },
  light: { role: 'light' },
  inline: { role: 'emphasis' },
  attrSigil: { role: 'divider' },
  attrKey: { role: 'key' },
  attrValue: { role: 'value' },
  url: { role: 'divider', textDecoration: 'underline' },
  text: { role: 'text' },
  plainText: { role: 'text' },
};

/**
 * The style modifiers an inline mark's chain sets on its text (parser
 * PLAN-203 D3: `==x==\|bold\|` renders as `**x**` does). Named here until the
 * published parser types carry them.
 */
type StyleModifier = 'bold' | 'italic' | 'highlight' | 'light';

/** Modifiers that change a token's look (the tag-class modifiers do not). */
const MODIFIER_ROLES = {
  comment: { role: 'comment', fontStyle: 'italic' },
  unclosed: { role: 'mark', textDecoration: 'underline' },
  bold: { role: 'emphasis', fontWeight: 'bold' },
  italic: { role: 'emphasis', fontStyle: 'italic' },
  highlight: { role: 'highlight' },
  light: { role: 'light' },
} as const satisfies Partial<Record<SemanticTokenModifier | StyleModifier, RoleStyle>>;

const resolve = <K extends string>(
  roles: Record<K, RoleStyle>,
  palette: Palette,
): Record<K, TokenStyle> => {
  const out = {} as Record<K, TokenStyle>;
  for (const key of Object.keys(roles) as K[]) {
    const { role, ...rest } = roles[key];
    out[key] = { color: palette[role], ...rest };
  }
  return out;
};

/** The dark token styles (the defaults). */
export const TOKEN_STYLES: Record<SemanticTokenType, TokenStyle> = resolve(
  TYPE_ROLES,
  DARK_PALETTE,
);
export const LIGHT_TOKEN_STYLES: Record<SemanticTokenType, TokenStyle> = resolve(
  TYPE_ROLES,
  LIGHT_PALETTE,
);
export const STYLED_MODIFIERS = resolve(
  MODIFIER_ROLES as Record<keyof typeof MODIFIER_ROLES, RoleStyle>,
  DARK_PALETTE,
);
const LIGHT_MODIFIERS = resolve(
  MODIFIER_ROLES as Record<keyof typeof MODIFIER_ROLES, RoleStyle>,
  LIGHT_PALETTE,
);

/** A token type or a styled modifier — what a custom theme can restyle. */
export type TokenKey = SemanticTokenType | keyof typeof MODIFIER_ROLES;

const TYPE_CLASS_PREFIX = 'bm-tok-';
const MODIFIER_CLASS_PREFIX = 'bm-mod-';

/** The theme classes a pane carries; their variables pick the palette. */
export const THEME_CLASS = { dark: 'bm-theme-dark', light: 'bm-theme-light' } as const;

/** CSS class list (Monaco `inlineClassName`) for a token of `type` with `modifiers`. */
export const tokenClassName = (type: string, modifiers: readonly string[]): string => {
  let className = TYPE_CLASS_PREFIX + type;
  for (const modifier of modifiers) {
    if (modifier in MODIFIER_ROLES) className += ` ${MODIFIER_CLASS_PREFIX}${modifier}`;
  }
  return className;
};

/** The CSS custom property for one property of a token type or modifier. */
export const tokenVar = (
  key: TokenKey,
  prop: 'color' | 'weight' | 'style' | 'decoration',
): string => `--bm-${key in MODIFIER_ROLES ? 'mod' : 'tok'}-${key}-${prop}`;

/**
 * One rule's declarations. Every property the style sets goes through its
 * variable, with the dark value as the fallback, so the look needs no theme
 * class and a host can restyle with plain CSS. A property the style does
 * not set is left out, so a modifier never resets what its type set.
 */
const declarations = (key: TokenKey, style: TokenStyle): string => {
  let css = `color:var(${tokenVar(key, 'color')},${style.color});`;
  if (style.fontWeight) css += `font-weight:var(${tokenVar(key, 'weight')},${style.fontWeight});`;
  if (style.fontStyle) css += `font-style:var(${tokenVar(key, 'style')},${style.fontStyle});`;
  if (style.textDecoration) {
    css += `text-decoration:var(${tokenVar(key, 'decoration')},${style.textDecoration});`;
  }
  return css;
};

/** A palette's variables (colours only; weights and styles are the same in both). */
const paletteVars = (
  types: Record<SemanticTokenType, TokenStyle>,
  modifiers: Record<string, TokenStyle>,
): string =>
  [...Object.entries(types), ...Object.entries(modifiers)]
    .map(([key, style]) => `${tokenVar(key as TokenKey, 'color')}:${style.color};`)
    .join('');

/**
 * Build the stylesheet for the token classes and the two theme classes.
 * Modifier rules come last so a commented-out or unclosed token overrides
 * its type's colour.
 */
export const buildBitmarkHighlightCss = (): string => {
  const rules: string[] = [
    `.${THEME_CLASS.dark}{${paletteVars(TOKEN_STYLES, STYLED_MODIFIERS)}}`,
    `.${THEME_CLASS.light}{${paletteVars(LIGHT_TOKEN_STYLES, LIGHT_MODIFIERS)}}`,
  ];
  for (const [type, style] of Object.entries(TOKEN_STYLES)) {
    rules.push(
      `.monaco-editor .${TYPE_CLASS_PREFIX}${type}{${declarations(type as TokenKey, style)}}`,
    );
  }
  for (const [modifier, style] of Object.entries(STYLED_MODIFIERS)) {
    rules.push(
      `.monaco-editor .${MODIFIER_CLASS_PREFIX}${modifier}{${declarations(modifier as TokenKey, style)}}`,
    );
  }
  return rules.join('\n');
};
