import { createLatestRunner, JsonText, jsonWithBitStarts } from '@gmb/bitmark-editor';
import type { BitWrapperJson, ConvertOptions } from '@gmb/bitmark-parser-generator';
import debounce from 'lodash/debounce';
import { useCallback, useEffect } from 'react';

import { bitmarkState, ParserType } from '../state/bitmarkState';
import { uiState } from '../state/uiState';
import { StringUtils } from '../utils/StringUtils';
import { useBitmarkParser } from './BitmarkParser';
import { useBitmarkParserGenerator } from './BitmarkParserGenerator';
import { timeParse } from './parseTime';

const WASM_PARSERS: readonly ParserType[] = ['wasm'];
const OLD_PARSERS: readonly ParserType[] = ['js'];

/** How long the old (bpg) parser waits for a pause in editing (PLAN-019 D2). */
export const OLD_PARSER_DEBOUNCE_MS = 250;

// Module level: every editor's converter shares it, so an edit in one tab
// supersedes a pending one from another. A job that comes due after the
// legacy parser was turned off does nothing (PLAN-026 D1).
const scheduleOldParser = debounce(
  (job: () => Promise<void>): Promise<void> => (uiState.showLegacy ? job() : Promise.resolve()),
  OLD_PARSER_DEBOUNCE_MS,
);

/** Schedule a legacy parser (bpg) run, only while the legacy parser is on (PLAN-026 D1). */
const scheduleLegacy = (job: () => Promise<void>): void => {
  if (uiState.showLegacy) void scheduleOldParser(job);
};

/** Run the pending old-parser conversion now. For tests. */
export const flushOldParser = (): Promise<void> => scheduleOldParser.flush() ?? Promise.resolve();

// Per-direction JS (bpg) options (constant per direction).
const JS_MARKUP_TO_JSON_OPTIONS: ConvertOptions = { jsonOptions: { enableWarnings: true } };
const JS_JSON_TO_MARKUP_OPTIONS: ConvertOptions = { bitmarkOptions: { prettifyJson: true } };

// WASM lexer (7.x): the `lex` output format of `convert`, which returns the
// token stream as a JSON array.
const WASM_LEX_OPTIONS = { inputFormat: 'bitmark', outputFormat: 'lex', pretty: true } as const;

/** The WASM parser's mode, from Settings (PLAN-026 D2). */
const wasmMode = (): 'optimized' | 'full' => (uiState.fullOutput ? 'full' : 'optimized');

/**
 * The WASM parser's work, latest wins (PLAN-030 D6): its results arrive
 * later (it runs in workers), so at most one run is in flight and only the
 * newest waits; a run that a newer one replaced never runs. Module level:
 * every editor's converter shares it, as they share the state they write.
 */
const runWasm = createLatestRunner((job: () => Promise<void>) => job());

interface M2JResult {
  json?: JsonText;
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
  /** Re-write the WASM tabs' bitmark from their JSON (PLAN-025 D4). */
  regenerateWasmMarkup: () => Promise<void>;
  /** Re-run the WASM parser in the mode Settings now choose (PLAN-026 D3). */
  regenerateWasm: () => Promise<void>;
  /** Run the legacy parser (bpg) on the shown bitmark (PLAN-026 D1). */
  syncLegacy: () => void;
}

