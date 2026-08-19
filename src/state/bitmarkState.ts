// @awa-component: PLAN-002-BitmarkState
// @awa-component: PLAN-008-BitmarkState
// @awa-component: PLAN-011-BitmarkState
import type { BitWrapperJson } from '@gmb/bitmark-parser-generator';
import { proxy } from 'valtio';

import { loadSettings } from '../services/settingsStorage';
import { Writable } from '../utils/TypeScriptUtils';

export type ParserType = 'js' | 'wasm' | 'wasmFull';

/** Display names for the parser tabs, matching the tab bar. */
export const TAB_LABEL: Record<ParserType, string> = {
  js: 'Original',
  wasm: 'WASM',
  wasmFull: 'WASM (full)',
};
/** Tab id for the JSON parser tab bar — adds the round-trip, HTML-table, text and XML views. */
export type JsonTabType = ParserType | 'wasmCheck' | 'tableHtml' | 'text' | XmlVariant;
/**
 * XML mapping variants. Each is its own JSON-side tab and its own state slice;
 * they differ only by the config mapping id passed to the parser's `convert`.
 */
export type XmlVariant = 'xmlNiso' | 'xmlNisoEs';

export interface ParserSlice {
  readonly markup: string;
  readonly markupError: Error | undefined;
  readonly markupErrorAsString: string | undefined;
  readonly markupDurationSec: number | undefined;
  readonly markupUpdates: number;
  readonly json: BitWrapperJson[];
  readonly jsonAsString: string;
  readonly jsonError: Error | undefined;
  readonly jsonErrorAsString: string | undefined;
  readonly jsonDurationSec: number | undefined;
  readonly jsonUpdates: number;
  readonly lexerOutput: string;
}

export interface WasmCheckSlice {
  readonly markup: string;
  readonly markupError: Error | undefined;
  readonly markupErrorAsString: string | undefined;
  readonly markupDurationSec: number | undefined;
  readonly markupUpdates: number;
}

// @awa-component: PLAN-012-JsRoundTripSlice
/**
 * The Original (bpg) JSON after a full round trip through bpg
 * (`json -> bitmark -> json`). Used as the WASM Check LED reference, so the Rust
 * parser is not penalised for fields bpg itself cannot express in markup.
 */
export interface JsRoundTripSlice {
  readonly json: BitWrapperJson[];
  /** The `js.jsonAsString` this round trip was computed from (staleness guard). */
  readonly sourceJsonAsString: string;
  readonly error: Error | undefined;
  readonly durationSec: number | undefined;
  readonly updates: number;
}

// @awa-component: PLAN-007-TableHtmlSlice
export interface TableHtmlSlice {
  readonly html: string;
  readonly htmlError: Error | undefined;
  readonly htmlErrorAsString: string | undefined;
  readonly htmlDurationSec: number | undefined;
  readonly htmlUpdates: number;
}

// @awa-component: PLAN-011-TextSlice
export interface TextSlice {
  readonly text: string;
  readonly textError: Error | undefined;
  readonly textErrorAsString: string | undefined;
  readonly textDurationSec: number | undefined;
  readonly textUpdates: number;
}

// @awa-component: PLAN-013-XmlSlice
export interface XmlSlice {
  readonly xml: string;
  readonly xmlError: Error | undefined;
  readonly xmlErrorAsString: string | undefined;
  readonly xmlDurationSec: number | undefined;
  readonly xmlUpdates: number;
}

// @awa-component: PLAN-014-LastEditSlice
/**
 * The window the user last edited — the input to the mapping report.
 *
 * Recorded at the UI entry points (the editors' `onInput`), NOT inside the
 * converter: the converter is also driven programmatically by the XML/HTML
 * panels, which would otherwise masquerade as bitmark edits.
 */
export interface LastEditSlice {
  /** Parser `inputFormat` id for that window ('' before the first edit). */
  readonly inputFormat: string;
  /** That window's content at the time of the edit. */
  readonly content: string;
  /** Human label for the window, shown above the report. */
  readonly label: string;
  readonly updates: number;
}

