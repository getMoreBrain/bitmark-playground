import type { LexToken } from '@gmb/bitmark-parser';
import type { BitWrapperJson, ConvertOptions } from '@gmb/bitmark-parser-generator';
import debounce from 'lodash/debounce';
import { useCallback } from 'react';

import { convertWithBitStarts } from '../scrollSync/convertWithBitStarts';
import { bitmarkState, ParserType } from '../state/bitmarkState';
import { StringUtils } from '../utils/StringUtils';
import { throwIfParserError, useBitmarkParser } from './BitmarkParser';
import { useBitmarkParserGenerator } from './BitmarkParserGenerator';

const WASM_PARSERS: readonly ParserType[] = ['wasm', 'wasmFull'];
const OLD_PARSERS: readonly ParserType[] = ['js'];

/** How long the old (bpg) parser waits for a pause in editing (PLAN-019 D2). */
export const OLD_PARSER_DEBOUNCE_MS = 250;

// Module level: every editor's converter shares it, so an edit in one tab
// supersedes a pending one from another.
const scheduleOldParser = debounce(
  (job: () => Promise<void>): Promise<void> => job(),
  OLD_PARSER_DEBOUNCE_MS,
);

/** Run the pending old-parser conversion now. For tests. */
export const flushOldParser = (): Promise<void> => scheduleOldParser.flush() ?? Promise.resolve();

// Per-direction JS (bpg) options (constant per direction).
// Exported so other bpg consumers (e.g. JsRoundTripRunner) convert identically.
export const JS_MARKUP_TO_JSON_OPTIONS: ConvertOptions = { jsonOptions: { enableWarnings: true } };
export const JS_JSON_TO_MARKUP_OPTIONS: ConvertOptions = { bitmarkOptions: { prettifyJson: true } };

// WASM lexer (7.x): the former `lex()` export is now the `lex` output format of
// `convert`, which returns the token stream as a JSON array of `LexToken`.
const WASM_LEX_OPTIONS = { inputFormat: 'bitmark', outputFormat: 'lex', pretty: true } as const;

/** Render lexer tokens one per line, mirroring the pre-7 `lex()` text dump. */
const formatLexTokens = (tokens: LexToken[]): string =>
  tokens
    .map(
      (t) =>
        `${t.kind} Span { start: ${t.span.start}, end: ${t.span.end} } ${JSON.stringify(t.text)}`,
    )
    .join('\n');

interface M2JResult {
  json?: BitWrapperJson[];
  error?: Error;
  durationSec: number;
}

interface J2MResult {
  markup?: string;
  /** Where each bit starts in the JSON (PLAN-020); WASM parsers only. */
  inputStarts?: number[];
  error?: Error;
  durationSec: number;
}

export interface BitmarkConverter {
  jsLoadSuccess: boolean;
  jsLoadError: boolean;
  wasmLoadSuccess: boolean;
  wasmLoadError: boolean;
  markupToJson: (editedTab: ParserType, markup: string) => Promise<void>;
  jsonToMarkup: (editedTab: ParserType, json: string) => Promise<void>;
}

