// @awa-component: PLAN-018-ScrollSync
import type { splitBits as splitBitsFn } from '@gmb/bitmark-parser';
import type * as monaco from 'monaco-editor';
import { subscribeKey } from 'valtio/utils';

import { log } from '../logging/log';
import { uiState } from '../state/uiState';
import { mapScrollTop, ScrollGeometry } from './mapScrollTop';

/**
 * The two linked panes. Only one editor holds each slot at a time: the
 * bitmark editor, and whichever right-hand tab is mounted.
 */
export type ScrollSlot = 'bitmark' | 'output';

export interface ScrollSyncHandle extends monaco.IDisposable {
  /** The pane's bit starts changed without a content change (markers pinned). */
  invalidate(): void;
}

/** The part of a Monaco editor the coordinator uses. */
export type ScrollSyncEditor = Pick<
  monaco.editor.ICodeEditor,
  | 'getModel'
  | 'getScrollTop'
  | 'setScrollTop'
  | 'getScrollHeight'
  | 'getLayoutInfo'
  | 'getTopForPosition'
  | 'hasTextFocus'
  | 'onDidScrollChange'
  | 'onDidChangeModelContent'
  | 'onDidContentSizeChange'
  | 'onDidLayoutChange'
>;

interface Pane {
  readonly slot: ScrollSlot;
  readonly editor: ScrollSyncEditor;
  readonly bitStarts: () => readonly number[];
  /** Pixel top of each bit, dropped whenever content or layout changes. */
  tops: number[] | undefined;
}

const panes: Partial<Record<ScrollSlot, Pane>> = {};
// If no pane has led yet, the bitmark editor leads.
let leader: ScrollSlot = 'bitmark';
// Set while the coordinator scrolls the follower. Monaco reports that scroll
// synchronously, so the echo is dropped here rather than taken as the user's.
let syncing = false;

const other = (slot: ScrollSlot): ScrollSlot => (slot === 'bitmark' ? 'output' : 'bitmark');

const geometry = (pane: Pane): ScrollGeometry => {
  const { editor } = pane;
  if (!pane.tops) {
    const model = editor.getModel();
    pane.tops = model
      ? pane.bitStarts().map((offset) => {
          const { lineNumber, column } = model.getPositionAt(offset);
          return editor.getTopForPosition(lineNumber, column);
        })
      : [];
  }
  return {
    bitTops: pane.tops,
    maxScrollTop: editor.getScrollHeight() - editor.getLayoutInfo().height,
  };
};

// @awa-impl: PLAN-018-Step6 (the follower follows the leader)
const follow = (): void => {
  if (!uiState.linkScroll) return;
  const src = panes[leader];
  const dst = panes[other(leader)];
  if (!src || !dst) return;
  const target = mapScrollTop(geometry(src), geometry(dst), src.editor.getScrollTop());
  syncing = true;
  try {
    dst.editor.setScrollTop(target);
  } finally {
    syncing = false;
  }
};

/**
 * A pane's content, markers or layout changed: its bit positions are stale.
 * The pane the user is typing in leads; a pane whose content changed under
 * it follows the other.
 */
// @awa-impl: PLAN-018-Step6 (re-sync on content / marker change and relayout)
const refresh = (pane: Pane): void => {
  pane.tops = undefined;
  if (pane.editor.hasTextFocus()) leader = pane.slot;
  else if (panes[other(pane.slot)]) leader = other(pane.slot);
  follow();
};

/**
 * Link an editor's scrolling to the other slot's, by bit. `bitStarts` gives
 * the pane's current bit starts (UTF-16 offsets). A newly attached pane
 * follows the other, so a tab switch lands on the matching bit.
 */
// @awa-impl: PLAN-018-Step6 (attach, leader rules, echo suppression)
export const attachScrollSync = (
  editor: ScrollSyncEditor,
  slot: ScrollSlot,
  bitStarts: () => readonly number[],
): ScrollSyncHandle => {
  const pane: Pane = { slot, editor, bitStarts, tops: undefined };
  panes[slot] = pane;

  const listeners = [
    editor.onDidScrollChange((e) => {
      if (!e.scrollTopChanged || syncing || panes[slot] !== pane) return;
      // A scroll that comes with a height change is Monaco clamping after a
      // content change, not the user.
      if (e.scrollHeightChanged) {
        refresh(pane);
        return;
      }
      leader = slot;
      follow();
    }),
    editor.onDidChangeModelContent(() => refresh(pane)),
    editor.onDidContentSizeChange(() => refresh(pane)),
    editor.onDidLayoutChange(() => refresh(pane)),
  ];

  if (panes[other(slot)]) leader = other(slot);
  follow();

  return {
    invalidate: () => refresh(pane),
    dispose: () => {
      for (const listener of listeners) listener.dispose();
      if (panes[slot] !== pane) return;
      delete panes[slot];
      leader = other(slot);
    },
  };
};

// @awa-impl: PLAN-018-Step6 (re-sync when linking is switched back on)
subscribeKey(uiState, 'linkScroll', (on) => {
  if (on) follow();
});

// --- The bitmark panes' bit starts, from the parser's `splitBits` ---

let splitBits: typeof splitBitsFn | undefined;
const splitCache = new WeakMap<
  monaco.editor.ITextModel,
  { versionId: number; source: typeof splitBitsFn; starts: number[] }
>();
const warnedNoStart = new WeakSet<typeof splitBitsFn>();

/**
 * Install (or, with `undefined`, remove) the parser function that splits
 * bitmark into bits. Every pane re-measures.
 */
// @awa-impl: PLAN-018-Step1 (the splitBits source)
export const setSplitBitsSource = (next: typeof splitBitsFn | undefined): void => {
  splitBits = next;
  for (const pane of Object.values(panes)) pane.tops = undefined;
  follow();
};

/**
 * Where each bit starts in a bitmark editor's text: `splitBits` `start`
 * (UTF-16, the default encoding), computed once per model version. Bitmark
 * that is broken still splits, at each `[.`.
 */
export const splitBitStarts = (editor: Pick<ScrollSyncEditor, 'getModel'>): number[] => {
  const model = editor.getModel();
  const source = splitBits;
  if (!model || !source) return [];
  const versionId = model.getVersionId();
  const hit = splitCache.get(model);
  if (hit && hit.versionId === versionId && hit.source === source) return hit.starts;
  let starts: number[] = [];
  try {
    // An engine older than parser PLAN-221 has no `start` (PLAN-018 D2).
    const slices = source(model.getValue());
    starts = slices
      .map((slice) => slice.start)
      .filter((start): start is number => typeof start === 'number');
    // Said once per engine: without it, linking quietly turns proportional.
    if (slices.length > 0 && starts.length === 0 && !warnedNoStart.has(source)) {
      warnedNoStart.add(source);
      log.warn(
        'splitBits gives no `start` (parser older than PLAN-221): scroll linking is proportional',
      );
    }
  } catch (e) {
    log.error('splitBits failed', e);
  }
  splitCache.set(model, { versionId, source, starts });
  return starts;
};

/** Forget every pane and the leader. Only for tests. */
export const resetScrollSync = (): void => {
  delete panes.bitmark;
  delete panes.output;
  leader = 'bitmark';
  syncing = false;
  splitBits = undefined;
};
