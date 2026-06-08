// @awa-component: PLAN-002-BitmarkConverter
// @awa-component: PLAN-008-BitmarkConverter
import type { BitWrapperJson, ConvertOptions } from '@gmb/bitmark-parser-generator';
import { useCallback } from 'react';

import { bitmarkState, ParserType } from '../state/bitmarkState';
import { StringUtils } from '../utils/StringUtils';
import { useBitmarkParser } from './BitmarkParser';
import { useBitmarkParserGenerator } from './BitmarkParserGenerator';

const PARSERS: readonly ParserType[] = ['js', 'wasm', 'wasmFull'];

// Per-direction JS (bpg) options (constant per direction).
const JS_MARKUP_TO_JSON_OPTIONS: ConvertOptions = { jsonOptions: { enableWarnings: true } };
const JS_JSON_TO_MARKUP_OPTIONS: ConvertOptions = { bitmarkOptions: { prettifyJson: true } };

interface M2JResult {
  json?: BitWrapperJson[];
  error?: Error;
  durationSec: number;
}

interface J2MResult {
  markup?: string;
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
    lex: wasmLex,
    parse: wasmParse,
    convert: wasmConvert,
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
          if (!wasmParse) return null;
          const mode = parser === 'wasm' ? 'optimized' : 'full';
          json = JSON.parse(wasmParse(markup, { mode })) as BitWrapperJson[];
        }
      } catch (e) {
        error = e as Error;
      }

      performance.mark(endMark);
      const durationSec =
        performance.measure(`${parser}-markupToJson`, startMark, endMark).duration / 1000;
      return { json, error, durationSec };
    },
    [bitmarkParserGenerator, wasmParse],
  );

  // json -> markup for a single parser. Returns null when that parser is unavailable.
  const jsonToMarkupForParser = useCallback(
    async (parser: ParserType, json: string): Promise<J2MResult | null> => {
      const startMark = `${parser}-j2m-start-${Date.now()}`;
      const endMark = `${parser}-j2m-end-${Date.now()}`;
      performance.mark(startMark);

      let markup: string | undefined;
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
          markup = wasmConvert(json, { inputFormat: 'json', outputFormat: 'bitmark', mode });
        }
      } catch (e) {
        error = e as Error;
      }

      performance.mark(endMark);
      const durationSec =
        performance.measure(`${parser}-jsonToMarkup`, startMark, endMark).duration / 1000;
      return { markup, error, durationSec };
    },
    [bitmarkParserGenerator, wasmConvert],
  );

  // Lex the WASM optimized tab's markup into both lexer outputs (lex + lex-json).
  const lexWasmOptimized = useCallback(() => {
    if (!wasmLex) return;
    const markup = bitmarkState.wasm.markup;
    try {
      bitmarkState.setLexerOutput('wasm', wasmLex(markup));
    } catch (e) {
      bitmarkState.setLexerOutput('wasm', `Lexer error: ${String(e)}`);
    }
    try {
      bitmarkState.setLexerOutput('wasmFull', wasmLex(markup, { stage: 'lex-json' }));
    } catch (e) {
      bitmarkState.setLexerOutput('wasmFull', `Lexer error: ${String(e)}`);
    }
  }, [wasmLex]);

  // @awa-impl: PLAN-008-Step2 (markupToJson: forward calc + per-tab round-trip back-fill)
  const markupToJson = useCallback(
    async (editedTab: ParserType, markup: string) => {
      // Edited tab keeps the user input verbatim.
      bitmarkState.setEditedMarkup(editedTab, markup);

      // Forward: markup -> json for every parser, from the edited (source) markup.
      await Promise.allSettled(
        PARSERS.map(async (parser) => {
          const r = await markupToJsonForParser(parser, markup);
          if (!r) return;
          bitmarkState.setJson(parser, r.json, r.error, r.durationSec);
        }),
      );

      // Back: json -> markup for each non-edited tab, from its own freshly-computed
      // JSON, via its own parser. Keep last good value on failure.
      await Promise.allSettled(
        PARSERS.filter((p) => p !== editedTab).map(async (parser) => {
          const slice = bitmarkState[parser];
          if (slice.jsonError) return; // forward failed -> keep last good
          const r = await jsonToMarkupForParser(parser, slice.jsonAsString);
          if (!r || r.error || r.markup === undefined) return; // keep last good
          bitmarkState.setMarkup(parser, r.markup, undefined, r.durationSec);
        }),
      );

      lexWasmOptimized();
    },
    [markupToJsonForParser, jsonToMarkupForParser, lexWasmOptimized],
  );

  // @awa-impl: PLAN-008-Step2 (jsonToMarkup: forward calc + per-tab round-trip back-fill)
  const jsonToMarkup = useCallback(
    async (editedTab: ParserType, json: string) => {
      // Edited tab keeps the user input verbatim.
      bitmarkState.setEditedJson(editedTab, json);

      // Forward: json -> markup for every parser, from the edited (source) JSON.
      await Promise.allSettled(
        PARSERS.map(async (parser) => {
          const r = await jsonToMarkupForParser(parser, json);
          if (!r) return;
          // bpg may legitimately return a non-string ('Expected string'); keep last good.
          if (parser === 'js' && r.error && r.error.message === 'Expected string') return;
          bitmarkState.setMarkup(parser, r.markup, r.error, r.durationSec);
        }),
      );

      // Back: markup -> json for each non-edited tab, from its own freshly-computed
      // markup, via its own parser. Keep last good value on failure.
      await Promise.allSettled(
        PARSERS.filter((p) => p !== editedTab).map(async (parser) => {
          const slice = bitmarkState[parser];
          if (slice.markupError) return; // forward failed -> keep last good
          const r = await markupToJsonForParser(parser, slice.markup);
          if (!r || r.error || r.json === undefined) return; // keep last good
          bitmarkState.setJson(parser, r.json, undefined, r.durationSec);
        }),
      );

      lexWasmOptimized();
    },
    [jsonToMarkupForParser, markupToJsonForParser, lexWasmOptimized],
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
