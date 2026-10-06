// @awa-component: PLAN-023-MonacoServices
import type { SemanticToken } from '@gmb/bitmark-parser';
import type * as MonacoApi from 'monaco-editor';

import type { BitmarkEngine } from '../engine/types';
import { log } from '../log';
import { tokenClassName } from '../theme/tokens';
import { attachModelJob } from './modelJob';
import type { CodeEditor, IDisposable, Monaco } from './types';

/**
 * Delay between the last edit and re-highlighting. Monaco's own semantic
 * tokens feature waits at least 300 ms per request, which is why the parser
 * tokens are applied directly as decorations instead.
 */
export const HIGHLIGHT_DEBOUNCE_MS = 15;

/** The parser's absolute-layout tokens (0-based, UTF-16) as Monaco decorations. */
export const buildBitmarkDecorations = (
  monaco: Monaco,
  tokens: readonly SemanticToken[],
): MonacoApi.editor.IModelDeltaDecoration[] =>
  tokens.map((t) => ({
    range: new monaco.Range(t.line + 1, t.start + 1, t.line + 1, t.start + t.length + 1),
    options: { inlineClassName: tokenClassName(t.type, t.modifiers) },
  }));

/**
 * Highlight a bitmark editor from the parser's semantic tokens: after each
 * change (debounced) the whole document is tokenised and the tokens applied
 * as inline decorations. A result for an older text is dropped.
 */
// @awa-impl: PLAN-023-Step2 (per-editor highlighter on the injected Monaco, async)
export const attachBitmarkHighlighter = (
  monaco: Monaco,
  editor: CodeEditor,
  engine: () => BitmarkEngine | undefined,
  debounceMs: number = HIGHLIGHT_DEBOUNCE_MS,
): IDisposable & { refresh(): void } => {
  const decorations = editor.createDecorationsCollection();
  const job = attachModelJob({
    editor,
    debounceMs,
    compute: (text) => engine()?.semanticTokens(text),
    apply: (_model, result) => {
      if (result.layout !== 'absolute') return;
      decorations.set(buildBitmarkDecorations(monaco, result.tokens));
    },
    clear: () => decorations.clear(),
    onError: (e) => {
      log.error('bitmark semantic tokens failed', e);
      decorations.clear();
    },
  });
  return {
    refresh: job.run,
    dispose: () => {
      job.dispose();
      decorations.clear();
    },
  };
};
