import { jsonWithBitStarts } from '@gmb/bitmark-editor';
import type { BitWrapperJson } from '@gmb/bitmark-parser-generator';
import { proxy } from 'valtio';

import { loadSettings } from '../services/settingsStorage';
import { Writable } from '../utils/TypeScriptUtils';

export type ParserType = 'js' | 'wasm' | 'wasmFull';

/** Display names for the parser tabs, matching the tab bar. */
export const TAB_LABEL: Record<ParserType, string> = {
  js: 'Original',
  wasm: 'WASM',
  wasmFull: 'WASM (full)',
};
/** Tab id for the JSON parser tab bar — adds the round-trip, HTML-table, text and XML views. */
export type JsonTabType = ParserType | 'wasmCheck' | 'tableHtml' | 'text' | XmlVariant;
/**
 * XML mapping variants. Each is its own JSON-side tab and its own state slice;
 * they differ only by the config mapping id passed to the parser's `convert`.
 */
export type XmlVariant = 'xmlNiso' | 'xmlNisoEs';

export interface ParserSlice {
  readonly markup: string;
  readonly markupError: Error | undefined;
  readonly markupErrorAsString: string | undefined;
  readonly markupDurationSec: number | undefined;
  readonly markupUpdates: number;
  readonly json: BitWrapperJson[];
  readonly jsonAsString: string;
  /**
   * Where each bit starts in the JSON text (UTF-16 offsets), recorded by
   * whatever wrote it (PLAN-018 D1, D4). `undefined` when the JSON text was
   * typed by the user, so no positions are known for it.
   */
  readonly jsonBitStarts: readonly number[] | undefined;
  readonly jsonError: Error | undefined;
  readonly jsonErrorAsString: string | undefined;
  readonly jsonDurationSec: number | undefined;
  readonly jsonUpdates: number;
  readonly lexerOutput: string;
}

export interface WasmCheckSlice {
  readonly markup: string;
  readonly markupError: Error | undefined;
  readonly markupErrorAsString: string | undefined;
  readonly markupDurationSec: number | undefined;
  readonly markupUpdates: number;
}

/**
 * The Original (bpg) JSON after a full round trip through bpg
 * (`json -> bitmark -> json`). Used as the WASM Check LED reference, so the Rust
 * parser is not penalised for fields bpg itself cannot express in markup.
 */
export interface JsRoundTripSlice {
  readonly json: BitWrapperJson[];
  /** The `js.jsonAsString` this round trip was computed from (staleness guard). */
  readonly sourceJsonAsString: string;
  readonly error: Error | undefined;
  readonly durationSec: number | undefined;
  readonly updates: number;
}

/**
 * The window the user last edited — the input to the mapping report.
 *
 * Recorded at the UI entry points (the editors' `onInput`), NOT inside the
 * converter: the converter is also driven programmatically by the XML/HTML
 * panels, which would otherwise masquerade as bitmark edits.
 */
export interface LastEditSlice {
  /** Parser `inputFormat` id for that window ('' before the first edit). */
  readonly inputFormat: string;
  /** That window's content at the time of the edit. */
  readonly content: string;
  /** Human label for the window, shown above the report. */
  readonly label: string;
  /**
   * Where the edit happened: the playground's own editors, or a package
   * pane of the session (PLAN-023 Step 14, which keeps the two from echoing).
   */
  readonly origin: 'playground' | 'session';
  readonly updates: number;
}

/** The package panes whose regeneration time the tab bar shows (PLAN-023 Step 14). */
export type TimedPane = 'tableHtml' | 'text' | XmlVariant;

