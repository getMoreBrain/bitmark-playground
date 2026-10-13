import debounce from 'lodash/debounce';
import type { editor, IDisposable, IRange } from 'monaco-editor';
import { subscribe } from 'valtio';
import { subscribeKey } from 'valtio/utils';

import { findAll, regexError, SearchModel } from './findAll';
import type { HiddenSource } from './hiddenSources';
import type { PaneResult, SearchState } from './searchState';
import { AREA_ORDER, SearchArea, SearchTarget, SearchTargets } from './searchTargets';

/** How long the search waits for typing (in the query or a pane) to pause. */
export const SEARCH_DEBOUNCE_MS = 100;

/** How long a hidden tab's activation waits for its pane to show a match. */
export const ACTIVATION_TIMEOUT_MS = 3000;

/** More than this many matches in a pane: no overview ruler marks (as Monaco's find). */
const OVERVIEW_LIMIT = 1000;

// Monaco's find-match decorations, styled by its find widget CSS (PLAN-024 D7).
const STICKINESS = 1 as editor.TrackedRangeStickiness; // NeverGrowsWhenTypingAtEdges
const OVERVIEW = {
  color: { id: 'editorOverviewRuler.findMatchForeground' },
  position: 2 as editor.OverviewRulerLane, // Center
};
const MATCH: editor.IModelDecorationOptions = {
  stickiness: STICKINESS,
  zIndex: 10,
  className: 'findMatch',
  showIfCollapsed: true,
  overviewRuler: OVERVIEW,
};
const MATCH_NO_OVERVIEW: editor.IModelDecorationOptions = { ...MATCH, overviewRuler: null };
const CURRENT: editor.IModelDecorationOptions = {
  stickiness: STICKINESS,
  zIndex: 13,
  className: 'currentFindMatch',
  showIfCollapsed: true,
  overviewRuler: OVERVIEW,
};

/** A scratch model to count hidden tabs' text with Monaco's own matching. */
export type ScratchModel = SearchModel & Pick<editor.ITextModel, 'setValue'>;

export interface SearchControllerDeps {
  targets: SearchTargets;
  state: SearchState;
  scratchModel: () => ScratchModel;
  hiddenSources: () => readonly HiddenSource[];
  /** Calls back when hidden tabs' text may have changed; returns the unsubscribe. */
  subscribeHidden: (listener: () => void) => () => void;
  debounceMs?: number;
  now?: () => number;
}

export interface SearchController {
  /** Open the bar (and focus it); `query` replaces the current one when given. */
  open(query?: string): void;
  /** Close the bar and clear every highlight; focus goes back to the active pane. */
  close(): void;
  /** Step to the next (1) or previous (-1) match in the active pane. */
  step(direction: 1 | -1): void;
  /** Make a listed pane the active one (a hidden tab is shown first). */
  select(id: string): void;
  /** The focused (else active) pane's selection, when it is on one line. */
  selectionText(): string | undefined;
  /** Run any pending search now. */
  flush(): void;
  dispose(): void;
}

interface Attached {
  readonly target: SearchTarget;
  readonly decorations: editor.IEditorDecorationsCollection;
  readonly disposables: IDisposable[];
  ranges: readonly IRange[];
  capped: boolean;
  current: number;
}

const before = (a: IRange, line: number, column: number) =>
  a.startLineNumber < line || (a.startLineNumber === line && a.startColumn < column);

/**
 * The playground search (PLAN-024): finds the query in every pane on screen,
 * highlights the matches, steps through the active pane's, and (D10) counts
 * the hidden tabs.
 */
