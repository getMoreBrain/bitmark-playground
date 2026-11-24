import { createSearchState, type SearchSnapshot } from '@gmb/bitmark-editor';
import { useRef, useSyncExternalStore } from 'react';

import { loadSearchSettings, saveSearchSettings } from './searchSettings';

/**
 * The playground's search state: the package's (PLAN-036 D2), started with
 * the options kept from the last visit and keeping them again as they
 * change (PLAN-024 D11); never the query.
 */
const searchState = createSearchState(loadSearchSettings());
searchState.subscribe((key) => {
  if (key !== 'options' && key !== 'includeHidden') return;
  saveSearchSettings({ ...searchState.options, includeHidden: searchState.includeHidden });
});

/** The search as the bar and the tabs show it: a new object for each change. */
const useSearchSnapshot = (): SearchSnapshot =>
  useSyncExternalStore(searchState.subscribe, searchState.snapshot);

/**
 * The search for a component that reads only `keys` of it (a tab's count):
 * the same object until one of them changes, so a key in the replace input
 * does not draw every count again. `keys` must not change between renders.
 */
const useSearchFields = <K extends keyof SearchSnapshot>(
  keys: readonly K[],
): Pick<SearchSnapshot, K> => {
  const last = useRef<SearchSnapshot>();
  return useSyncExternalStore(searchState.subscribe, () => {
    const next = searchState.snapshot();
    if (last.current && keys.every((key) => last.current![key] === next[key])) return last.current;
    last.current = next;
    return next;
  });
};

export { searchState, useSearchFields, useSearchSnapshot };
