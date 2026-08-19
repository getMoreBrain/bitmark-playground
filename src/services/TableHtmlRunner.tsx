// @awa-component: PLAN-007-TableHtmlRunner
// @awa-component: PLAN-014-TableHtmlRunner
import type { convert as convertFn } from '@gmb/bitmark-parser';
import { useEffect } from 'react';
import { subscribe } from 'valtio';

import { bitmarkState } from '../state/bitmarkState';
import { throwIfParserError, useBitmarkParser } from './BitmarkParser';

type ConvertOptions = NonNullable<Parameters<typeof convertFn>[1]>;
// The published `OutputFormat` omits config mapping ids (see XmlRunner).
type OutputFormatOption = ConvertOptions['outputFormat'];

/**
 * HTML is a config-driven mapping of the WHOLE document, using the core's
 * `<bitmark-bit>` envelope markup.
 *
 * PLAN-014 moved this tab from `bitmark-parser-generator`'s `convertHtmlTable`
 * (which extracted bare `<table>` fragments) onto the WASM parser's `html`
 * mapping. The tab therefore shows the whole document as HTML, not just its
 * tables — and the bpg browser-bundle `convertHtmlTable` shim is no longer
 * needed.
 */
const HTML_FORMAT = 'html';

// bitmark -> HTML
const BITMARK_TO_HTML_OPTS: ConvertOptions = {
  inputFormat: 'bitmark',
  outputFormat: HTML_FORMAT as OutputFormatOption,
};

// HTML -> bitmark
const HTML_TO_BITMARK_OPTS: ConvertOptions = {
  inputFormat: HTML_FORMAT,
  outputFormat: 'bitmark',
};

/**
 * Last `Original` (js) markup seen by the Original -> HTML refresh.
 *
 * Module-level (not per-effect) so Flow A (`convertHtmlToBitmark`) can pre-seed
 * it before pushing the converted bitmark into `Original`, suppressing the
 * Original -> HTML refresh that would otherwise clobber the user's HTML.
 */
let lastOriginalMarkup: string | null = null;

/** Pre-seed the dedupe so a subsequent `js.markup` write does not trigger a refresh. */
const noteOriginalMarkup = (markup: string): void => {
  lastOriginalMarkup = markup;
};

/** Clear the module-level guard. Only for tests. */
const resetTableHtmlRunnerState = (): void => {
  lastOriginalMarkup = null;
};

/**
 * Monotonic counter for `performance.mark` names. `Date.now()` is not unique
 * enough — two conversions starting in the same millisecond would share mark
 * names, and `performance.measure` resolves a name to its most recent mark,
 * producing a wrong (or negative) duration.
 */
let markSeq = 0;

/**
 * Flow A: convert HTML input to bitmark.
 *
 * Returns the bitmark and the conversion duration. Pre-seeds the Original -> HTML
 * dedupe with the produced bitmark so the caller's `markupToJson` does not bounce
 * back and overwrite the HTML the user is editing.
 */
const convertHtmlToBitmark = (
  convert: typeof convertFn,
  html: string,
): { markup: string; durationSec: number } => {
  const seq = ++markSeq;
  const startMark = `tableHtml-h2b-start-${seq}`;
  const endMark = `tableHtml-h2b-end-${seq}`;
  performance.mark(startMark);

  let markup = '';
  if (html !== '') {
    markup = throwIfParserError(convert(html, HTML_TO_BITMARK_OPTS));
  }

  performance.mark(endMark);
  const durationSec =
    performance.measure(`tableHtml-htmlToBitmark-${seq}`, startMark, endMark).duration / 1000;

  noteOriginalMarkup(markup);
  return { markup, durationSec };
};

/**
 * Flow A, end to end: apply a user edit of the HTML tab.
 *
 * Mirrors `applyXmlEdit`: the HTML is stored verbatim, and the conversion
 * duration is recorded against the bitmark tab whose content it generated.
 */
// @awa-impl: PLAN-014-Step4 (HTML edit -> Original bitmark via the WASM parser)
const applyHtmlEdit = async (
  convert: typeof convertFn,
  nextHtml: string,
  markupToJson: (editedTab: 'js', markup: string) => Promise<void>,
): Promise<void> => {
  let markup = '';
  let htmlError: Error | undefined;
  let durationSec: number | undefined;

  try {
    const result = convertHtmlToBitmark(convert, nextHtml);
    markup = result.markup;
    durationSec = result.durationSec;
  } catch (e) {
    htmlError = e as Error;
  }

  // The HTML the user is editing, stored verbatim so the editor is never
  // clobbered while focused.
  bitmarkState.setTableHtml(nextHtml, htmlError, undefined);

  // @awa-impl: PLAN-014-Step3 (record the edited window for the mapping report)
  bitmarkState.setLastEdit(HTML_FORMAT, nextHtml, 'HTML');

  if (htmlError) return;

  // The HTML -> bitmark conversion generated the Original bitmark, so its
  // duration belongs to that tab.
  bitmarkState.setMarkup('js', markup, undefined, durationSec);

  await markupToJson('js', markup);
};

// @awa-impl: PLAN-007-Step2 (Original bitmark -> HTML refresh)
const useTableHtmlRunner = (): void => {
  const { convert: wasmConvert, loadSuccess } = useBitmarkParser();

  useEffect(() => {
    if (!loadSuccess || !wasmConvert) return;

    const run = (markup: string) => {
      if (markup === '') {
        bitmarkState.setTableHtml('', undefined, undefined);
        return;
      }

      let html: string | undefined;
      let htmlError: Error | undefined;

      const seq = ++markSeq;
      const startMark = `tableHtml-b2h-start-${seq}`;
      const endMark = `tableHtml-b2h-end-${seq}`;
      performance.mark(startMark);

      try {
        html = throwIfParserError(wasmConvert(markup, BITMARK_TO_HTML_OPTS));
      } catch (e) {
        htmlError = e as Error;
      }

      performance.mark(endMark);
      const durationSec =
        performance.measure(`tableHtml-bitmarkToHtml-${seq}`, startMark, endMark).duration / 1000;

      bitmarkState.setTableHtml(html, htmlError, durationSec);
    };

    const evaluate = () => {
      const markup = bitmarkState.js.markup;
      // Skip self-induced changes (Flow A pre-seeds lastOriginalMarkup) and no-ops.
      if (markup === lastOriginalMarkup) return;
      lastOriginalMarkup = markup;
      run(markup);
    };

    // Run once with the current value (parser may have become ready after the
    // first Original markup was set, or this hook mounted later).
    evaluate();

    const unsubscribe = subscribe(bitmarkState.js, evaluate);

    return () => {
      unsubscribe();
    };
  }, [wasmConvert, loadSuccess]);
};

// Renderless component that drives the Original -> HTML refresh. Mount once
// inside `BitmarkParserProvider` so the hook can read its context.
const TableHtmlRunner = (): null => {
  useTableHtmlRunner();
  return null;
};

export {
  applyHtmlEdit,
  convertHtmlToBitmark,
  noteOriginalMarkup,
  resetTableHtmlRunnerState,
  TableHtmlRunner,
  useTableHtmlRunner,
};
