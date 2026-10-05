// @awa-component: PLAN-016-BitmarkTheme
import type { SemanticTokenModifier, SemanticTokenType } from '@gmb/bitmark-parser';

/** Monaco theme name used by every editor in the playground. */
export const MONACO_THEME = 'vs-dark';

interface TokenStyle {
  color: string;
  fontWeight?: 'bold';
  fontStyle?: 'italic';
  textDecoration?: 'underline';
}

// Palette carried over from the previous tree-sitter theme so the look stays familiar.
const SIGIL = '#ffd700'; // brackets and tag syntax
const BIT_TYPE = '#44cc44';
const FORMAT = '#8959a8';
const VALUE = '#ce9178'; // tag values, resource types, sources
const KEY = '#9cdcfe'; // property keys, language names
const TEXT = '#d0d0d0';
const EMPHASIS = '#ffffff';
const LIGHT = '#a0a0a0';
const HIGHLIGHT = '#f5d76e';
const MARK = '#ff5555'; // mark sigils (`**`, `__`, …)
const DIVIDER = '#3e999f'; // paragraph breaks, attr sigils, urls
// One hue per divider kind so card structure can be read at a glance.
const CARD_DIVIDER = '#3e999f'; // `====`  teal
const SIDE_DIVIDER = '#d670d6'; // `--`    magenta
const VARIANT_DIVIDER = '#569cd6'; // `++`    blue
const FOOTER_DIVIDER = '#6a9955'; // `==== footer ====`  olive
const TEXT_DIVIDER = '#dcdcaa'; // `==== text ====`    khaki
const COMMENT = '#8e908c';

/**
 * Style per parser token type. Typed against the parser's `SemanticTokenType`
 * so a legend change in the parser fails the build here rather than silently
 * un-colouring tokens.
 */
export const TOKEN_STYLES: Record<SemanticTokenType, TokenStyle> = {
  frontmatter: { color: COMMENT, fontStyle: 'italic' },
  bitSigil: { color: SIGIL },
  bitType: { color: BIT_TYPE, fontWeight: 'bold' },
  bitFormat: { color: FORMAT },
  bitResourceType: { color: VALUE },
  tagSigil: { color: SIGIL },
  propertyKey: { color: KEY },
  resourceType: { color: VALUE },
  tagText: { color: VALUE },
  cardDivider: { color: CARD_DIVIDER, fontWeight: 'bold' },
  sideDivider: { color: SIDE_DIVIDER, fontWeight: 'bold' },
  variantDivider: { color: VARIANT_DIVIDER, fontWeight: 'bold' },
  footerDivider: { color: FOOTER_DIVIDER, fontWeight: 'bold' },
  textDivider: { color: TEXT_DIVIDER, fontWeight: 'bold' },
  paragraphBreak: { color: DIVIDER },
  headingSigil: { color: SIGIL },
  heading: { color: EMPHASIS, fontWeight: 'bold' },
  listMarker: { color: SIGIL },
  codeSigil: { color: SIGIL },
  codeLanguage: { color: KEY },
  codeBody: { color: TEXT },
  imageSigil: { color: SIGIL },
  imageSrc: { color: VALUE },
  markSigil: { color: MARK },
  bold: { color: EMPHASIS, fontWeight: 'bold' },
  italic: { color: EMPHASIS, fontStyle: 'italic' },
  highlight: { color: HIGHLIGHT },
  light: { color: LIGHT },
  inline: { color: EMPHASIS },
  attrSigil: { color: DIVIDER },
  attrKey: { color: KEY },
  attrValue: { color: VALUE },
  url: { color: DIVIDER, textDecoration: 'underline' },
  text: { color: TEXT },
  plainText: { color: TEXT },
};

/**
 * The style modifiers an inline mark's chain sets on its text (parser
 * PLAN-203 D3: `==x==\|bold\|` renders as `**x**` does). Named here until the
 * published parser types carry them.
 */
type StyleModifier = 'bold' | 'italic' | 'highlight' | 'light';

/** Modifiers that change a token's look (the tag-class modifiers do not). */
export const STYLED_MODIFIERS = {
  comment: { color: COMMENT, fontStyle: 'italic' },
  unclosed: { color: MARK, textDecoration: 'underline' },
  bold: { color: EMPHASIS, fontWeight: 'bold' },
  italic: { color: EMPHASIS, fontStyle: 'italic' },
  highlight: { color: HIGHLIGHT },
  light: { color: LIGHT },
} as const satisfies Partial<Record<SemanticTokenModifier | StyleModifier, TokenStyle>>;

const TYPE_CLASS_PREFIX = 'bm-tok-';
const MODIFIER_CLASS_PREFIX = 'bm-mod-';

/** CSS class list (Monaco `inlineClassName`) for a token of `type` with `modifiers`. */
export const tokenClassName = (type: string, modifiers: readonly string[]): string => {
  let className = TYPE_CLASS_PREFIX + type;
  for (const modifier of modifiers) {
    if (modifier in STYLED_MODIFIERS) className += ` ${MODIFIER_CLASS_PREFIX}${modifier}`;
  }
  return className;
};

const declarations = (style: TokenStyle): string => {
  let css = `color:${style.color};`;
  if (style.fontWeight) css += `font-weight:${style.fontWeight};`;
  if (style.fontStyle) css += `font-style:${style.fontStyle};`;
  if (style.textDecoration) css += `text-decoration:${style.textDecoration};`;
  return css;
};

/**
 * Build the stylesheet for the token classes. Modifier rules come last so a
 * commented-out or unclosed token overrides its type's colour.
 */
export const buildBitmarkHighlightCss = (): string => {
  const rules: string[] = [];
  for (const [type, style] of Object.entries(TOKEN_STYLES)) {
    rules.push(`.monaco-editor .${TYPE_CLASS_PREFIX}${type}{${declarations(style)}}`);
  }
  for (const [modifier, style] of Object.entries(STYLED_MODIFIERS)) {
    rules.push(`.monaco-editor .${MODIFIER_CLASS_PREFIX}${modifier}{${declarations(style)}}`);
  }
  return rules.join('\n');
};
