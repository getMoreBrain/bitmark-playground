// @awa-component: PLAN-018-UseScrollSync
import type * as monaco from 'monaco-editor';
import { useCallback, useEffect, useRef } from 'react';

import { attachBitMarkers, BitMarkers } from './bitMarkers';
import { attachScrollSync, ScrollSlot, ScrollSyncHandle, splitBitStarts } from './scrollSync';

/** Mount / unmount callbacks for a pane; call them from its own. */
export interface ScrollSyncCallbacks {
  onMount(editor: monaco.editor.ICodeEditor): void;
  onUnmount(): void;
}

/**
 * Link a pane that shows bitmark (the bitmark editor, WASM Check). Its bit
 * starts are split from its own text (PLAN-018 D1).
 */
// @awa-impl: PLAN-018-Step7 (split panes)
export const useSplitScrollSync = (slot: ScrollSlot): ScrollSyncCallbacks => {
  const syncRef = useRef<ScrollSyncHandle>();

  const onMount = useCallback(
    (editor: monaco.editor.ICodeEditor) => {
      syncRef.current = attachScrollSync(editor, slot, () => splitBitStarts(editor));
    },
    [slot],
  );

  const onUnmount = useCallback(() => {
    syncRef.current?.dispose();
    syncRef.current = undefined;
  }, []);

  return { onMount, onUnmount };
};

/**
 * Link an output pane (JSON, HTML, XML, Text). Its bit starts are the ones
 * recorded with `text`, pinned as markers that follow edits (PLAN-018 D3,
 * D4). Re-pins after mount and whenever `text` / `bitStarts` change: the
 * parent's effect runs after `MonacoTextArea` has applied the new value.
 */
// @awa-impl: PLAN-018-Step7 (pinned panes)
export const usePinnedScrollSync = (
  text: string,
  bitStarts: readonly number[] | undefined,
): ScrollSyncCallbacks => {
  const ref = useRef<{ markers: BitMarkers; sync: ScrollSyncHandle }>();
  const latest = useRef({ text, bitStarts });
  latest.current = { text, bitStarts };

  const onMount = useCallback((editor: monaco.editor.ICodeEditor) => {
    const markers = attachBitMarkers(editor, () => sync.invalidate());
    const sync = attachScrollSync(editor, 'output', () => markers.bitStarts());
    ref.current = { markers, sync };
    markers.pin(latest.current.text, latest.current.bitStarts);
  }, []);

  const onUnmount = useCallback(() => {
    ref.current?.sync.dispose();
    ref.current?.markers.dispose();
    ref.current = undefined;
  }, []);

  useEffect(() => {
    ref.current?.markers.pin(text, bitStarts);
  }, [text, bitStarts]);

  return { onMount, onUnmount };
};
