import { proxy } from 'valtio';

import { Writable } from '../utils/TypeScriptUtils';

/** The Final Bitmark and Diff panes (PLAN-032). */
export interface DiffState {
  /** The second bitmark document, which the Diff turns the Bitmark tab into. */
  readonly finalMarkup: string;
  /** The diff from the Bitmark tab to Final Bitmark. */
  readonly diff: string;
  /** The last diff's error, shown instead of the diff (which keeps its last value). */
  readonly diffErrorAsString: string | undefined;
  /** The parser's time for the last applied Diff, in seconds (the tab shows it). */
  readonly finalDurationSec: number | undefined;
  /** The parser's time for the last diff, in seconds (the tab shows it). */
  readonly diffDurationSec: number | undefined;
  /** Final Bitmark: an edit, or an applied Diff with its time. */
  setFinalMarkup(markup: string, durationSec?: number): void;
  /** A computed diff and its time, or its error. */
  setDiff(diff: string | undefined, error?: unknown, durationSec?: number): void;
  /** Set the diff verbatim (raw user input; clears the error). */
  setEditedDiff(diff: string): void;
}

const diffState = proxy<DiffState>({
  finalMarkup: '',
  diff: '',
  diffErrorAsString: undefined,
  finalDurationSec: undefined,
  diffDurationSec: undefined,

  setFinalMarkup: (markup: string, durationSec?: number) => {
    const state = diffState as Writable<DiffState>;
    state.finalMarkup = markup;
    if (durationSec !== undefined) state.finalDurationSec = durationSec;
  },

  setDiff: (diff: string | undefined, error?: unknown, durationSec?: number) => {
    const state = diffState as Writable<DiffState>;
    if (durationSec !== undefined) state.diffDurationSec = durationSec;
    if (error !== undefined) {
      state.diffErrorAsString = error instanceof Error ? error.message : String(error);
      return;
    }
    state.diff = diff ?? '';
    state.diffErrorAsString = undefined;
  },

  setEditedDiff: (diff: string) => {
    const state = diffState as Writable<DiffState>;
    state.diff = diff;
    state.diffErrorAsString = undefined;
  },
});

export { diffState };
