import * as monaco from 'monaco-editor';
import { subscribe } from 'valtio';

import { bitmarkState } from '../state/bitmarkState';
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
    subscribeHidden: (listener) => subscribe(bitmarkState, listener),
  }));

export { searchState } from './searchState';
export type { SearchArea, SearchEditor } from './searchTargets';
export { useSearchShortcut } from './useSearchShortcut';
export { useSearchTarget } from './useSearchTarget';