// @awa-component: PLAN-014-MappingsSlice
export interface MappingsSlice {
  readonly report: string;
  readonly reportError: Error | undefined;
  readonly reportErrorAsString: string | undefined;
  readonly reportDurationSec: number | undefined;
  readonly reportUpdates: number;
}

export interface BitmarkState {
  readonly js: ParserSlice;
  readonly wasm: ParserSlice;
  readonly wasmFull: ParserSlice;
  readonly wasmCheck: WasmCheckSlice;
  readonly jsRoundTrip: JsRoundTripSlice;
  readonly tableHtml: TableHtmlSlice;
  readonly text: TextSlice;
  readonly xmlNiso: XmlSlice;
  readonly xmlNisoEs: XmlSlice;
  readonly lastEdit: LastEditSlice;
  readonly mappings: MappingsSlice;
  readonly activeMarkupTab: ParserType;
  readonly activeJsonTab: JsonTabType;
  setJson(
    parser: ParserType,
    json: BitWrapperJson[] | undefined,
    jsonError: Error | undefined,
    durationSec?: number,
  ): void;
  setMarkup(
    parser: ParserType,
    markup: string | undefined,
    markupError: Error | undefined,
    durationSec?: number,
  ): void;
  setLexerOutput(parser: ParserType, output: string): void;
  setWasmCheck(
    markup: string | undefined,
    markupError: Error | undefined,
    durationSec?: number,
  ): void;
  setJsRoundTrip(
    sourceJsonAsString: string,
    json: BitWrapperJson[] | undefined,
    error: Error | undefined,
    durationSec?: number,
  ): void;
  setTableHtml(html: string | undefined, htmlError: Error | undefined, durationSec?: number): void;
  setText(text: string | undefined, textError: Error | undefined, durationSec?: number): void;
  setXml(
    variant: XmlVariant,
    xml: string | undefined,
    xmlError: Error | undefined,
    durationSec?: number,
  ): void;
  setActiveMarkupTab(tab: ParserType): void;
  setActiveJsonTab(tab: JsonTabType): void;
  /** Set the edited tab's markup verbatim (raw user input; clears markup error). */
  setEditedMarkup(parser: ParserType, markup: string): void;
  /** Set the edited tab's JSON verbatim (raw user input; clears JSON error). */
  setEditedJson(parser: ParserType, json: string): void;
  /**
   * Set an XML tab's document verbatim (raw user input).
   *
   * Unlike `setXml`, this does NOT touch the duration: the user typed this XML,
   * the app did not generate it, so the tab's generation time is left as-is
   * (mirrors `setEditedMarkup` / `setEditedJson`).
   */
  setEditedXml(variant: XmlVariant, xml: string, xmlError: Error | undefined): void;
  /** Record the window the user just edited (drives the mapping report). */
  setLastEdit(inputFormat: string, content: string, label: string): void;
  setMappings(
    report: string | undefined,
    reportError: Error | undefined,
    durationSec?: number,
  ): void;
}

const createParserSlice = (): ParserSlice => ({
  markup: '',
  markupError: undefined,
  markupErrorAsString: undefined,
  markupDurationSec: undefined,
  markupUpdates: 0,
  json: [],
  jsonAsString: '',
  jsonError: undefined,
  jsonErrorAsString: undefined,
  jsonDurationSec: undefined,
  jsonUpdates: 0,
  lexerOutput: '',
});

// @awa-component: PLAN-006-WasmCheckSlice
const createWasmCheckSlice = (): WasmCheckSlice => ({
  markup: '',
  markupError: undefined,
  markupErrorAsString: undefined,
  markupDurationSec: undefined,
  markupUpdates: 0,
});

// @awa-component: PLAN-012-JsRoundTripSlice
const createJsRoundTripSlice = (): JsRoundTripSlice => ({
  json: [],
  sourceJsonAsString: '',
  error: undefined,
  durationSec: undefined,
  updates: 0,
});

