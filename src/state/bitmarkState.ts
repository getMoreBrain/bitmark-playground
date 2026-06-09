// @awa-component: PLAN-002-BitmarkState
// @awa-component: PLAN-008-BitmarkState
// @awa-component: PLAN-011-BitmarkState
import type { BitWrapperJson } from '@gmb/bitmark-parser-generator';
import { proxy } from 'valtio';

import { loadSettings } from '../services/settingsStorage';
import { Writable } from '../utils/TypeScriptUtils';

export type ParserType = 'js' | 'wasm' | 'wasmFull';
/** Tab id for the JSON parser tab bar — adds the round-trip and HTML-table views. */
export type JsonTabType = ParserType | 'wasmCheck' | 'tableHtml' | 'text';

export interface ParserSlice {
  readonly markup: string;
  readonly markupError: Error | undefined;
  readonly markupErrorAsString: string | undefined;
  readonly markupDurationSec: number | undefined;
  readonly markupUpdates: number;
  readonly json: BitWrapperJson[];
  readonly jsonAsString: string;
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

// @awa-component: PLAN-007-TableHtmlSlice
export interface TableHtmlSlice {
  readonly html: string;
  readonly htmlError: Error | undefined;
  readonly htmlErrorAsString: string | undefined;
  readonly htmlDurationSec: number | undefined;
  readonly htmlUpdates: number;
}

// @awa-component: PLAN-011-TextSlice
export interface TextSlice {
  readonly text: string;
  readonly textError: Error | undefined;
  readonly textErrorAsString: string | undefined;
  readonly textDurationSec: number | undefined;
  readonly textUpdates: number;
}

export interface BitmarkState {
  readonly js: ParserSlice;
  readonly wasm: ParserSlice;
  readonly wasmFull: ParserSlice;
  readonly wasmCheck: WasmCheckSlice;
  readonly tableHtml: TableHtmlSlice;
  readonly text: TextSlice;
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
  setTableHtml(html: string | undefined, htmlError: Error | undefined, durationSec?: number): void;
  setText(text: string | undefined, textError: Error | undefined, durationSec?: number): void;
  setActiveMarkupTab(tab: ParserType): void;
  setActiveJsonTab(tab: JsonTabType): void;
  /** Set the edited tab's markup verbatim (raw user input; clears markup error). */
  setEditedMarkup(parser: ParserType, markup: string): void;
  /** Set the edited tab's JSON verbatim (raw user input; clears JSON error). */
  setEditedJson(parser: ParserType, json: string): void;
}

const createParserSlice = (): ParserSlice => ({
  markup: '',
  markupError: undefined,
  markupErrorAsString: undefined,
  markupDurationSec: undefined,
  markupUpdates: 0,
  json: [],
  jsonAsString: '',
  jsonError: undefined,
  jsonErrorAsString: undefined,
  jsonDurationSec: undefined,
  jsonUpdates: 0,
  lexerOutput: '',
});

// @awa-component: PLAN-006-WasmCheckSlice
const createWasmCheckSlice = (): WasmCheckSlice => ({
  markup: '',
  markupError: undefined,
  markupErrorAsString: undefined,
  markupDurationSec: undefined,
  markupUpdates: 0,
});

// @awa-component: PLAN-007-TableHtmlSlice
const createTableHtmlSlice = (): TableHtmlSlice => ({
  html: '',
  htmlError: undefined,
  htmlErrorAsString: undefined,
  htmlDurationSec: undefined,
  htmlUpdates: 0,
});

// @awa-component: PLAN-011-TextSlice
const createTextSlice = (): TextSlice => ({
  text: '',
  textError: undefined,
  textErrorAsString: undefined,
  textDurationSec: undefined,
  textUpdates: 0,
});

// @awa-impl: PLAN-002-Step9 (tab query param)
// @awa-impl: PLAN-004-Step2 (hydrate from storage, URL param wins)
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
  tableHtml: createTableHtmlSlice(),
  text: createTextSlice(),
  activeMarkupTab: urlTab ?? storedSettings?.activeMarkupTab ?? 'js',
  activeJsonTab: urlTab ?? storedSettings?.activeJsonTab ?? 'js',

  // @awa-impl: PLAN-008-Step1 (setJson sets only the JSON side — no cross-write)
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
        slice.jsonAsString = JSON.stringify(slice.json, undefined, 2);
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

  // @awa-impl: PLAN-008-Step1 (setMarkup sets only the markup side — no cross-write)
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

  // @awa-impl: PLAN-006-Step1 (setWasmCheck setter)
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

  // @awa-impl: PLAN-007-Step1 (setTableHtml setter)
  // html and error are independent: html is always stored when provided (so the
  // editable editor is never clobbered), while error is set/cleared separately.
  // On error with html undefined (e.g. bitmark -> HTML failed), the last good
  // html is preserved.
  setTableHtml: (html: string | undefined, htmlError: Error | undefined, durationSec?: number) => {
    const slice = bitmarkState.tableHtml as Writable<TableHtmlSlice>;

    if (html !== undefined) {
      slice.html = html;
    }

    if (htmlError) {
      slice.htmlError = htmlError;
      try {
        slice.htmlErrorAsString = JSON.stringify(
          htmlError,
          Object.getOwnPropertyNames(htmlError),
          2,
        );
      } catch (_e) {
        slice.htmlErrorAsString = 'Unknown';
      }
    } else {
      slice.htmlError = undefined;
      slice.htmlErrorAsString = undefined;
    }
    slice.htmlDurationSec = durationSec;
    slice.htmlUpdates += 1;
  },

  // @awa-impl: PLAN-011-Step1 (setText setter; read-only WASM-opt-bitmark -> text view)
  setText: (text: string | undefined, textError: Error | undefined, durationSec?: number) => {
    const slice = bitmarkState.text as Writable<TextSlice>;

    if (textError) {
      slice.textError = textError;
      try {
        slice.textErrorAsString = JSON.stringify(
          textError,
          Object.getOwnPropertyNames(textError),
          2,
        );
      } catch (_e) {
        slice.textErrorAsString = 'Unknown';
      }
    } else {
      slice.text = text ?? '';
      slice.textError = undefined;
      slice.textErrorAsString = undefined;
    }
    slice.textDurationSec = durationSec;
    slice.textUpdates += 1;
  },

  setActiveMarkupTab: (tab: ParserType) => {
    (bitmarkState as Writable<BitmarkState>).activeMarkupTab = tab;
  },

  setActiveJsonTab: (tab: JsonTabType) => {
    (bitmarkState as Writable<BitmarkState>).activeJsonTab = tab;
  },

  // @awa-impl: PLAN-008-Step1 (edited tab keeps the user input verbatim — no copy to others)
  setEditedMarkup: (parser: ParserType, markup: string) => {
    const slice = bitmarkState[parser] as Writable<ParserSlice>;
    slice.markup = markup;
    slice.markupError = undefined;
    slice.markupErrorAsString = undefined;
  },

  setEditedJson: (parser: ParserType, json: string) => {
    const slice = bitmarkState[parser] as Writable<ParserSlice>;
    slice.jsonAsString = json;
    slice.jsonError = undefined;
    slice.jsonErrorAsString = undefined;
  },
});

export { bitmarkState };
