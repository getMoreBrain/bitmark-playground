import { JsonTabType, ParserType, TAB_LABEL } from '../state/bitmarkState';

/** The search's name for a left (bitmark) tab, e.g. "WASM bitmark". */
export const bitmarkLabel = (tab: ParserType): string => `${TAB_LABEL[tab]} bitmark`;

const OTHER_JSON_TAB_LABEL: Record<Exclude<JsonTabType, ParserType>, string> = {
  wasmCheck: 'WASM Check',
  tableHtml: 'HTML',
  text: 'Text',
  xmlNiso: 'XML (NISO-IEC)',
  xmlNisoEs: 'XML (NISO-IEC-ES)',
};

/** The search's name for a right-hand tab, e.g. "Original JSON", "HTML". */
export const jsonTabLabel = (tab: JsonTabType): string =>
  tab === 'js' || tab === 'wasm' || tab === 'wasmFull'
    ? `${TAB_LABEL[tab]} JSON`
    : OTHER_JSON_TAB_LABEL[tab];
