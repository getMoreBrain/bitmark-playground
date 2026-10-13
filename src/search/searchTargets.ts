import type { editor } from 'monaco-editor';

import type { JsonTabType } from '../state/bitmarkState';

/** Where a pane is on screen; also the order panes are listed in. */
export type SearchArea = 'left' | 'right' | 'bottomLeft' | 'bottomRight';
export const AREA_ORDER: readonly SearchArea[] = ['left', 'right', 'bottomLeft', 'bottomRight'];

/** What the search needs from a Monaco editor. */
export type SearchEditor = Pick<
  editor.ICodeEditor,
  | 'getModel'
  | 'onDidChangeModelContent'
  | 'onDidChangeModel'
  | 'onDidFocusEditorText'
  | 'createDecorationsCollection'
  | 'getSelection'
  | 'setSelection'
  | 'revealRangeInCenter'
  | 'hasTextFocus'
  | 'focus'
>;

export interface SearchTarget {
  readonly area: SearchArea;
  readonly label: string;
  readonly editor: SearchEditor;
  /**
   * Set for a pane that is mounted but not shown (a timed session pane,
   * PLAN-024 D10): searched only as a hidden tab.
   */
  readonly hiddenTab?: JsonTabType;
}

export interface SearchTargets {
  /** Add a target; returns its removal. */
  register(target: SearchTarget): () => void;
  /** The panes on screen, one per area (the latest registered), in area order. */
  live(): readonly SearchTarget[];
  /** The mounted but hidden pane for a tab, if any. */
  hiddenPane(tab: JsonTabType): SearchTarget | undefined;
  /** Every registered target (live and hidden). */
  all(): readonly SearchTarget[];
  onChange(listener: () => void): () => void;
}

/** The editors the search can see, registered by the components that mount them (PLAN-024). */
export const createSearchTargets = (): SearchTargets => {
  const entries: SearchTarget[] = [];
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  return {
    register(target) {
      entries.push(target);
      emit();
      return () => {
        const at = entries.indexOf(target);
        if (at === -1) return;
        entries.splice(at, 1);
        emit();
      };
    },
    live() {
      const byArea = new Map<SearchArea, SearchTarget>();
      for (const t of entries) if (!t.hiddenTab) byArea.set(t.area, t);
      return AREA_ORDER.flatMap((area) => byArea.get(area) ?? []);
    },
    hiddenPane(tab) {
      return entries.findLast((t) => t.hiddenTab === tab);
    },
    all() {
      return [...entries];
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

export const searchTargets = createSearchTargets();
