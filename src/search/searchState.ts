import { proxy } from 'valtio';

import { Writable } from '../utils/TypeScriptUtils';
import type { SearchOptions } from './findAll';
import { loadSearchSettings, saveSearchSettings } from './searchSettings';
import type { SearchArea } from './searchTargets';

/** One pane's matches, for the search bar. */
export interface PaneResult {
  /** The area of a pane on screen, or a hidden source's id. */
  readonly id: string;
  readonly label: string;
  readonly count: number;
  /** More matches than were counted (`MATCH_CAP`). */
  readonly capped: boolean;
  /** The current match (0-based), or -1 before the first step. */
  readonly current: number;
  /** A hidden tab (PLAN-024 D10): counted, not highlighted. */
  readonly hidden: boolean;
  /** A pane that cannot be edited: nothing to replace (PLAN-034 D5). */
  readonly readOnly: boolean;
}

/**
 * The pane Next/Previous and Replace act on, as the controller picks it: the
 * chosen pane while on screen, else the bitmark pane, else the first.
 */
export const activePaneId = (
  results: readonly PaneResult[],
  activeId: string | undefined,
): string | undefined => {
  const live = results.filter((r) => !r.hidden);
  return (
    live.find((r) => r.id === activeId)?.id ?? live.find((r) => r.id === 'left')?.id ?? live[0]?.id
  );
};

/** The result id of a tab: its area while shown, else its hidden-tab id (PLAN-024 D10). */
export const tabResultId = (area: string, tab: string, shown: boolean): string =>
  shown ? area : `hidden:${area}:${tab}`;

/** The bar's two inputs. */
export type SearchField = 'search' | 'replace';

/** A pane's count for the bar: "7", "2/7", "10000+". */
export const countText = (r: PaneResult): string => {
  const count = `${r.count}${r.capped ? '+' : ''}`;
  return r.current === -1 ? count : `${r.current + 1}/${count}`;
};

export interface SearchState {
  /** Highlighting and counting (the bar itself is always shown, PLAN-034 D1). */
  readonly open: boolean;
  readonly query: string;
  /** The replace input's text (PLAN-034 D3); never persisted. */
  readonly replace: string;
  /** The replace row is shown. */
  readonly showReplace: boolean;
  readonly options: SearchOptions;
  readonly includeHidden: boolean;
  /** An invalid regex's message. */
  readonly error: string | undefined;
  /** The pane Next/Previous step through (PLAN-024 D3). */
  readonly activeId: SearchArea | undefined;
  readonly results: readonly PaneResult[];
  /** Bumped to ask the search bar to focus `focusField`. */
  readonly focusRequests: number;
  readonly focusField: SearchField;

  setOpen(open: boolean): void;
  setQuery(query: string): void;
  setReplace(replace: string): void;
  setShowReplace(show: boolean): void;
  toggleOption(option: keyof SearchOptions): void;
  setIncludeHidden(value: boolean): void;
  setError(error: string | undefined): void;
  setActiveId(id: SearchArea | undefined): void;
  setResults(results: readonly PaneResult[]): void;
  requestFocus(field?: SearchField): void;
}

const stored = loadSearchSettings();

const save = () =>
  saveSearchSettings({ ...searchState.options, includeHidden: searchState.includeHidden });

const searchState = proxy<SearchState>({
  open: false,
  query: '',
  replace: '',
  showReplace: false,
  options: { matchCase: stored.matchCase, wholeWord: stored.wholeWord, regex: stored.regex },
  includeHidden: stored.includeHidden,
  error: undefined,
  activeId: undefined,
  results: [],
  focusRequests: 0,
  focusField: 'search',

  setOpen(open: boolean) {
    (searchState as Writable<SearchState>).open = open;
  },

  setQuery(query: string) {
    (searchState as Writable<SearchState>).query = query;
  },

  setReplace(replace: string) {
    (searchState as Writable<SearchState>).replace = replace;
  },

  setShowReplace(show: boolean) {
    (searchState as Writable<SearchState>).showReplace = show;
  },

  toggleOption(option: keyof SearchOptions) {
    const options = searchState.options as Writable<SearchOptions>;
    options[option] = !options[option];
    save();
  },

  setIncludeHidden(value: boolean) {
    (searchState as Writable<SearchState>).includeHidden = value;
    save();
  },

  setError(error: string | undefined) {
    (searchState as Writable<SearchState>).error = error;
  },

  setActiveId(id: SearchArea | undefined) {
    (searchState as Writable<SearchState>).activeId = id;
  },

  setResults(results: readonly PaneResult[]) {
    (searchState as Writable<SearchState>).results = results;
  },

  requestFocus(field: SearchField = 'search') {
    (searchState as Writable<SearchState>).focusField = field;
    (searchState as Writable<SearchState>).focusRequests++;
  },
});

export { searchState };
