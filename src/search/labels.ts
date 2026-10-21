import {
  JSON_TAB_LABEL,
  JsonTabType,
  MARKUP_TAB_LABEL,
  MarkupTabType,
} from '../state/bitmarkState';

/** The search's name for a left (bitmark) tab, e.g. "Legacy Bitmark". */
export const bitmarkLabel = (tab: MarkupTabType): string => MARKUP_TAB_LABEL[tab];

/** The search's name for a right-hand tab, e.g. "Legacy JSON", "HTML". */
export const jsonTabLabel = (tab: JsonTabType): string => JSON_TAB_LABEL[tab];
