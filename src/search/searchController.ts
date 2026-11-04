import debounce from 'lodash/debounce';
import type { editor, IDisposable, IRange } from 'monaco-editor';
import { subscribe } from 'valtio';
import { subscribeKey } from 'valtio/utils';

import { findAll, regexError, SearchModel } from './findAll';
import type { HiddenSource } from './hiddenSources';
import { replacements } from './replace';
import type { PaneResult, SearchField, SearchState } from './searchState';
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
  /** Where the tab shown in a panel is in its tab bar (PLAN-034 D8); 0 by default. */
  shownTabOrder?: (area: SearchArea) => number;
  debounceMs?: number;
  now?: () => number;
}

export interface SearchController {
  /**
   * Start searching and focus `field` (the search input by default; the
   * replace input shows the replace row); `query` replaces the current one.
   */
  open(query?: string, field?: SearchField): void;
  /** Stop searching and clear every highlight; focus goes back to the active pane. */
  close(): void;
  /**
   * Step to the next (1) or previous (-1) match in the active pane; past its
   * end, on to the next pane with matches in tab order (PLAN-034 D8).
   */
  step(direction: 1 | -1): void;
  /**
   * Replace the active pane's current match and step to the next; with no
   * current match, only step to one (as Monaco's Replace, PLAN-034 D4).
   */
  replace(): void;
  /** Replace every match in the active pane, as one undo step (PLAN-034 D4). */
  replaceAll(): void;
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

const readOnly = (target: SearchTarget) => !!target.editor.getRawOptions().readOnly;

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
  let pending: { area: SearchArea; until: number; armed: boolean; last?: boolean } | undefined;

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
          readOnly: true,
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
        readOnly: readOnly(a.target),
      }),
    );
    state.setResults([...live, ...hiddenResults]);
  };

  const active = (): Attached | undefined => {
    const all = [...attached.values()];
    return (
      all.find((a) => a.target.area === state.activeId) ??
      all.find((a) => a.target.area === 'left') ??
      ordered()[0]
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
    const last = pending.last;
    pending = undefined;
    state.setActiveId(a.target.area);
    goTo(a, last ? a.ranges.length - 1 : 0);
  };

  /** Show a hidden tab, then reveal its first (or last) match once its pane has one. */
  const showHidden = (source: HiddenSource, last = false) => {
    pending = { area: source.area, until: now() + ACTIVATION_TIMEOUT_MS, armed: false, last };
    source.activate();
    schedule();
  };

  /**
   * The next match in `a` from its current match, or from the cursor on the
   * first step (as Monaco's find); undefined past the pane's end.
   */
  const nextIndex = (a: Attached, direction: 1 | -1): number | undefined => {
    const n = a.ranges.length;
    if (n === 0) return undefined;
    if (a.current !== -1) {
      const i = a.current + direction;
      return i >= 0 && i < n ? i : undefined;
    }
    const sel = a.target.editor.getSelection();
    const line = direction > 0 ? (sel?.endLineNumber ?? 1) : (sel?.startLineNumber ?? 1);
    const column = direction > 0 ? (sel?.endColumn ?? 1) : (sel?.startColumn ?? 1);
    const i =
      direction > 0
        ? a.ranges.findIndex((r) => !before(r, line, column))
        : a.ranges.findLastIndex((r) => before(r, line, column));
    return i === -1 ? undefined : i;
  };

  /** The first match in `direction`: the pane's first, or its last going back. */
  const edge = (a: Attached, direction: 1 | -1) => (direction > 0 ? 0 : a.ranges.length - 1);

  /** Step within one pane, wrapping at its ends. */
  const stepWithin = (a: Attached, direction: 1 | -1) => {
    if (a.ranges.length === 0) return;
    goTo(a, nextIndex(a, direction) ?? edge(a, direction));
  };

  type Stop = { live: Attached } | { hidden: HiddenSource };

  /**
   * The panes with matches, and the active one, in tab order (PLAN-034 D8):
   * the panels in screen order, then each panel's tabs; hidden tabs only
   * while they are counted.
   */
  const stops = (current: Attached): Stop[] => {
    const shownOrder = deps.shownTabOrder ?? (() => 0);
    const keyed: { stop: Stop; key: [number, number] }[] = [];
    for (const a of attached.values()) {
      if (a !== current && a.ranges.length === 0) continue;
      const area = a.target.area;
      keyed.push({ stop: { live: a }, key: [AREA_ORDER.indexOf(area), shownOrder(area)] });
    }
    for (const r of state.results) {
      const source = r.hidden && r.count > 0 ? hidden.get(r.id) : undefined;
      if (!source) continue;
      keyed.push({
        stop: { hidden: source },
        key: [AREA_ORDER.indexOf(source.area), source.order],
      });
    }
    keyed.sort((x, y) => x.key[0] - y.key[0] || x.key[1] - y.key[1]);
    return keyed.map((k) => k.stop);
  };

  /** Past a pane's end, on to the next pane with matches in tab order, round to the first. */
  const step = (direction: 1 | -1) => {
    refresh();
    const a = active();
    if (!a) return;
    const i = nextIndex(a, direction);
    if (i !== undefined) {
      goTo(a, i);
      return;
    }
    const list = stops(a);
    const at = list.findIndex((x) => 'live' in x && x.live === a);
    const next = list[(at + direction + list.length) % list.length];
    if (!next || ('live' in next && next.live === a)) {
      stepWithin(a, direction);
      return;
    }
    // Leaving the pane: its current match is no longer the current one.
    a.current = -1;
    paint(a);
    if ('live' in next) {
      state.setActiveId(next.live.target.area);
      next.live.current = -1;
      goTo(next.live, edge(next.live, direction));
    } else {
      publish(state.results.filter((r) => r.hidden));
      showHidden(next.hidden, direction < 0);
    }
  };

  /** Apply `edits` to the active pane as one undo step, and search it again. */
  const edit = (a: Attached, edits: ReturnType<typeof replacements>) => {
    const ed = a.target.editor;
    ed.pushUndoStop();
    ed.executeEdits(
      'search',
      edits.map((r) => ({ range: r.range, text: r.text, forceMoveMarkers: true })),
    );
    ed.pushUndoStop();
    refresh();
  };

  /** The active pane, when it can be replaced in. */
  const editable = (): Attached | undefined => {
    refresh();
    const a = active();
    return a && !readOnly(a.target) && a.ranges.length > 0 ? a : undefined;
  };

  const replace = () => {
    const a = editable();
    if (!a) return;
    const range = a.ranges[a.current];
    const sel = a.target.editor.getSelection();
    const model = a.target.editor.getModel();
    // Replace stays in its pane (PLAN-034 D4): the panes regenerate one another.
    if (!range || !sel || !model || !sameRanges([range], [sel])) {
      stepWithin(a, 1);
      return;
    }
    const { query, options } = state;
    const match = replacements(model, query, options, state.replace).find((r) =>
      sameRanges([r.range], [range]),
    );
    if (!match) {
      stepWithin(a, 1);
      return;
    }
    edit(a, [match]);
    // On to the next match after the replacement (wrapping), as `step` from the cursor.
    const lines = match.text.split('\n');
    const line = range.startLineNumber + lines.length - 1;
    const column = (lines.length === 1 ? range.startColumn : 1) + lines[lines.length - 1].length;
    a.current = -1;
    a.target.editor.setSelection({
      startLineNumber: line,
      startColumn: column,
      endLineNumber: line,
      endColumn: column,
    });
    refresh();
    stepWithin(a, 1);
  };

  const replaceAll = () => {
    const a = editable();
    const model = a?.target.editor.getModel();
    if (!a || !model) return;
    const edits = replacements(model, state.query, state.options, state.replace);
    if (edits.length > 0) edit(a, edits);
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
    open(query, field = 'search') {
      if (query !== undefined) state.setQuery(query);
      if (field === 'replace') state.setShowReplace(true);
      state.setOpen(true);
      state.requestFocus(field);
      schedule();
    },
    close() {
      state.setOpen(false);
      pending = undefined;
      refresh();
      active()?.target.editor.focus();
    },
    step,
    replace,
    replaceAll,
    select(id) {
      const source = hidden.get(id);
      if (source) {
        showHidden(source);
        return;
      }
      state.setActiveId(id as SearchArea);
      const a = active();
      if (a && a.current === -1) stepWithin(a, 1);
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
