import * as monaco from 'monaco-editor';
import { subscribe } from 'valtio';

import { bitmarkState } from '../state/bitmarkState';
import { uiState } from '../state/uiState';
import { hiddenSources } from './hiddenSources';
import { createSearchController, ScratchModel, SearchController } from './searchController';
import { searchState } from './searchState';
import { searchTargets } from './searchTargets';

let scratch: ScratchModel | undefined;
let controller: SearchController | undefined;

/**
 * The playground's search (PLAN-024), over the editors its panes register.
 * Created on first use: importing the module starts nothing.
 */
export const getSearchController = (): SearchController =>
  (controller ??= createSearchController({
    targets: searchTargets,
    state: searchState,
    // Created on first use, only when hidden tabs are searched.
    scratchModel: () => (scratch ??= monaco.editor.createModel('', 'plaintext')),
    hiddenSources: () => hiddenSources(searchTargets),
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

export { searchState } from './searchState';
export type { SearchArea, SearchEditor } from './searchTargets';
export { useSearchShortcut } from './useSearchShortcut';
export { useSearchTarget } from './useSearchTarget';