export interface BitmarkState {
  readonly js: ParserSlice;
  readonly wasm: ParserSlice;
  readonly wasmFull: ParserSlice;
  readonly wasmCheck: WasmCheckSlice;
  readonly jsRoundTrip: JsRoundTripSlice;
  readonly lastEdit: LastEditSlice;
  /** Each timed pane's last regeneration time, in seconds. */
  readonly paneDurations: Readonly<Record<TimedPane, number | undefined>>;
  readonly activeMarkupTab: ParserType;
  readonly activeJsonTab: JsonTabType;
  setJson(
    parser: ParserType,
    json: BitWrapperJson[] | undefined,
    jsonError: Error | undefined,
    durationSec?: number,
  ): void;
  setMarkup(
    parser: ParserType,
    markup: string | undefined,
    markupError: Error | undefined,
    durationSec?: number,
  ): void;
  setLexerOutput(parser: ParserType, output: string): void;
  setWasmCheck(
    markup: string | undefined,
    markupError: Error | undefined,
    durationSec?: number,
  ): void;
  setJsRoundTrip(
    sourceJsonAsString: string,
    json: BitWrapperJson[] | undefined,
    error: Error | undefined,
    durationSec?: number,
  ): void;
  setActiveMarkupTab(tab: ParserType): void;
  setActiveJsonTab(tab: JsonTabType): void;
  /** Set the edited tab's markup verbatim (raw user input; clears markup error). */
  setEditedMarkup(parser: ParserType, markup: string): void;
  /** Set the edited tab's JSON verbatim (raw user input; clears JSON error). */
  setEditedJson(parser: ParserType, json: string): void;
  /**
   * Where each bit starts in the JSON the user typed, as its own conversion
   * read it (PLAN-020). Ignored unless the tab still shows exactly `json`.
   */
  setEditedJsonBitStarts(parser: ParserType, json: string, bitStarts: readonly number[]): void;
  /** Record the window the user just edited (drives the mapping report). */
  setLastEdit(
    inputFormat: string,
    content: string,
    label: string,
    origin?: 'playground' | 'session',
  ): void;
  setPaneDuration(pane: TimedPane, durationSec: number): void;
}

const createParserSlice = (): ParserSlice => ({
  markup: '',
  markupError: undefined,
  markupErrorAsString: undefined,
  markupDurationSec: undefined,
  markupUpdates: 0,
  json: [],
  jsonAsString: '',
  jsonBitStarts: undefined,
  jsonError: undefined,
  jsonErrorAsString: undefined,
  jsonDurationSec: undefined,
  jsonUpdates: 0,
  lexerOutput: '',
});

const createWasmCheckSlice = (): WasmCheckSlice => ({
  markup: '',
  markupError: undefined,
  markupErrorAsString: undefined,
  markupDurationSec: undefined,
  markupUpdates: 0,
});

const createJsRoundTripSlice = (): JsRoundTripSlice => ({
  json: [],
  sourceJsonAsString: '',
  error: undefined,
  durationSec: undefined,
  updates: 0,
});

const getTabFromUrl = (): ParserType | null => {
  const searchParams = new URLSearchParams(window.location.search);
  const tab = searchParams.get('tab');
  if (tab === 'wasm') return 'wasm';
  if (tab === 'wasmFull') return 'wasmFull';
  if (tab === 'js') return 'js';
  return null;
};

const storedSettings = loadSettings();
const urlTab = getTabFromUrl();

