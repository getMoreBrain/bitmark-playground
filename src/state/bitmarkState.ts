/* eslint-disable valtio/avoid-this-in-proxy */
import type { BitWrapperJson } from '@gmb/bitmark-parser-generator';
import { proxy } from 'valtio';

import { Writable } from '../utils/TypeScriptUtils';

export interface BitmarkState {
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
  // AST not implemented yet
  // ast: BitmarkAst | undefined;
  // astError: string | undefined;
  // astUpdates: number;
  setJson(markup: string, json: BitWrapperJson[] | undefined, jsonError: Error | undefined, durationSec?: number): void;
  setMarkup(json: string, markup: string | undefined, markupError: Error | undefined, durationSec?: number): void;
}

const bitmarkState = proxy<BitmarkState>({
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
  setJson: (markup: string, json: BitWrapperJson[] | undefined, jsonError: Error | undefined, durationSec?: number) => {
    const state = bitmarkState as Writable<BitmarkState>;

    state.markup = markup;

    if (jsonError) {
      state.jsonError = jsonError;
      try {
        state.jsonErrorAsString = JSON.stringify(jsonError, Object.getOwnPropertyNames(jsonError), 2);
      } catch (e) {
        state.markupErrorAsString = 'Unknown';
      }
    } else {
      state.json = json ?? [];
      try {
        state.jsonAsString = JSON.stringify(state.json, undefined, 2);
        state.jsonError = undefined;
        state.jsonErrorAsString = undefined;
      } catch (e) {
        state.jsonError = e as Error;
        state.jsonErrorAsString = JSON.stringify(e, Object.getOwnPropertyNames(e), 2);
      }
    }
    state.jsonDurationSec = durationSec;
    state.jsonUpdates += 1;
  },
  setMarkup: (json: string, markup: string | undefined, markupError: Error | undefined, durationSec?: number) => {
    const state = bitmarkState as Writable<BitmarkState>;

    state.jsonAsString = json;

    if (markupError) {
      state.markupError = markupError;
      try {
        state.markupErrorAsString = JSON.stringify(markupError, Object.getOwnPropertyNames(markupError), 2);
      } catch (e) {
        state.markupErrorAsString = 'Unknown';
      }
    } else {
      state.markup = markup ?? '';
      state.markupError = undefined;
      state.markupErrorAsString = undefined;
    }
    state.markupDurationSec = durationSec;
    state.markupUpdates += 1;
  },
});

export { bitmarkState };
