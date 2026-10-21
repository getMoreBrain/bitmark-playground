import type { JsonText } from '@gmb/bitmark-editor';
import { proxy } from 'valtio';

import { loadSettings } from '../services/settingsStorage';
import { Writable } from '../utils/TypeScriptUtils';

/** The parsers: the legacy bpg (`js`) and the WASM parser, in the mode Settings choose. */
export type ParserType = 'js' | 'wasm';

/** Tab id for the bitmark (left) tab bar. */
export type MarkupTabType = 'bitmark' | 'legacy';
/** Tab id for the right-hand tab bar. */
export type JsonTabType = 'json' | 'tableHtml' | XmlVariant | 'text' | 'legacy';
/**
 * XML mapping variants. Each is its own JSON-side tab and its own state slice;
 * they differ only by the config mapping id passed to the parser's `convert`.
 */
export type XmlVariant = 'xmlNiso' | 'xmlNisoEs';

export const MARKUP_TAB_LABEL: Record<MarkupTabType, string> = {
  bitmark: 'Bitmark',
  legacy: 'Legacy Bitmark',
};

export const JSON_TAB_LABEL: Record<JsonTabType, string> = {
  json: 'JSON',
  tableHtml: 'HTML',
  xmlNiso: 'XML (niso-iec)',
  xmlNisoEs: 'XML (niso-iec-es)',
  text: 'Text',
  legacy: 'Legacy JSON',
};

/** Right-hand tabs that are never shown, nor computed (PLAN-026 D5). */
export const DISABLED_JSON_TABS: readonly JsonTabType[] = ['xmlNisoEs'];

const JSON_TABS: readonly JsonTabType[] = [
  'json',
  'legacy',
  'tableHtml',
  'xmlNiso',
  'xmlNisoEs',
  'text',
];

/** The left tabs on screen, in order; the Legacy tab only while it is shown (PLAN-026 D4). */
export const markupTabs = (showLegacy: boolean): MarkupTabType[] =>
  showLegacy ? ['bitmark', 'legacy'] : ['bitmark'];

/** The right-hand tabs on screen, in order (PLAN-026 D4, D5). */
export const jsonTabs = (showLegacy: boolean): JsonTabType[] =>
  JSON_TABS.filter((tab) => !DISABLED_JSON_TABS.includes(tab) && (showLegacy || tab !== 'legacy'));

/** The parser whose slice a Bitmark, JSON or Legacy tab shows (PLAN-026 D6). */
export const tabParser = (tab: 'bitmark' | 'json' | 'legacy'): ParserType =>
  tab === 'legacy' ? 'js' : 'wasm';

export interface ParserSlice {
  readonly markup: string;
  readonly markupError: Error | undefined;
  readonly markupErrorAsString: string | undefined;
  readonly markupDurationSec: number | undefined;
  readonly markupUpdates: number;
  // Not the parsed bits: nothing reads them, and Valtio would proxy and
  // snapshot every one on each edit (PLAN-029 D1).
  readonly jsonAsString: string;
  /**
   * Where each bit starts in the JSON text (UTF-16 offsets), recorded by
   * whatever wrote it (PLAN-018 D1, D4). `undefined` when the JSON text was
   * typed by the user, so no positions are known for it.
   */
  readonly jsonBitStarts: readonly number[] | undefined;
  readonly jsonError: Error | undefined;
  readonly jsonErrorAsString: string | undefined;
  readonly jsonDurationSec: number | undefined;
  readonly jsonUpdates: number;
}

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
  /**
   * Where the edit happened: the playground's own editors, or a package
   * pane of the session (PLAN-023 Step 14, which keeps the two from echoing).
   */
  readonly origin: 'playground' | 'session';
  readonly updates: number;
}

/** The package panes whose regeneration time the tab bar shows (PLAN-023 Step 14). */
export type TimedPane = 'tableHtml' | 'text' | XmlVariant;

export interface BitmarkState {
  readonly js: ParserSlice;
  readonly wasm: ParserSlice;
  readonly lastEdit: LastEditSlice;
  /** The WASM lexer's tokens for the Bitmark tab, as JSON (PLAN-026 D8). */
  readonly lexerOutput: string;
  /** Each timed pane's last regeneration time, in seconds. */
  readonly paneDurations: Readonly<Record<TimedPane, number | undefined>>;
  readonly activeMarkupTab: MarkupTabType;
  readonly activeJsonTab: JsonTabType;
  /**
   * The JSON text a conversion wrote, with where each bit starts in it
   * (PLAN-030 D5), or its error (the text keeps its last good value).
   */
  setJson(
    parser: ParserType,
    json: JsonText | undefined,
    jsonError: Error | undefined,
    durationSec?: number,
  ): void;
  setMarkup(
    parser: ParserType,
    markup: string | undefined,
    markupError: Error | undefined,
    durationSec?: number,
  ): void;
  setLexerOutput(output: string): void;
  setActiveMarkupTab(tab: MarkupTabType): void;
  setActiveJsonTab(tab: JsonTabType): void;
  /** Set the edited tab's markup verbatim (raw user input; clears markup error). */
  setEditedMarkup(parser: ParserType, markup: string): void;
  /** Set the edited tab's JSON verbatim (raw user input; clears JSON error). */
  setEditedJson(parser: ParserType, json: string): void;
  /**
   * Where each bit starts in the JSON the user typed, as its own conversion
   * read it (PLAN-020). Ignored unless the tab still shows exactly `json`.
   */
  setEditedJsonBitStarts(parser: ParserType, json: string, bitStarts: readonly number[]): void;
  /** Record the window the user just edited (drives the mapping report). */
  setLastEdit(
    inputFormat: string,
    content: string,
    label: string,
    origin?: 'playground' | 'session',
  ): void;
  setPaneDuration(pane: TimedPane, durationSec: number): void;
}

