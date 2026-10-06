import type { Monaco } from '@gmb/bitmark-editor';
import {
  attachBitMarkers,
  BitMarkers,
  createSplitBitStarts,
  ScrollSyncMember,
  SplitBitStarts,
} from '@gmb/bitmark-editor';
import * as monaco from 'monaco-editor';
import { useCallback, useEffect, useRef } from 'react';

import { useBitmarkParser } from '../services/BitmarkParser';
import { joinScrollSync } from './scrollSync';

/** Mount / unmount callbacks for a pane; call them from its own. */
export interface ScrollSyncCallbacks {
  onMount(editor: monaco.editor.ICodeEditor): void;
  onUnmount(): void;
}

/**
 * Link a pane that shows bitmark (the bitmark editor, WASM Check). Its bit
 * starts are split from its own text by the engine (PLAN-018 D1, PLAN-023
 * Step 5), asynchronously.
 */
export const useSplitScrollSync = (): ScrollSyncCallbacks => {
  const { engine } = useBitmarkParser();
  const engineRef = useRef(engine);
  engineRef.current = engine;
  const ref = useRef<{ split: SplitBitStarts; member: ScrollSyncMember }>();

  useEffect(() => {
    ref.current?.split.refresh();
  }, [engine]);

  const onMount = useCallback((editor: monaco.editor.ICodeEditor) => {
    // The split reports to the member, which joins after it.
    const link: { member?: ScrollSyncMember } = {};
    const split = createSplitBitStarts(
      editor,
      () => engineRef.current,
      () => link.member?.invalidate(),
    );
    const member = (link.member = joinScrollSync(editor, () => split.bitStarts()));
    ref.current = { split, member };
  }, []);

  const onUnmount = useCallback(() => {
    ref.current?.member.dispose();
    ref.current?.split.dispose();
    ref.current = undefined;
  }, []);

  return { onMount, onUnmount };
};

/**
 * Link an output pane (JSON, HTML, XML, Text). Its bit starts are the ones
 * recorded with `text`, pinned as markers that follow edits (PLAN-018 D3,
 * D4). Re-pins after mount and whenever `text` / `bitStarts` change: the
 * parent's effect runs after `MonacoTextArea` has applied the new value.
 */
export const usePinnedScrollSync = (
  text: string,
  bitStarts: readonly number[] | undefined,
): ScrollSyncCallbacks => {
  const ref = useRef<{ markers: BitMarkers; member: ScrollSyncMember }>();
  const latest = useRef({ text, bitStarts });
  latest.current = { text, bitStarts };

  const onMount = useCallback((editor: monaco.editor.ICodeEditor) => {
    // The markers report to the member, which joins after them.
    const link: { member?: ScrollSyncMember } = {};
    const markers = attachBitMarkers(monaco as unknown as Monaco, editor, () =>
      link.member?.invalidate(),
    );
    const member = (link.member = joinScrollSync(editor, () => markers.bitStarts()));
    ref.current = { markers, member };
    markers.pin(latest.current.text, latest.current.bitStarts);
  }, []);

  const onUnmount = useCallback(() => {
    ref.current?.member.dispose();
    ref.current?.markers.dispose();
    ref.current = undefined;
  }, []);

  useEffect(() => {
    ref.current?.markers.pin(text, bitStarts);
  }, [text, bitStarts]);

  return { onMount, onUnmount };
};