// @awa-component: PLAN-007-TableHtmlSlice
const createTableHtmlSlice = (): TableHtmlSlice => ({
  html: '',
  htmlError: undefined,
  htmlErrorAsString: undefined,
  htmlDurationSec: undefined,
  htmlUpdates: 0,
});

// @awa-component: PLAN-013-XmlSlice
const createXmlSlice = (): XmlSlice => ({
  xml: '',
  xmlError: undefined,
  xmlErrorAsString: undefined,
  xmlDurationSec: undefined,
  xmlUpdates: 0,
});

// @awa-component: PLAN-011-TextSlice
const createTextSlice = (): TextSlice => ({
  text: '',
  textError: undefined,
  textErrorAsString: undefined,
  textDurationSec: undefined,
  textUpdates: 0,
});

// @awa-impl: PLAN-002-Step9 (tab query param)
// @awa-impl: PLAN-004-Step2 (hydrate from storage, URL param wins)
const getTabFromUrl = (): ParserType | null => {
  const searchParams = new URLSearchParams(window.location.search);
  const tab = searchParams.get('tab');
  if (tab === 'wasm') return 'wasm';
  if (tab === 'wasmFull') return 'wasmFull';
  if (tab === 'js') return 'js';
  return null;
};

const storedSettings = loadSettings();
const urlTab = getTabFromUrl();

