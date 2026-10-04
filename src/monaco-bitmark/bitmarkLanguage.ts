// @awa-component: PLAN-016-BitmarkLanguage
import type { SemanticToken, semanticTokens as semanticTokensFn } from '@gmb/bitmark-parser';
import debounce from 'lodash/debounce';
import * as monaco from 'monaco-editor';

import { log } from '../logging/log';
import { buildBitmarkHighlightCss, MONACO_THEME, tokenClassName } from './bitmarkTheme';

export { MONACO_THEME };

/** Monaco language id for bitmark markup. */
export const BITMARK_LANGUAGE_ID = 'bitmark';

/**
 * Delay between the last edit and re-highlighting. Monaco's own semantic
 * tokens feature waits at least 300 ms per request, which is why the parser
 * tokens are applied directly as decorations instead.
 */
export const HIGHLIGHT_DEBOUNCE_MS = 15;

/** The parser's `semanticTokens` function (or a compatible fake). */
export type SemanticTokensSource = typeof semanticTokensFn;

const SEMANTIC_TOKENS_OPTIONS = { tokensLayout: 'absolute', positionEncoding: 'utf-16' } as const;

let languageRegistered = false;

/**
 * The language's bracket pairs — the same declaration as the VS Code
 * extension's `language-configuration.json` (PLAN-021 D4): typing `[`
 * auto-closes to `[]`, and a selection can be surrounded. Monaco only
 * auto-closes what the language declares, so without this `[.` left the
 * author to type the `]`; with it, a bit-type template snippet must also
 * replace that `]` (`replacedSuffixLength`).
 */
export const BITMARK_LANGUAGE_CONFIGURATION: monaco.languages.LanguageConfiguration = {
  brackets: [['[', ']']],
  autoClosingPairs: [{ open: '[', close: ']' }],
  surroundingPairs: [{ open: '[', close: ']' }],
};

/** Register the bitmark language and inject the token stylesheet (idempotent). */
export const registerBitmarkLanguage = (): void => {
  if (languageRegistered) return;
  languageRegistered = true;
  monaco.languages.register({ id: BITMARK_LANGUAGE_ID });
  monaco.languages.setLanguageConfiguration(BITMARK_LANGUAGE_ID, BITMARK_LANGUAGE_CONFIGURATION);

  const style = document.createElement('style');
  style.setAttribute('data-bitmark-highlight', '');
  style.textContent = buildBitmarkHighlightCss();
  document.head.appendChild(style);
};

/** Convert the parser's absolute-layout tokens (0-based, UTF-16) to Monaco decorations. */
export const buildBitmarkDecorations = (
  tokens: readonly SemanticToken[],
): monaco.editor.IModelDeltaDecoration[] =>
  tokens.map((t) => ({
    range: new monaco.Range(t.line + 1, t.start + 1, t.line + 1, t.start + t.length + 1),
    options: { inlineClassName: tokenClassName(t.type, t.modifiers) },
  }));

let source: SemanticTokensSource | undefined;
const attachedHighlighters = new Set<() => void>();

/**
 * Install (or, with `undefined`, remove) the parser function that highlights
 * bitmark editors. Every attached editor re-highlights immediately.
 */
export const setBitmarkSemanticTokensSource = (next: SemanticTokensSource | undefined): void => {
  source = next;
  for (const highlight of attachedHighlighters) highlight();
};

/**
 * Highlight a bitmark editor from the parser's semantic tokens: on every
 * content change (debounced) the whole document is tokenized and the tokens
 * applied as inline decorations. Dispose to detach and clear.
 */
export const attachBitmarkHighlighter = (
  editor: monaco.editor.ICodeEditor,
  debounceMs: number = HIGHLIGHT_DEBOUNCE_MS,
): monaco.IDisposable => {
  const decorations = editor.createDecorationsCollection();

  const highlight = () => {
    const model = editor.getModel();
    if (!model || !source) {
      decorations.clear();
      return;
    }
    try {
      const result = source(model.getValue(), SEMANTIC_TOKENS_OPTIONS);
      if (result.layout !== 'absolute') return;
      decorations.set(buildBitmarkDecorations(result.tokens));
    } catch (e) {
      log.error('bitmark semantic tokens failed', e);
      decorations.clear();
    }
  };
  const highlightDebounced = debounce(highlight, debounceMs);

  const listeners = [
    editor.onDidChangeModelContent(() => highlightDebounced()),
    editor.onDidChangeModel(() => highlightDebounced()),
  ];
  attachedHighlighters.add(highlight);
  highlight();

  return {
    dispose: () => {
      highlightDebounced.cancel();
      attachedHighlighters.delete(highlight);
      for (const listener of listeners) listener.dispose();
      decorations.clear();
    },
  };
};
