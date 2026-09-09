// @awa-component: PLAN-017-BitmarkHover
import * as monaco from 'monaco-editor';

import { log } from '../logging/log';
import { BitmarkHover, HoverSource } from './bitmarkEditorTypes';
import { BITMARK_LANGUAGE_ID } from './bitmarkLanguage';

/** The parser's hover as Monaco's: LSP positions are 0-based, Monaco's 1-based. */
export const toMonacoHover = (hover: BitmarkHover): monaco.languages.Hover => ({
  range: {
    startLineNumber: hover.range.start.line + 1,
    startColumn: hover.range.start.character + 1,
    endLineNumber: hover.range.end.line + 1,
    endColumn: hover.range.end.character + 1,
  },
  contents: [{ value: hover.contents.value, isTrusted: false }],
});

let source: HoverSource | undefined;

/** Install (or, with `undefined`, remove) the parser's `hover`. */
export const setBitmarkHoverSource = (next: HoverSource | undefined): void => {
  source = next;
};

let registered: monaco.IDisposable | undefined;

/**
 * Register the bitmark hover provider (idempotent). The parser describes the
 * construct under the cursor — a bit type, a tag as resolved in its scope, a
 * value, a resource type, an inline attribute — as Markdown, and returns
 * nothing on body text.
 */
export const registerBitmarkHover = (): void => {
  if (registered) return;
  registered = monaco.languages.registerHoverProvider(BITMARK_LANGUAGE_ID, {
    provideHover: (model, position) => {
      if (!source) return null;
      try {
        const hover = source(model.getValue(), {
          line: position.lineNumber - 1,
          character: position.column - 1,
        });
        return hover ? toMonacoHover(hover) : null;
      } catch (e) {
        log.error('bitmark hover failed', e);
        return null;
      }
    },
  });
};
