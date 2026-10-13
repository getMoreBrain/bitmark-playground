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
}

/** A pane's count for the bar: "7", "2/7", "10000+". */
export const countText = (r: PaneResult): string => {
  const count = `${r.count}${r.capped ? '+' : ''}`;
  return r.current === -1 ? count : `${r.current + 1}/${count}`;
};

export interface SearchState {
  readonly open: boolean;
  readonly query: string;
  readonly options: SearchOptions;
  readonly includeHidden: boolean;
  /** An invalid regex's message. */
  readonly error: string | undefined;
  /** The pane Next/Previous step through (PLAN-024 D3). */
  readonly activeId: SearchArea | undefined;
  readonly results: readonly PaneResult[];
  /** Bumped to ask the search bar to focus its input. */
  readonly focusRequests: number;

  setOpen(open: boolean): void;
  setQuery(query: string): void;
  toggleOption(option: keyof SearchOptions): void;
  setIncludeHidden(value: boolean): void;
  setError(error: string | undefined): void;
  setActiveId(id: SearchArea | undefined): void;
  setResults(results: readonly PaneResult[]): void;
  requestFocus(): void;
}

const stored = loadSearchSettings();

const save = () =>
  saveSearchSettings({ ...searchState.options, includeHidden: searchState.includeHidden });

const searchState = proxy<SearchState>({
  open: false,
  query: '',
  options: { matchCase: stored.matchCase, wholeWord: stored.wholeWord, regex: stored.regex },
  includeHidden: stored.includeHidden,
  error: undefined,
  activeId: undefined,
  results: [],
  focusRequests: 0,

  setOpen(open: boolean) {
    (searchState as Writable<SearchState>).open = open;
  },

  setQuery(query: string) {
    (searchState as Writable<SearchState>).query = query;
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

  requestFocus() {
    (searchState as Writable<SearchState>).focusRequests++;
  },
});

export { searchState };