const bitmarkState = proxy<BitmarkState>({
  js: createParserSlice(),
  wasm: createParserSlice(),
  wasmFull: createParserSlice(),
  wasmCheck: createWasmCheckSlice(),
  jsRoundTrip: createJsRoundTripSlice(),
  lastEdit: { inputFormat: '', content: '', label: '', origin: 'playground', updates: 0 },
  paneDurations: {
    tableHtml: undefined,
    text: undefined,
    xmlNiso: undefined,
    xmlNisoEs: undefined,
  },
  activeMarkupTab: urlTab ?? storedSettings?.activeMarkupTab ?? 'js',
  activeJsonTab: urlTab ?? storedSettings?.activeJsonTab ?? 'js',

  setJson: (
    parser: ParserType,
    json: BitWrapperJson[] | undefined,
    jsonError: Error | undefined,
    durationSec?: number,
  ) => {
    const slice = bitmarkState[parser] as Writable<ParserSlice>;

    if (jsonError) {
      slice.jsonError = jsonError;
      try {
        slice.jsonErrorAsString = JSON.stringify(
          jsonError,
          Object.getOwnPropertyNames(jsonError),
          2,
        );
      } catch (_e) {
        slice.jsonErrorAsString = 'Unknown';
      }
    } else {
      slice.json = json ?? [];
      try {
        const { text, bitStarts } = jsonWithBitStarts(slice.json);
        slice.jsonAsString = text;
        slice.jsonBitStarts = bitStarts;
        slice.jsonError = undefined;
        slice.jsonErrorAsString = undefined;
      } catch (e) {
        slice.jsonError = e as Error;
        slice.jsonErrorAsString = JSON.stringify(e, Object.getOwnPropertyNames(e), 2);
      }
    }
    slice.jsonDurationSec = durationSec;
    slice.jsonUpdates += 1;
  },

  setMarkup: (
    parser: ParserType,
    markup: string | undefined,
    markupError: Error | undefined,
    durationSec?: number,
  ) => {
    const slice = bitmarkState[parser] as Writable<ParserSlice>;

    if (markupError) {
      slice.markupError = markupError;
      try {
        slice.markupErrorAsString = JSON.stringify(
          markupError,
          Object.getOwnPropertyNames(markupError),
          2,
        );
      } catch (_e) {
        slice.markupErrorAsString = 'Unknown';
      }
    } else {
      slice.markup = markup ?? '';
      slice.markupError = undefined;
      slice.markupErrorAsString = undefined;
    }
    slice.markupDurationSec = durationSec;
    slice.markupUpdates += 1;
  },

  setLexerOutput: (parser: ParserType, output: string) => {
    const slice = bitmarkState[parser] as Writable<ParserSlice>;
    slice.lexerOutput = output;
  },

  setWasmCheck: (
    markup: string | undefined,
    markupError: Error | undefined,
    durationSec?: number,
  ) => {
    const slice = bitmarkState.wasmCheck as Writable<WasmCheckSlice>;

    if (markupError) {
      slice.markupError = markupError;
      try {
        slice.markupErrorAsString = JSON.stringify(
          markupError,
          Object.getOwnPropertyNames(markupError),
          2,
        );
      } catch (_e) {
        slice.markupErrorAsString = 'Unknown';
      }
    } else {
      slice.markup = markup ?? '';
      slice.markupError = undefined;
      slice.markupErrorAsString = undefined;
    }
    slice.markupDurationSec = durationSec;
    slice.markupUpdates += 1;
  },

  // `sourceJsonAsString` is always stored, including on error, so consumers can
  // tell "reference failed for the current JSON" from "reference is stale".
  setJsRoundTrip: (
    sourceJsonAsString: string,
    json: BitWrapperJson[] | undefined,
    error: Error | undefined,
    durationSec?: number,
  ) => {
    const slice = bitmarkState.jsRoundTrip as Writable<JsRoundTripSlice>;

    slice.sourceJsonAsString = sourceJsonAsString;
    if (error) {
      slice.error = error;
    } else {
      slice.json = json ?? [];
      slice.error = undefined;
    }
    slice.durationSec = durationSec;
    slice.updates += 1;
  },

  setActiveMarkupTab: (tab: ParserType) => {
    (bitmarkState as Writable<BitmarkState>).activeMarkupTab = tab;
  },

  setActiveJsonTab: (tab: JsonTabType) => {
    (bitmarkState as Writable<BitmarkState>).activeJsonTab = tab;
  },

  setEditedMarkup: (parser: ParserType, markup: string) => {
    const slice = bitmarkState[parser] as Writable<ParserSlice>;
    slice.markup = markup;
    slice.markupError = undefined;
    slice.markupErrorAsString = undefined;
  },

  setEditedJson: (parser: ParserType, json: string) => {
    const slice = bitmarkState[parser] as Writable<ParserSlice>;
    slice.jsonAsString = json;
    // Typed text: no known positions until its conversion reads them (PLAN-020).
    slice.jsonBitStarts = undefined;
    slice.jsonError = undefined;
    slice.jsonErrorAsString = undefined;
  },

  setEditedJsonBitStarts: (parser: ParserType, json: string, bitStarts: readonly number[]) => {
    const slice = bitmarkState[parser] as Writable<ParserSlice>;
    // A later edit has replaced the text these positions describe.
    if (slice.jsonAsString !== json) return;
    slice.jsonBitStarts = bitStarts;
  },

  setLastEdit: (
    inputFormat: string,
    content: string,
    label: string,
    origin: 'playground' | 'session' = 'playground',
  ) => {
    const slice = bitmarkState.lastEdit as Writable<LastEditSlice>;
    slice.inputFormat = inputFormat;
    slice.content = content;
    slice.label = label;
    slice.origin = origin;
    slice.updates += 1;
  },

  setPaneDuration: (pane: TimedPane, durationSec: number) => {
    (bitmarkState.paneDurations as Writable<Record<TimedPane, number | undefined>>)[pane] =
      durationSec;
  },
});

export { bitmarkState };
