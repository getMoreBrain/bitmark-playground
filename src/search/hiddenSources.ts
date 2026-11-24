import type { HiddenSource, SearchTargets } from '@gmb/bitmark-editor';

import {
  bitmarkState,
  jsonTabs,
  JsonTabType,
  markupTabs,
  MarkupTabType,
  tabParser,
} from '../state/bitmarkState';
import { uiState } from '../state/uiState';
import { bitmarkLabel, jsonTabLabel } from './labels';
import type { SearchArea } from './searchTargets';

type State = Pick<
  typeof bitmarkState,
  'activeMarkupTab' | 'activeJsonTab' | 'js' | 'wasm' | 'setActiveMarkupTab' | 'setActiveJsonTab'
>;

/**
 * Where a hidden right-hand tab's text comes from. A mounted but hidden
 * session pane (HTML, Text, XML) gives its own model's text; every other tab
 * gives the playground state's text, which for the JSON tab may be
 * formatted differently from what its pane will show.
 */
const jsonTabText = (
  tab: JsonTabType,
  state: State,
  targets: SearchTargets,
): (() => string) | undefined => {
  switch (tab) {
    case 'legacy':
      // As the Legacy JSON editor shows it.
      return () => state.js.jsonErrorAsString ?? state.js.jsonAsString;
    case 'json':
      return () => state.wasm.jsonAsString;
    default: {
      const pane = targets.hiddenPane(tab);
      return pane ? () => pane.editor.getModel()?.getValue() ?? '' : undefined;
    }
  }
};

/**
 * A tab's place in its panel's tab bar, whichever tabs are on screen
 * (PLAN-034 D8): the order every tab bar keeps.
 */
export const tabOrder = (area: 'left' | 'right', tab: string): number =>
  area === 'left'
    ? markupTabs(true).indexOf(tab as MarkupTabType)
    : jsonTabs(true, true).indexOf(tab as JsonTabType);

/** Where the tab shown in a panel is in its tab bar; 0 for a panel without tabs to step. */
export const shownTabOrder = (area: SearchArea, state: State = bitmarkState): number =>
  area === 'left'
    ? tabOrder('left', state.activeMarkupTab)
    : area === 'right'
      ? tabOrder('right', state.activeJsonTab)
      : 0;

/** The top panes' tabs that are not shown, in tab order; only tabs in a tab bar. */
export const hiddenSources = (
  targets: SearchTargets,
  state: State = bitmarkState,
  showLegacy: boolean = uiState.showLegacy,
): HiddenSource[] => {
  const left = markupTabs(showLegacy)
    .filter((tab) => tab !== state.activeMarkupTab)
    .map((tab): HiddenSource => {
      const slice = state[tabParser(tab)];
      return {
        id: `hidden:left:${tab}`,
        label: bitmarkLabel(tab),
        area: 'left',
        order: tabOrder('left', tab),
        getText: () => slice.markupErrorAsString ?? slice.markup,
        activate: () => state.setActiveMarkupTab(tab),
      };
    });
  const right = jsonTabs(showLegacy)
    .filter((tab) => tab !== state.activeJsonTab)
    .flatMap((tab): HiddenSource[] => {
      const getText = jsonTabText(tab, state, targets);
      if (!getText) return [];
      return [
        {
          id: `hidden:right:${tab}`,
          label: jsonTabLabel(tab),
          area: 'right',
          order: tabOrder('right', tab),
          getText,
          activate: () => state.setActiveJsonTab(tab),
        },
      ];
    });
  return [...left, ...right];
};
