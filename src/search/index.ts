import { createSearchController, type SearchController } from '@gmb/bitmark-editor';
import { subscribe } from 'valtio';

import { bitmarkState } from '../state/bitmarkState';
import { uiState } from '../state/uiState';
import { hiddenSources, shownTabOrder } from './hiddenSources';
import { searchState } from './searchState';
import { SearchArea, searchTargets } from './searchTargets';

let controller: SearchController | undefined;

/**
 * The playground's search (PLAN-024), over the editors its panes register:
 * the package's controller (PLAN-036 D2), given the playground's tabs that
 * are not shown. Created on first use: importing the module starts nothing.
 */
export const getSearchController = (): SearchController =>
  (controller ??= createSearchController({
    targets: searchTargets,
    state: searchState,
    hiddenSources: () => hiddenSources(searchTargets),
    shownTabOrder: (area) => shownTabOrder(area as SearchArea),
    // The tabs follow the state, and the Legacy tabs the settings.
    subscribeHidden: (listener) => {
      const offState = subscribe(bitmarkState, listener);
      const offUi = subscribe(uiState, listener);
      return () => {
        offState();
        offUi();
      };
    },
  }));

export { searchState, useSearchFields, useSearchSnapshot } from './searchState';
export type { SearchArea } from './searchTargets';
export { useSearchShortcut } from './useSearchShortcut';
export { useSearchTarget } from './useSearchTarget';