const createParserSlice = (): ParserSlice => ({
  markup: '',
  markupError: undefined,
  markupErrorAsString: undefined,
  markupDurationSec: undefined,
  markupUpdates: 0,
  jsonAsString: '',
  jsonBitStarts: undefined,
  jsonError: undefined,
  jsonErrorAsString: undefined,
  jsonDurationSec: undefined,
  jsonUpdates: 0,
});

const URL_JSON_TABS: Record<string, JsonTabType> = {
  json: 'json',
  html: 'tableHtml',
  'xml-niso-iec': 'xmlNiso',
  text: 'text',
};

/** The right-hand tab named by `?tab=` (PLAN-026 D14); other values are ignored. */
export const getJsonTabFromUrl = (search: string): JsonTabType | null =>
  URL_JSON_TABS[new URLSearchParams(search).get('tab') ?? ''] ?? null;

const storedSettings = loadSettings();
const urlTab = getJsonTabFromUrl(window.location.search);

const bitmarkState = proxy<BitmarkState>({
  js: createParserSlice(),
  wasm: createParserSlice(),
  lastEdit: { inputFormat: '', content: '', label: '', origin: 'playground', updates: 0 },
  paneDurations: {
    tableHtml: undefined,
    text: undefined,
    xmlNiso: undefined,
    xmlNisoEs: undefined,
  },
  lexerOutput: '',
  activeMarkupTab: storedSettings?.activeMarkupTab ?? 'bitmark',
  activeJsonTab: urlTab ?? storedSettings?.activeJsonTab ?? 'json',

  setJson: (
    parser: ParserType,
    json: JsonText | undefined,
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
      slice.jsonAsString = json?.text ?? '';
      slice.jsonBitStarts = json?.bitStarts;
      slice.jsonError = undefined;
      slice.jsonErrorAsString = undefined;
    }
    slice.jsonDurationSec = durationSec;
    slice.jsonUpdates += 1;
  },

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

  setLexerOutput: (output: string) => {
    (bitmarkState as Writable<BitmarkState>).lexerOutput = output;
  },

  setActiveMarkupTab: (tab: MarkupTabType) => {
    (bitmarkState as Writable<BitmarkState>).activeMarkupTab = tab;
  },

  setActiveJsonTab: (tab: JsonTabType) => {
    (bitmarkState as Writable<BitmarkState>).activeJsonTab = tab;
  },

  setEditedMarkup: (parser: ParserType, markup: string) => {
    const slice = bitmarkState[parser] as Writable<ParserSlice>;
    slice.markup = markup;
    slice.markupError = undefined;
    slice.markupErrorAsString = undefined;
  },

  setEditedJson: (parser: ParserType, json: string) => {
    const slice = bitmarkState[parser] as Writable<ParserSlice>;
    slice.jsonAsString = json;
    // Typed text: no known positions until its conversion reads them (PLAN-020).
    slice.jsonBitStarts = undefined;
    slice.jsonError = undefined;
    slice.jsonErrorAsString = undefined;
  },

  setEditedJsonBitStarts: (parser: ParserType, json: string, bitStarts: readonly number[]) => {
    const slice = bitmarkState[parser] as Writable<ParserSlice>;
    // A later edit has replaced the text these positions describe.
    if (slice.jsonAsString !== json) return;
    slice.jsonBitStarts = bitStarts;
  },

  setLastEdit: (
    inputFormat: string,
    content: string,
    label: string,
    origin: 'playground' | 'session' = 'playground',
  ) => {
    const slice = bitmarkState.lastEdit as Writable<LastEditSlice>;
    slice.inputFormat = inputFormat;
    slice.content = content;
    slice.label = label;
    slice.origin = origin;
    slice.updates += 1;
  },

  setPaneDuration: (pane: TimedPane, durationSec: number) => {
    (bitmarkState.paneDurations as Writable<Record<TimedPane, number | undefined>>)[pane] =
      durationSec;
  },
});

export { bitmarkState };