const useBitmarkConverter = (): BitmarkConverter => {
  const {
    bitmarkParserGenerator,
    loadSuccess: jsLoadSuccess,
    loadError: jsLoadError,
  } = useBitmarkParserGenerator();
  const {
    bitmarkToObjects: wasmBitmarkToObjects,
    convert: wasmConvert,
    convertWithDetails: wasmConvertWithDetails,
    loadSuccess: wasmLoadSuccess,
    loadError: wasmLoadError,
  } = useBitmarkParser();

  // markup -> json for a single parser. Returns null when that parser is unavailable.
  const markupToJsonForParser = useCallback(
    async (parser: ParserType, markup: string): Promise<M2JResult | null> => {
      const startMark = `${parser}-m2j-start-${Date.now()}`;
      const endMark = `${parser}-m2j-end-${Date.now()}`;
      performance.mark(startMark);

      let json: BitWrapperJson[] | undefined;
      let error: Error | undefined;
      try {
        if (parser === 'js') {
          if (!bitmarkParserGenerator) return null;
          json = (await bitmarkParserGenerator.convert(markup, JS_MARKUP_TO_JSON_OPTIONS)) as
            | BitWrapperJson[]
            | undefined;
        } else {
          if (!wasmBitmarkToObjects) return null;
          const mode = parser === 'wasm' ? 'optimized' : 'full';
          // Typed API: returns entries as objects and throws on failure.
          json = wasmBitmarkToObjects(markup, { mode }) as unknown as BitWrapperJson[];
        }
      } catch (e) {
        error = e as Error;
      }

      performance.mark(endMark);
      const durationSec =
        performance.measure(`${parser}-markupToJson`, startMark, endMark).duration / 1000;
      return { json, error, durationSec };
    },
    [bitmarkParserGenerator, wasmBitmarkToObjects],
  );

  // json -> markup for a single parser. Returns null when that parser is unavailable.
  const jsonToMarkupForParser = useCallback(
    async (parser: ParserType, json: string): Promise<J2MResult | null> => {
      const startMark = `${parser}-j2m-start-${Date.now()}`;
      const endMark = `${parser}-j2m-end-${Date.now()}`;
      performance.mark(startMark);

      let markup: string | undefined;
      let inputStarts: number[] | undefined;
      let error: Error | undefined;
      try {
        if (parser === 'js') {
          if (!bitmarkParserGenerator) return null;
          const out = await bitmarkParserGenerator.convert(json, JS_JSON_TO_MARKUP_OPTIONS);
          if (!StringUtils.isString(out)) throw new Error('Expected string');
          markup = out as string;
        } else {
          if (!wasmConvert) return null;
          const mode = parser === 'wasm' ? 'optimized' : 'full';
          // Only the optimized run's positions are used (below).
          ({ output: markup, inputStarts } = convertWithBitStarts(
            wasmConvert,
            parser === 'wasm' ? wasmConvertWithDetails : undefined,
            json,
            { inputFormat: 'json', outputFormat: 'bitmark', mode },
          ));
        }
      } catch (e) {
        error = e as Error;
      }

      performance.mark(endMark);
      const durationSec =
        performance.measure(`${parser}-jsonToMarkup`, startMark, endMark).duration / 1000;
      return { markup, inputStarts, error, durationSec };
    },
    [bitmarkParserGenerator, wasmConvert, wasmConvertWithDetails],
  );

  // Lex the WASM optimized tab's markup into both lexer outputs:
  // bitmark side = one token per line, JSON side = the token JSON.
  const lexWasmOptimized = useCallback(() => {
    if (!wasmConvert) return;
    const markup = bitmarkState.wasm.markup;
    try {
      const tokensJson = throwIfParserError(wasmConvert(markup, WASM_LEX_OPTIONS));
      const tokens = JSON.parse(tokensJson) as LexToken[];
      bitmarkState.setLexerOutput('wasm', formatLexTokens(tokens));
      bitmarkState.setLexerOutput('wasmFull', tokensJson);
    } catch (e) {
      const message = `Lexer error: ${String(e)}`;
      bitmarkState.setLexerOutput('wasm', message);
      bitmarkState.setLexerOutput('wasmFull', message);
    }
  }, [wasmConvert]);

  const markupToJsonFor = useCallback(
    async (parsers: readonly ParserType[], editedTab: ParserType, markup: string) => {
      // Forward: markup -> json for every parser, from the edited (source) markup.
      await Promise.allSettled(
        parsers.map(async (parser) => {
          const r = await markupToJsonForParser(parser, markup);
          if (!r) return;
          bitmarkState.setJson(parser, r.json, r.error, r.durationSec);
        }),
      );

      // Back: json -> markup for each non-edited tab, from its own freshly-computed
      // JSON, via its own parser. Keep last good value on failure.
      await Promise.allSettled(
        parsers
          .filter((p) => p !== editedTab)
          .map(async (parser) => {
            const slice = bitmarkState[parser];
            if (slice.jsonError) return; // forward failed -> keep last good
            const r = await jsonToMarkupForParser(parser, slice.jsonAsString);
            if (!r || r.error || r.markup === undefined) return; // keep last good
            bitmarkState.setMarkup(parser, r.markup, undefined, r.durationSec);
          }),
      );
    },
    [markupToJsonForParser, jsonToMarkupForParser],
  );

  const markupToJson = useCallback(
    async (editedTab: ParserType, markup: string) => {
      // Edited tab keeps the user input verbatim.
      bitmarkState.setEditedMarkup(editedTab, markup);
      await markupToJsonFor(WASM_PARSERS, editedTab, markup);
      lexWasmOptimized();
      void scheduleOldParser(() => markupToJsonFor(OLD_PARSERS, editedTab, markup));
    },
    [markupToJsonFor, lexWasmOptimized],
  );

  const jsonToMarkupFor = useCallback(
    async (parsers: readonly ParserType[], editedTab: ParserType, json: string) => {
      // Forward: json -> markup for every parser, from the edited (source) JSON.
      await Promise.allSettled(
        parsers.map(async (parser) => {
          const r = await jsonToMarkupForParser(parser, json);
          if (!r) return;
          // bpg may legitimately return a non-string ('Expected string'); keep last good.
          if (parser === 'js' && r.error && r.error.message === 'Expected string') return;
          bitmarkState.setMarkup(parser, r.markup, r.error, r.durationSec);
          // Where the bits are depends on the JSON only, not on the parser that
          // converts it, so the WASM optimized run places them for whichever
          // tab was edited — the Original (bpg) run reports no positions.
          if (parser === 'wasm' && r.inputStarts) {
            bitmarkState.setEditedJsonBitStarts(editedTab, json, r.inputStarts);
          }
        }),
      );

      // Back: markup -> json for each non-edited tab, from its own freshly-computed
      // markup, via its own parser. Keep last good value on failure.
      await Promise.allSettled(
        parsers
          .filter((p) => p !== editedTab)
          .map(async (parser) => {
            const slice = bitmarkState[parser];
            if (slice.markupError) return; // forward failed -> keep last good
            const r = await markupToJsonForParser(parser, slice.markup);
            if (!r || r.error || r.json === undefined) return; // keep last good
            bitmarkState.setJson(parser, r.json, undefined, r.durationSec);
          }),
      );
    },
    [jsonToMarkupForParser, markupToJsonForParser],
  );

  const jsonToMarkup = useCallback(
    async (editedTab: ParserType, json: string) => {
      // Edited tab keeps the user input verbatim.
      bitmarkState.setEditedJson(editedTab, json);
      await jsonToMarkupFor(WASM_PARSERS, editedTab, json);
      lexWasmOptimized();
      void scheduleOldParser(() => jsonToMarkupFor(OLD_PARSERS, editedTab, json));
    },
    [jsonToMarkupFor, lexWasmOptimized],
  );

  return {
    jsLoadSuccess,
    jsLoadError,
    wasmLoadSuccess,
    wasmLoadError,
    markupToJson,
    jsonToMarkup,
  };
};

export { useBitmarkConverter };