const bitmarkState = proxy<BitmarkState>({
  js: createParserSlice(),
  wasm: createParserSlice(),
  wasmFull: createParserSlice(),
  wasmCheck: createWasmCheckSlice(),
  jsRoundTrip: createJsRoundTripSlice(),
  tableHtml: createTableHtmlSlice(),
  text: createTextSlice(),
  xmlNiso: createXmlSlice(),
  xmlNisoEs: createXmlSlice(),
  lastEdit: { inputFormat: '', content: '', label: '', updates: 0 },
  mappings: {
    report: '',
    reportError: undefined,
    reportErrorAsString: undefined,
    reportDurationSec: undefined,
    reportUpdates: 0,
  },
  activeMarkupTab: urlTab ?? storedSettings?.activeMarkupTab ?? 'js',
  activeJsonTab: urlTab ?? storedSettings?.activeJsonTab ?? 'js',

  // @awa-impl: PLAN-008-Step1 (setJson sets only the JSON side — no cross-write)
  setJson: (
    parser: ParserType,
    json: BitWrapperJson[] | undefined,
    jsonError: Error | undefined,
    durationSec?: number,
  ) => {
    const slice = bitmarkState[parser] as Writable<ParserSlice>;

    if (jsonError) {
      slice.jsonError = jsonError;
      try {
        slice.jsonErrorAsString = JSON.stringify(
          jsonError,
          Object.getOwnPropertyNames(jsonError),
          2,
        );
      } catch (_e) {
        slice.jsonErrorAsString = 'Unknown';
      }
    } else {
      slice.json = json ?? [];
      try {
        slice.jsonAsString = JSON.stringify(slice.json, undefined, 2);
        slice.jsonError = undefined;
        slice.jsonErrorAsString = undefined;
      } catch (e) {
        slice.jsonError = e as Error;
        slice.jsonErrorAsString = JSON.stringify(e, Object.getOwnPropertyNames(e), 2);
      }
    }
    slice.jsonDurationSec = durationSec;
    slice.jsonUpdates += 1;
  },

  // @awa-impl: PLAN-008-Step1 (setMarkup sets only the markup side — no cross-write)
  setMarkup: (
    parser: ParserType,
    markup: string | undefined,
    markupError: Error | undefined,
    durationSec?: number,
  ) => {
    const slice = bitmarkState[parser] as Writable<ParserSlice>;

    if (markupError) {
      slice.markupError = markupError;
      try {
        slice.markupErrorAsString = JSON.stringify(
          markupError,
          Object.getOwnPropertyNames(markupError),
          2,
        );
      } catch (_e) {
        slice.markupErrorAsString = 'Unknown';
      }
    } else {
      slice.markup = markup ?? '';
      slice.markupError = undefined;
      slice.markupErrorAsString = undefined;
    }
    slice.markupDurationSec = durationSec;
    slice.markupUpdates += 1;
  },

  setLexerOutput: (parser: ParserType, output: string) => {
    const slice = bitmarkState[parser] as Writable<ParserSlice>;
    slice.lexerOutput = output;
  },

  // @awa-impl: PLAN-006-Step1 (setWasmCheck setter)
  setWasmCheck: (
    markup: string | undefined,
    markupError: Error | undefined,
    durationSec?: number,
  ) => {
    const slice = bitmarkState.wasmCheck as Writable<WasmCheckSlice>;

    if (markupError) {
      slice.markupError = markupError;
      try {
        slice.markupErrorAsString = JSON.stringify(
          markupError,
          Object.getOwnPropertyNames(markupError),
          2,
        );
      } catch (_e) {
        slice.markupErrorAsString = 'Unknown';
      }
    } else {
      slice.markup = markup ?? '';
      slice.markupError = undefined;
      slice.markupErrorAsString = undefined;
    }
    slice.markupDurationSec = durationSec;
    slice.markupUpdates += 1;
  },

  // @awa-impl: PLAN-012-Step1 (setJsRoundTrip setter)
  // `sourceJsonAsString` is always stored, including on error, so consumers can
  // tell "reference failed for the current JSON" from "reference is stale".
  setJsRoundTrip: (
    sourceJsonAsString: string,
    json: BitWrapperJson[] | undefined,
    error: Error | undefined,
    durationSec?: number,
  ) => {
    const slice = bitmarkState.jsRoundTrip as Writable<JsRoundTripSlice>;

    slice.sourceJsonAsString = sourceJsonAsString;
    if (error) {
      slice.error = error;
    } else {
      slice.json = json ?? [];
      slice.error = undefined;
    }
    slice.durationSec = durationSec;
    slice.updates += 1;
  },

  // @awa-impl: PLAN-007-Step1 (setTableHtml setter)
  // html and error are independent: html is always stored when provided (so the
  // editable editor is never clobbered), while error is set/cleared separately.
  // On error with html undefined (e.g. bitmark -> HTML failed), the last good
  // html is preserved.
  setTableHtml: (html: string | undefined, htmlError: Error | undefined, durationSec?: number) => {
    const slice = bitmarkState.tableHtml as Writable<TableHtmlSlice>;

    if (html !== undefined) {
      slice.html = html;
    }

    if (htmlError) {
      slice.htmlError = htmlError;
      try {
        slice.htmlErrorAsString = JSON.stringify(
          htmlError,
          Object.getOwnPropertyNames(htmlError),
          2,
        );
      } catch (_e) {
        slice.htmlErrorAsString = 'Unknown';
      }
    } else {
      slice.htmlError = undefined;
      slice.htmlErrorAsString = undefined;
    }
    slice.htmlDurationSec = durationSec;
    slice.htmlUpdates += 1;
  },

  // @awa-impl: PLAN-011-Step1 (setText setter; read-only WASM-opt-bitmark -> text view)
  setText: (text: string | undefined, textError: Error | undefined, durationSec?: number) => {
    const slice = bitmarkState.text as Writable<TextSlice>;

    if (textError) {
      slice.textError = textError;
      try {
        slice.textErrorAsString = JSON.stringify(
          textError,
          Object.getOwnPropertyNames(textError),
          2,
        );
      } catch (_e) {
        slice.textErrorAsString = 'Unknown';
      }
    } else {
      slice.text = text ?? '';
      slice.textError = undefined;
      slice.textErrorAsString = undefined;
    }
    slice.textDurationSec = durationSec;
    slice.textUpdates += 1;
  },

  // @awa-impl: PLAN-013-Step1 (setXml setter, per XML mapping variant)
  // xml and error are independent: xml is always stored when provided (so the
  // editable editor is never clobbered), while error is set/cleared separately.
  // On error with xml undefined (e.g. bitmark -> XML failed), the last good
  // xml is preserved. Mirrors setTableHtml.
  setXml: (
    variant: XmlVariant,
    xml: string | undefined,
    xmlError: Error | undefined,
    durationSec?: number,
  ) => {
    const slice = bitmarkState[variant] as Writable<XmlSlice>;

    if (xml !== undefined) {
      slice.xml = xml;
    }

    if (xmlError) {
      slice.xmlError = xmlError;
      try {
        slice.xmlErrorAsString = JSON.stringify(xmlError, Object.getOwnPropertyNames(xmlError), 2);
      } catch (_e) {
        slice.xmlErrorAsString = 'Unknown';
      }
    } else {
      slice.xmlError = undefined;
      slice.xmlErrorAsString = undefined;
    }
    slice.xmlDurationSec = durationSec;
    slice.xmlUpdates += 1;
  },

  setActiveMarkupTab: (tab: ParserType) => {
    (bitmarkState as Writable<BitmarkState>).activeMarkupTab = tab;
  },

  setActiveJsonTab: (tab: JsonTabType) => {
    (bitmarkState as Writable<BitmarkState>).activeJsonTab = tab;
  },

  // @awa-impl: PLAN-008-Step1 (edited tab keeps the user input verbatim — no copy to others)
  setEditedMarkup: (parser: ParserType, markup: string) => {
    const slice = bitmarkState[parser] as Writable<ParserSlice>;
    slice.markup = markup;
    slice.markupError = undefined;
    slice.markupErrorAsString = undefined;
  },

  setEditedJson: (parser: ParserType, json: string) => {
    const slice = bitmarkState[parser] as Writable<ParserSlice>;
    slice.jsonAsString = json;
    slice.jsonError = undefined;
    slice.jsonErrorAsString = undefined;
  },

  // @awa-impl: PLAN-014-Step1 (record the last edited window)
  setLastEdit: (inputFormat: string, content: string, label: string) => {
    const slice = bitmarkState.lastEdit as Writable<LastEditSlice>;
    slice.inputFormat = inputFormat;
    slice.content = content;
    slice.label = label;
    slice.updates += 1;
  },

  // @awa-impl: PLAN-014-Step1 (setMappings setter)
  setMappings: (
    report: string | undefined,
    reportError: Error | undefined,
    durationSec?: number,
  ) => {
    const slice = bitmarkState.mappings as Writable<MappingsSlice>;

    if (reportError) {
      slice.reportError = reportError;
      try {
        slice.reportErrorAsString = JSON.stringify(
          reportError,
          Object.getOwnPropertyNames(reportError),
          2,
        );
      } catch (_e) {
        slice.reportErrorAsString = 'Unknown';
      }
    } else {
      slice.report = report ?? '';
      slice.reportError = undefined;
      slice.reportErrorAsString = undefined;
    }
    slice.reportDurationSec = durationSec;
    slice.reportUpdates += 1;
  },

  // @awa-impl: PLAN-013-Step1 (setEditedXml; user input, duration untouched)
  setEditedXml: (variant: XmlVariant, xml: string, xmlError: Error | undefined) => {
    const slice = bitmarkState[variant] as Writable<XmlSlice>;
    slice.xml = xml;

    if (xmlError) {
      slice.xmlError = xmlError;
      try {
        slice.xmlErrorAsString = JSON.stringify(xmlError, Object.getOwnPropertyNames(xmlError), 2);
      } catch (_e) {
        slice.xmlErrorAsString = 'Unknown';
      }
    } else {
      slice.xmlError = undefined;
      slice.xmlErrorAsString = undefined;
    }
    slice.xmlUpdates += 1;
  },
});

export { bitmarkState };
