import { bitmarkState, jsonTabs, JsonTabType, markupTabs, tabParser } from '../state/bitmarkState';
import { uiState } from '../state/uiState';
import { bitmarkLabel, jsonTabLabel } from './labels';
import type { SearchTargets } from './searchTargets';

/** A top-pane tab that is not shown, searched as text (PLAN-024 D10). */
export interface HiddenSource {
  readonly id: string;
  readonly label: string;
  readonly area: 'left' | 'right';
  getText(): string;
  /** Show the tab. */
  activate(): void;
}

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
          getText,
          activate: () => state.setActiveJsonTab(tab),
        },
      ];
    });
  return [...left, ...right];
};
