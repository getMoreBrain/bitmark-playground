// @zen-component: PLAN-002-BitmarkState
import type { BitWrapperJson } from '@gmb/bitmark-parser-generator';
import { proxy } from 'valtio';

import { Writable } from '../utils/TypeScriptUtils';

export type ParserType = 'js' | 'wasm';

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
}

export interface BitmarkState {
  readonly js: ParserSlice;
  readonly wasm: ParserSlice;
  readonly activeMarkupTab: ParserType;
  readonly activeJsonTab: ParserType;
  setJson(
    parser: ParserType,
    markup: string,
    json: BitWrapperJson[] | undefined,
    jsonError: Error | undefined,
    durationSec?: number,
  ): void;
  setMarkup(
    parser: ParserType,
    json: string,
    markup: string | undefined,
    markupError: Error | undefined,
    durationSec?: number,
  ): void;
  setActiveMarkupTab(tab: ParserType): void;
  setActiveJsonTab(tab: ParserType): void;
  syncMarkupInput(markup: string): void;
  syncJsonInput(json: string): void;
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
});

// @zen-impl: PLAN-002-Step9 (tab query param)
const getDefaultTab = (): ParserType => {
  const searchParams = new URLSearchParams(window.location.search);
  const tab = searchParams.get('tab');
  if (tab === 'wasm') return 'wasm';
  return 'js';
};

const bitmarkState = proxy<BitmarkState>({
  js: createParserSlice(),
  wasm: createParserSlice(),
  activeMarkupTab: getDefaultTab(),
  activeJsonTab: getDefaultTab(),

  setJson: (
    parser: ParserType,
    markup: string,
    json: BitWrapperJson[] | undefined,
    jsonError: Error | undefined,
    durationSec?: number,
  ) => {
    const slice = bitmarkState[parser] as Writable<ParserSlice>;

    slice.markup = markup;

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

  setMarkup: (
    parser: ParserType,
    json: string,
    markup: string | undefined,
    markupError: Error | undefined,
    durationSec?: number,
  ) => {
    const slice = bitmarkState[parser] as Writable<ParserSlice>;

    slice.jsonAsString = json;

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

  setActiveMarkupTab: (tab: ParserType) => {
    (bitmarkState as Writable<BitmarkState>).activeMarkupTab = tab;
  },

  setActiveJsonTab: (tab: ParserType) => {
    (bitmarkState as Writable<BitmarkState>).activeJsonTab = tab;
  },

  syncMarkupInput: (markup: string) => {
    const jsSlice = bitmarkState.js as Writable<ParserSlice>;
    const wasmSlice = bitmarkState.wasm as Writable<ParserSlice>;
    jsSlice.markup = markup;
    jsSlice.markupError = undefined;
    jsSlice.markupErrorAsString = undefined;
    wasmSlice.markup = markup;
    wasmSlice.markupError = undefined;
    wasmSlice.markupErrorAsString = undefined;
  },

  syncJsonInput: (json: string) => {
    const jsSlice = bitmarkState.js as Writable<ParserSlice>;
    const wasmSlice = bitmarkState.wasm as Writable<ParserSlice>;
    jsSlice.jsonAsString = json;
    jsSlice.jsonError = undefined;
    jsSlice.jsonErrorAsString = undefined;
    wasmSlice.jsonAsString = json;
    wasmSlice.jsonError = undefined;
    wasmSlice.jsonErrorAsString = undefined;
  },
});

export { bitmarkState };