const useBitmarkConverter = (): BitmarkConverter => {
  const {
    bitmarkParserGenerator,
    loadSuccess: jsLoadSuccess,
    loadError: jsLoadError,
  } = useBitmarkParserGenerator();
  const {
    engine,
    markupReady,
    loadSuccess: wasmLoadSuccess,
    loadError: wasmLoadError,
  } = useBitmarkParser();

  // markup -> json for a single parser. Returns null when that parser is unavailable.
  const markupToJsonForParser = useCallback(
    async (parser: ParserType, markup: string): Promise<M2JResult | null> => {
      const started = performance.now();
      // The WASM parser's own time, from its worker (PLAN-030 D8).
      let parseMs: number | undefined;

      let json: JsonText | undefined;
      let error: Error | undefined;
      try {
        if (parser === 'js') {
          if (!bitmarkParserGenerator) return null;
          const bits = (await bitmarkParserGenerator.convert(markup, JS_MARKUP_TO_JSON_OPTIONS)) as
            | BitWrapperJson[]
            | undefined;
          json = jsonWithBitStarts(bits ?? []);
        } else {
          if (!engine) return null;
          // The JSON text and its bit starts, written in the worker (PLAN-030 D4).
          ({ value: json, ms: parseMs } = await timeParse(() =>
            engine.bitmarkToJsonText(markup, { mode: wasmMode() }),
          ));
        }
      } catch (e) {
        error = e as Error;
      }

      const durationSec = (parseMs ?? performance.now() - started) / 1000;
      return { json, error, durationSec };
    },
    [bitmarkParserGenerator, engine],
  );

  // json -> markup for a single parser. Returns null when that parser is unavailable.
  const jsonToMarkupForParser = useCallback(
    async (parser: ParserType, json: string): Promise<J2MResult | null> => {
      const started = performance.now();
      // The WASM parser's own time, from its worker (PLAN-030 D8).
      let parseMs: number | undefined;

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
          if (!engine) return null;
          // A parser older than 7.11 ignores `inlineStyle` (PLAN-025 D3).
          const inlineStyle = uiState.toggleTags ? 'toggle' : 'classic';
          const { value, ms } = await timeParse(() =>
            engine.convertWithBitStarts(json, {
              inputFormat: 'json',
              outputFormat: 'bitmark',
              mode: wasmMode(),
              inlineStyle,
            }),
          );
          ({ output: markup, inputStarts } = value);
          parseMs = ms;
        }
      } catch (e) {
        error = e as Error;
      }

      const durationSec = (parseMs ?? performance.now() - started) / 1000;
      return { markup, inputStarts, error, durationSec };
    },
    [bitmarkParserGenerator, engine],
  );

  // Lex the Bitmark tab's markup into the token JSON (PLAN-026 D8).
  // `lex` is a markup format: only the stage-2 (`full`) engine has it.
  const lexWasm = useCallback(async () => {
    if (!engine || !markupReady) return;
    try {
      bitmarkState.setLexerOutput(await engine.convert(bitmarkState.wasm.markup, WASM_LEX_OPTIONS));
    } catch (e) {
      bitmarkState.setLexerOutput(`Lexer error: ${String(e)}`);
    }
  }, [engine, markupReady]);

  // Edits made while stage 1 was serving were not lexed: lex once stage 2 lands.
  useEffect(() => {
    if (markupReady) void lexWasm();
  }, [markupReady, lexWasm]);

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
      await runWasm(async () => {
        await markupToJsonFor(WASM_PARSERS, editedTab, markup);
        await lexWasm();
      });
      scheduleLegacy(() => markupToJsonFor(OLD_PARSERS, editedTab, markup));
    },
    [markupToJsonFor, lexWasm],
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
          // converts it, so the WASM run places them for whichever tab was
          // edited — the legacy (bpg) run reports no positions.
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
      await runWasm(async () => {
        await jsonToMarkupFor(WASM_PARSERS, editedTab, json);
        await lexWasm();
      });
      scheduleLegacy(() => jsonToMarkupFor(OLD_PARSERS, editedTab, json));
    },
    [jsonToMarkupFor, lexWasm],
  );

  // Every WASM tab, the edited one included, from its own JSON. A tab with an
  // error keeps its text: its JSON is a last good value, or its bitmark is.
  const regenerateWasmMarkup = useCallback(async () => {
    await runWasm(async () => {
      await Promise.allSettled(
        WASM_PARSERS.map(async (parser) => {
          const slice = bitmarkState[parser];
          if (slice.jsonError || slice.markupError) return;
          const r = await jsonToMarkupForParser(parser, slice.jsonAsString);
          if (!r || r.error || r.markup === undefined) return;
          bitmarkState.setMarkup(parser, r.markup, undefined, r.durationSec);
        }),
      );
      await lexWasm();
    });
  }, [jsonToMarkupForParser, lexWasm]);

  // The shown bitmark to JSON in the new mode, then the bitmark back from
  // that JSON, so the Bitmark tab shows that mode's output (PLAN-026 D3).
  // A bitmark with an error keeps its text.
  const regenerateWasm = useCallback(async () => {
    await runWasm(async () => {
      const { markup, markupError } = bitmarkState.wasm;
      if (markupError) return;
      const forward = await markupToJsonForParser('wasm', markup);
      if (!forward) return;
      bitmarkState.setJson('wasm', forward.json, forward.error, forward.durationSec);
      if (!forward.error) {
        const back = await jsonToMarkupForParser('wasm', bitmarkState.wasm.jsonAsString);
        if (back && !back.error && back.markup !== undefined) {
          bitmarkState.setMarkup('wasm', back.markup, undefined, back.durationSec);
        }
      }
      await lexWasm();
    });
  }, [markupToJsonForParser, jsonToMarkupForParser, lexWasm]);

  // From the WASM bitmark, as if it had been edited: fills both Legacy tabs.
  const syncLegacy = useCallback(() => {
    const markup = bitmarkState.wasm.markup;
    scheduleLegacy(() => markupToJsonFor(OLD_PARSERS, 'wasm', markup));
  }, [markupToJsonFor]);

  return {
    jsLoadSuccess,
    jsLoadError,
    wasmLoadSuccess,
    wasmLoadError,
    markupToJson,
    jsonToMarkup,
    regenerateWasmMarkup,
    regenerateWasm,
    syncLegacy,
  };
};

export { useBitmarkConverter };