export const createSearchController = (deps: SearchControllerDeps): SearchController => {
  const { targets, state, now = Date.now } = deps;
  const attached = new Map<SearchTarget, Attached>();
  const hiddenWatchers = new Map<SearchTarget, IDisposable>();
  let hidden = new Map<string, HiddenSource>();
  /** A hidden tab just shown: reveal its first match once its pane has one. */
  let pending: { area: SearchArea; until: number; armed: boolean } | undefined;

  const refresh = () => {
    sync();
    const { open, query, options, includeHidden } = state;
    if (!open || !query) {
      for (const a of attached.values()) clear(a);
      hidden = new Map();
      state.setError(undefined);
      state.setResults([]);
      return;
    }
    const error = regexError(query, options);
    state.setError(error);
    if (error) {
      for (const a of attached.values()) clear(a);
      state.setResults([]);
      return;
    }

    for (const a of attached.values()) {
      const model = a.target.editor.getModel();
      const result = model ? findAll(model, query, options) : undefined;
      const ranges = result?.ok ? result.ranges : [];
      if (!sameRanges(a.ranges, ranges)) a.current = -1;
      a.ranges = ranges;
      a.capped = result?.ok ? result.capped : false;
      paint(a);
    }

    hidden = new Map();
    const hiddenResults: PaneResult[] = [];
    if (includeHidden) {
      for (const source of deps.hiddenSources()) {
        const scratch = deps.scratchModel();
        scratch.setValue(source.getText());
        const result = findAll(scratch, query, options);
        hidden.set(source.id, source);
        hiddenResults.push({
          id: source.id,
          label: source.label,
          count: result.ok ? result.ranges.length : 0,
          capped: result.ok && result.capped,
          current: -1,
          hidden: true,
        });
      }
    }
    publish(hiddenResults);
    revealPending();
  };

  const schedule = debounce(refresh, deps.debounceMs ?? SEARCH_DEBOUNCE_MS);

  /** Attach to the panes on screen, detach from the ones that left. */
  const sync = () => {
    const live = targets.live();
    for (const [target, a] of attached) {
      if (!live.includes(target)) {
        clear(a);
        a.disposables.forEach((d) => d.dispose());
        attached.delete(target);
      }
    }
    for (const target of live) {
      if (attached.has(target)) continue;
      const { editor: ed } = target;
      const changed = () => {
        if (pending?.area === target.area) pending.armed = true;
        schedule();
      };
      attached.set(target, {
        target,
        decorations: ed.createDecorationsCollection(),
        disposables: [
          ed.onDidChangeModelContent(changed),
          ed.onDidChangeModel(changed),
          ed.onDidFocusEditorText(() => state.setActiveId(target.area)),
        ],
        ranges: [],
        capped: false,
        current: -1,
      });
      // A pane (re)appearing in the area a hidden tab was shown in.
      if (pending?.area === target.area) pending.armed = true;
    }
    // Hidden (mounted) panes: only their text changes matter.
    const hiddenPanes = targets.all().filter((t) => t.hiddenTab);
    for (const [target, d] of hiddenWatchers) {
      if (!hiddenPanes.includes(target)) {
        d.dispose();
        hiddenWatchers.delete(target);
      }
    }
    for (const target of hiddenPanes) {
      if (!hiddenWatchers.has(target)) {
        hiddenWatchers.set(
          target,
          target.editor.onDidChangeModelContent(() => schedule()),
        );
      }
    }
  };

  const clear = (a: Attached) => {
    a.ranges = [];
    a.capped = false;
    a.current = -1;
    a.decorations.clear();
  };

  const paint = (a: Attached) => {
    const match = a.ranges.length > OVERVIEW_LIMIT ? MATCH_NO_OVERVIEW : MATCH;
    a.decorations.set(
      a.ranges.map((range, i) => ({ range, options: i === a.current ? CURRENT : match })),
    );
  };

  /** The attached panes in screen order (a re-registered pane is attached last). */
  const ordered = () =>
    [...attached.values()].sort(
      (a, b) => AREA_ORDER.indexOf(a.target.area) - AREA_ORDER.indexOf(b.target.area),
    );

  const publish = (hiddenResults: readonly PaneResult[]) => {
    const live = ordered().map(
      (a): PaneResult => ({
        id: a.target.area,
        label: a.target.label,
        count: a.ranges.length,
        capped: a.capped,
        current: a.current,
        hidden: false,
      }),
    );
    state.setResults([...live, ...hiddenResults]);
  };

  const active = (): Attached | undefined => {
    const all = [...attached.values()];
    return (
      all.find((a) => a.target.area === state.activeId) ??
      all.find((a) => a.target.area === 'left') ??
      all[0]
    );
  };

  const goTo = (a: Attached, index: number) => {
    a.current = index;
    paint(a);
    const range = a.ranges[index];
    a.target.editor.setSelection(range);
    a.target.editor.revealRangeInCenter(range);
    publish(state.results.filter((r) => r.hidden));
  };

  const revealPending = () => {
    if (!pending) return;
    if (now() > pending.until) {
      pending = undefined;
      return;
    }
    if (!pending.armed) return;
    const a = [...attached.values()].find((x) => x.target.area === pending?.area);
    if (!a || a.ranges.length === 0) return;
    pending = undefined;
    state.setActiveId(a.target.area);
    goTo(a, 0);
  };

  const step = (direction: 1 | -1) => {
    refresh();
    const a = active();
    if (!a || a.ranges.length === 0) return;
    const n = a.ranges.length;
    if (a.current !== -1) {
      goTo(a, (a.current + direction + n) % n);
      return;
    }
    // The first step goes from the cursor, as Monaco's find does.
    const sel = a.target.editor.getSelection();
    const line = direction > 0 ? (sel?.endLineNumber ?? 1) : (sel?.startLineNumber ?? 1);
    const column = direction > 0 ? (sel?.endColumn ?? 1) : (sel?.startColumn ?? 1);
    if (direction > 0) {
      const next = a.ranges.findIndex((r) => !before(r, line, column));
      goTo(a, next === -1 ? 0 : next);
    } else {
      const prev = a.ranges.findLastIndex((r) => before(r, line, column));
      goTo(a, prev === -1 ? n - 1 : prev);
    }
  };

  const unsubscribers = [
    targets.onChange(schedule),
    subscribeKey(state, 'query', schedule),
    subscribeKey(state, 'open', () => refresh()),
    subscribeKey(state, 'includeHidden', schedule),
    subscribe(state.options, schedule),
    deps.subscribeHidden(() => {
      if (state.open && state.includeHidden) schedule();
    }),
  ];

  return {
    open(query) {
      if (query !== undefined) state.setQuery(query);
      state.setOpen(true);
      state.requestFocus();
      schedule();
    },
    close() {
      state.setOpen(false);
      pending = undefined;
      refresh();
      active()?.target.editor.focus();
    },
    step,
    select(id) {
      const source = hidden.get(id);
      if (source) {
        pending = { area: source.area, until: now() + ACTIVATION_TIMEOUT_MS, armed: false };
        source.activate();
        schedule();
        return;
      }
      state.setActiveId(id as SearchArea);
      const a = active();
      if (a && a.current === -1) step(1);
    },
    selectionText() {
      const live = targets.live();
      const target =
        live.find((t) => t.editor.hasTextFocus()) ?? live.find((t) => t.area === state.activeId);
      const sel = target?.editor.getSelection();
      const model = target?.editor.getModel();
      if (!sel || !model) return undefined;
      const empty = sel.startLineNumber === sel.endLineNumber && sel.startColumn === sel.endColumn;
      if (empty || sel.startLineNumber !== sel.endLineNumber) return undefined;
      return model.getValueInRange(sel);
    },
    flush() {
      schedule.cancel();
      refresh();
    },
    dispose() {
      schedule.cancel();
      unsubscribers.forEach((u) => u());
      for (const a of attached.values()) {
        clear(a);
        a.disposables.forEach((d) => d.dispose());
      }
      attached.clear();
      hiddenWatchers.forEach((d) => d.dispose());
      hiddenWatchers.clear();
    },
  };
};

const sameRanges = (a: readonly IRange[], b: readonly IRange[]) =>
  a.length === b.length &&
  a.every(
    (r, i) =>
      r.startLineNumber === b[i].startLineNumber &&
      r.startColumn === b[i].startColumn &&
      r.endLineNumber === b[i].endLineNumber &&
      r.endColumn === b[i].endColumn,
  );
