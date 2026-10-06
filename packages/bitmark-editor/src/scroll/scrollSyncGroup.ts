// @awa-component: PLAN-023-ScrollSyncGroup
import type * as MonacoApi from 'monaco-editor';

import { mapScrollTop, ScrollGeometry } from './mapScrollTop';

/** The part of a Monaco editor the group uses. */
export type ScrollSyncEditor = Pick<
  MonacoApi.editor.ICodeEditor,
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

/** One pane in a scroll group. */
export interface ScrollSyncMember extends MonacoApi.IDisposable {
  /** The pane's bit starts changed without a content change (markers pinned, a split landed). */
  invalidate(): void;
  /** Take part in the linking (true) or scroll alone (false). Joining follows the leader. */
  setLinked(linked: boolean): void;
  readonly linked: boolean;
}

export interface ScrollSyncGroup {
  /**
   * Add an editor. `bitStarts` gives its current bit starts (UTF-16
   * offsets). A member that joins linked follows the current leader, so a
   * tab switch lands on the matching bit.
   */
  join(
    editor: ScrollSyncEditor,
    bitStarts: () => readonly number[],
    options?: { linked?: boolean },
  ): ScrollSyncMember;
  /** The current members, in join order. */
  members(): readonly ScrollSyncMember[];
}

interface Pane {
  readonly member: ScrollSyncMember;
  readonly editor: ScrollSyncEditor;
  readonly bitStarts: () => readonly number[];
  linked: boolean;
  /** Pixel top of each bit, dropped whenever content or layout changes. */
  tops: number[] | undefined;
}

/**
 * Link the scrolling of any number of panes by bit (PLAN-022 D9,
 * generalising PLAN-018 from two slots):
 * - the member the user scrolls leads; every other linked member follows,
 *   keeping the same bit at its top;
 * - the group's own scrolls of followers are not taken as the user's (echo
 *   suppression; Monaco reports `setScrollTop` synchronously);
 * - after a content, marker or layout change the focused member leads, and
 *   the others re-sync;
 * - with no leader yet, the first linked member leads.
 */
// @awa-impl: PLAN-023-Step5 (the N-way scroll group)
export const createScrollSyncGroup = (): ScrollSyncGroup => {
  const panes: Pane[] = [];
  let leader: Pane | undefined;
  let syncing = false;

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

  const linked = () => panes.filter((p) => p.linked);
  const currentLeader = (): Pane | undefined => {
    if (leader && leader.linked && panes.includes(leader)) return leader;
    leader = linked()[0];
    return leader;
  };

  /** Scroll `targets` (default: every linked follower) to match the leader. */
  const follow = (targets?: Pane[]): void => {
    const src = currentLeader();
    if (!src) return;
    const srcGeometry = geometry(src);
    const top = src.editor.getScrollTop();
    syncing = true;
    try {
      for (const dst of targets ?? linked()) {
        if (dst === src || !dst.linked) continue;
        dst.editor.setScrollTop(mapScrollTop(srcGeometry, geometry(dst), top));
      }
    } finally {
      syncing = false;
    }
  };

  /** A member's positions are stale. The focused member leads; the others follow. */
  const refresh = (pane: Pane): void => {
    pane.tops = undefined;
    if (!pane.linked) return;
    const focused = linked().find((p) => p.editor.hasTextFocus());
    if (focused) leader = focused;
    else if (leader === pane && linked().length > 1) leader = linked().find((p) => p !== pane);
    follow();
  };

  const join: ScrollSyncGroup['join'] = (editor, bitStarts, options) => {
    const listeners: MonacoApi.IDisposable[] = [];
    const member: ScrollSyncMember = {
      get linked() {
        return pane.linked;
      },
      invalidate: () => refresh(pane),
      setLinked: (next) => {
        if (next === pane.linked) return;
        pane.linked = next;
        if (next) follow([pane]);
        else if (leader === pane) leader = undefined;
      },
      dispose: () => {
        for (const l of listeners) l.dispose();
        const i = panes.indexOf(pane);
        if (i !== -1) panes.splice(i, 1);
        if (leader === pane) leader = undefined;
      },
    };
    const pane: Pane = {
      member,
      editor,
      bitStarts,
      linked: options?.linked ?? true,
      tops: undefined,
    };
    panes.push(pane);

    listeners.push(
      editor.onDidScrollChange((e) => {
        if (!e.scrollTopChanged || syncing || !pane.linked) return;
        // A scroll that comes with a height change is Monaco clamping after
        // a content change, not the user.
        if (e.scrollHeightChanged) {
          refresh(pane);
          return;
        }
        leader = pane;
        follow();
      }),
      editor.onDidChangeModelContent(() => refresh(pane)),
      editor.onDidContentSizeChange(() => refresh(pane)),
      editor.onDidLayoutChange(() => refresh(pane)),
    );

    if (pane.linked) follow([pane]);
    return member;
  };

  return { join, members: () => panes.map((p) => p.member) };
};
