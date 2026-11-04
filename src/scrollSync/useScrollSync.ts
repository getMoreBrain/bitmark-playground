import type { Monaco, SyncView } from '@gmb/bitmark-editor';
import {
  attachBitMarkers,
  BitMarkers,
  createSplitBitStarts,
  liveBitmarkAnchors,
  ScrollSyncMember,
  SplitBitStarts,
} from '@gmb/bitmark-editor';
import { useBitmarkSession } from '@gmb/bitmark-editor/react';
import * as monaco from 'monaco-editor';
import { useCallback, useEffect, useRef } from 'react';

import { useBitmarkParser } from '../services/BitmarkParser';
import { joinScrollSync } from './scrollSync';
import { attachPlaygroundSyncView } from './syncView';

/** Mount / unmount callbacks for a pane; call them from its own. */
export interface ScrollSyncCallbacks {
  onMount(editor: monaco.editor.ICodeEditor): void;
  onUnmount(): void;
}

/**
 * Link a pane that shows bitmark (the bitmark editor). Its bit starts are
 * split from its own text by the engine (PLAN-018 D1, PLAN-023 Step 5),
 * asynchronously. Its anchors are the session's bitmark offsets, moved onto
 * the text being typed until the edit is committed (PLAN-033 D4).
 */
export const useSplitScrollSync = (): ScrollSyncCallbacks => {
  const { engine } = useBitmarkParser();
  const engineRef = useRef(engine);
  engineRef.current = engine;
  const session = useBitmarkSession();
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const ref = useRef<{ split: SplitBitStarts; member: ScrollSyncMember; view: SyncView }>();

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
    const anchors = liveBitmarkAnchors(
      () => editor.getModel()?.getVersionId() ?? -1,
      () => editor.getValue(),
      // Before the session exists, the text is its own committed bitmark.
      () => sessionRef.current?.getBitmark() ?? editor.getValue(),
    );
    const view = attachPlaygroundSyncView(editor, editor.getContainerDomNode());
    const member = (link.member = joinScrollSync(editor, () => split.bitStarts(), {
      anchors: () => anchors,
      onSyncLine: view.onSyncLine,
      onMatch: view.onMatch,
    }));
    ref.current = { split, member, view };
  }, []);

  const onUnmount = useCallback(() => {
    ref.current?.member.dispose();
    ref.current?.split.dispose();
    ref.current?.view.dispose();
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
  const ref = useRef<{ markers: BitMarkers; member: ScrollSyncMember; view: SyncView }>();
  const latest = useRef({ text, bitStarts });
  latest.current = { text, bitStarts };

  const onMount = useCallback((editor: monaco.editor.ICodeEditor) => {
    // The markers report to the member, which joins after them.
    const link: { member?: ScrollSyncMember } = {};
    const markers = attachBitMarkers(monaco as unknown as Monaco, editor, () =>
      link.member?.invalidate(),
    );
    // No anchors (the legacy parser has none): it links by bit.
    const view = attachPlaygroundSyncView(editor, editor.getContainerDomNode());
    const member = (link.member = joinScrollSync(editor, () => markers.bitStarts(), {
      onSyncLine: view.onSyncLine,
      onMatch: view.onMatch,
    }));
    ref.current = { markers, member, view };
    markers.pin(latest.current.text, latest.current.bitStarts);
  }, []);

  const onUnmount = useCallback(() => {
    ref.current?.member.dispose();
    ref.current?.markers.dispose();
    ref.current?.view.dispose();
    ref.current = undefined;
  }, []);

  useEffect(() => {
    ref.current?.markers.pin(text, bitStarts);
  }, [text, bitStarts]);

  return { onMount, onUnmount };
};
