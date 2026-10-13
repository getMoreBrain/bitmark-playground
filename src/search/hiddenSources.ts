import { bitmarkState, JsonTabType, ParserType } from '../state/bitmarkState';
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

const MARKUP_TABS: readonly ParserType[] = ['js', 'wasm', 'wasmFull'];
const JSON_TABS: readonly JsonTabType[] = [
  'js',
  'wasm',
  'wasmFull',
  'wasmCheck',
  'tableHtml',
  'text',
  'xmlNiso',
  'xmlNisoEs',
];

type State = Pick<
  typeof bitmarkState,
  | 'activeMarkupTab'
  | 'activeJsonTab'
  | 'js'
  | 'wasm'
  | 'wasmFull'
  | 'wasmCheck'
  | 'setActiveMarkupTab'
  | 'setActiveJsonTab'
>;

/**
 * Where a hidden right-hand tab's text comes from. A mounted but hidden
 * session pane (HTML, Text, XML) gives its own model's text; every other tab
 * gives the playground state's text, which for a WASM JSON tab may be
 * formatted differently from what its pane will show.
 */
const jsonTabText = (
  tab: JsonTabType,
  state: State,
  targets: SearchTargets,
): (() => string) | undefined => {
  switch (tab) {
    case 'js':
      // As the Original JSON editor shows it.
      return () => state.js.jsonErrorAsString ?? state.js.jsonAsString;
    case 'wasm':
    case 'wasmFull':
      return () => state[tab].jsonAsString;
    case 'wasmCheck':
      return () => state.wasmCheck.markupErrorAsString ?? state.wasmCheck.markup;
    default: {
      const pane = targets.hiddenPane(tab);
      return pane ? () => pane.editor.getModel()?.getValue() ?? '' : undefined;
    }
  }
};

/** The top panes' tabs that are not shown, in tab order. */
export const hiddenSources = (
  targets: SearchTargets,
  state: State = bitmarkState,
): HiddenSource[] => {
  const left = MARKUP_TABS.filter((tab) => tab !== state.activeMarkupTab).map(
    (tab): HiddenSource => ({
      id: `hidden:left:${tab}`,
      label: bitmarkLabel(tab),
      area: 'left',
      getText: () => state[tab].markupErrorAsString ?? state[tab].markup,
      activate: () => state.setActiveMarkupTab(tab),
    }),
  );
  const right = JSON_TABS.filter((tab) => tab !== state.activeJsonTab).flatMap(
    (tab): HiddenSource[] => {
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
    },
  );
  return [...left, ...right];
};
