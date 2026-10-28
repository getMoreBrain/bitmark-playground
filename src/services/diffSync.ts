import { subscribe } from 'valtio';

import { log } from '../logging/log';
import { bitmarkState } from '../state/bitmarkState';
import { diffState } from '../state/diffState';
import { uiState } from '../state/uiState';
import type { BitmarkPatcher } from './bitmarkPatcher';

export interface DiffSync {
  /** An edit of the Diff: apply it to the Bitmark tab, giving Final Bitmark (PLAN-032 D5). */
  applyDiff(diff: string): void;
  dispose(): void;
}

/** Whether the Diff tab is on screen. */
const diffShown = (): boolean => uiState.showDiff && bitmarkState.activeJsonTab === 'diff';

/**
 * Keep the Diff and Final Bitmark in step with the Bitmark tab (PLAN-032
 * D4–D6). Whichever of the two directions ran last wins.
 */
export const startDiffSync = (patcher: BitmarkPatcher): DiffSync => {
  let seeded = false;
  // The documents the Diff is (being) computed for, or an applied Diff gave.
  let inStep: { a: string; b: string } | undefined;
  let latest = 0;

  const sync = () => {
    if (!uiState.showDiff) return;
    const a = bitmarkState.wasm.markup;
    // The first show: Final Bitmark starts as the Bitmark tab (D6).
    if (!seeded) {
      if (a === '') return;
      seeded = true;
      if (diffState.finalMarkup === '') diffState.setFinalMarkup(a);
    }
    const b = diffState.finalMarkup;
    if (!diffShown() || (inStep?.a === a && inStep.b === b)) return;
    inStep = { a, b };
    const run = ++latest;
    patcher.diff(a, b).then(
      ({ value, ms }) => run === latest && diffState.setDiff(value, undefined, ms / 1000),
      (e: unknown) => run === latest && diffState.setDiff(undefined, e),
    );
  };

  const unsubscribe = [bitmarkState, uiState, diffState].map((state) => subscribe(state, sync));
  sync();

  return {
    applyDiff(diff) {
      diffState.setEditedDiff(diff);
      const a = bitmarkState.wasm.markup;
      const run = ++latest;
      patcher.apply(a, diff).then(
        ({ value: b, ms }) => {
          if (run !== latest) return;
          // Not diffed again: it would replace the Diff being typed (D5).
          inStep = { a, b };
          diffState.setFinalMarkup(b, ms / 1000);
        },
        // Final Bitmark stays as it is.
        (e: unknown) => run === latest && log.warn('The diff does not apply', e),
      );
    },
    dispose() {
      latest++;
      for (const off of unsubscribe) off();
    },
  };
};
