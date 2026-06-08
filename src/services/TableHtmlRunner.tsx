// @awa-component: PLAN-007-TableHtmlRunner
import type {
  BitmarkParserGenerator,
  ConvertHtmlTableOptions,
} from '@gmb/bitmark-parser-generator';
import { useEffect } from 'react';
import { subscribe } from 'valtio';

import { bitmarkState } from '../state/bitmarkState';
import { StringUtils } from '../utils/StringUtils';
import { useBitmarkParserGenerator } from './BitmarkParserGenerator';

// HTML -> bitmark: extract every <table> as a lossless table-extended bit.
const HTML_TO_BITMARK_OPTS: ConvertHtmlTableOptions = {
  inputFormat: 'html',
  outputFormat: 'bitmark',
  tableFormat: 'table-extended',
};

// bitmark -> HTML: render each table bit as an HTML <table> fragment.
const BITMARK_TO_HTML_OPTS: ConvertHtmlTableOptions = {
  inputFormat: 'bitmark',
  outputFormat: 'html',
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

const supportsHtmlTable = (parser: BitmarkParserGenerator): boolean =>
  typeof (parser as { convertHtmlTable?: unknown }).convertHtmlTable === 'function';

/**
 * Workaround for an upstream bug in the CDN *browser* bundle
 * (`dist/browser/bitmark-parser-generator.min.js`): `convertHtmlTable`'s minified
 * body references `HtmlTableGenerator` / `HtmlTableParser` by their original
 * names, but the minifier only exposes them under renamed bindings on the
 * library namespace — so the unqualified references throw
 * `ReferenceError: HtmlTableGenerator is not defined`. The bundle is a global
 * build, so assigning the classes onto `globalThis` lets those references
 * resolve. The npm cjs/esm builds are unaffected. Remove once the published
 * browser build is fixed.
 */
const ensureHtmlTableGlobals = (): void => {
  const g = globalThis as Record<string, unknown>;
  const lib = g.bitmarkParserGenerator as Record<string, unknown> | undefined;
  if (!lib) return;
  for (const name of ['HtmlTableGenerator', 'HtmlTableParser']) {
    if (g[name] == null && typeof lib[name] === 'function') {
      g[name] = lib[name];
    }
  }
};

const runConvertHtmlTable = async (
  parser: BitmarkParserGenerator,
  input: string,
  options: ConvertHtmlTableOptions,
): Promise<string> => {
  if (!supportsHtmlTable(parser)) {
    throw new Error('convertHtmlTable is not supported by the loaded parser version');
  }
  ensureHtmlTableGlobals();
  // convertHtmlTable is synchronous in current versions; tolerate a Promise too.
  const out = await Promise.resolve(parser.convertHtmlTable(input, options));
  if (!StringUtils.isString(out)) {
    throw new Error('Expected string');
  }
  return out as string;
};

/**
 * Flow A: convert HTML-table input to bitmark.
 *
 * Returns the bitmark and the conversion duration. Pre-seeds the Original -> HTML
 * dedupe with the produced bitmark so the caller's `markupToJson` does not bounce
 * back and overwrite the HTML the user is editing.
 */
const convertHtmlToBitmark = async (
  parser: BitmarkParserGenerator,
  html: string,
): Promise<{ markup: string; durationSec: number }> => {
  const startMark = `tableHtml-h2b-start-${Date.now()}`;
  const endMark = `tableHtml-h2b-end-${Date.now()}`;
  performance.mark(startMark);

  let markup = '';
  if (html !== '') {
    markup = await runConvertHtmlTable(parser, html, HTML_TO_BITMARK_OPTS);
  }

  performance.mark(endMark);
  const durationSec =
    performance.measure('tableHtml-htmlToBitmark', startMark, endMark).duration / 1000;

  noteOriginalMarkup(markup);
  return { markup, durationSec };
};

// @awa-impl: PLAN-007-Step2 (Original bitmark -> HTML refresh)
const useTableHtmlRunner = (): void => {
  const { bitmarkParserGenerator, loadSuccess } = useBitmarkParserGenerator();

  useEffect(() => {
    if (!loadSuccess || !bitmarkParserGenerator) return;

    let cancelled = false;

    const run = async (markup: string) => {
      if (markup === '') {
        bitmarkState.setTableHtml('', undefined, undefined);
        return;
      }

      let html: string | undefined;
      let htmlError: Error | undefined;

      const startMark = `tableHtml-b2h-start-${Date.now()}`;
      const endMark = `tableHtml-b2h-end-${Date.now()}`;
      performance.mark(startMark);

      try {
        html = await runConvertHtmlTable(bitmarkParserGenerator, markup, BITMARK_TO_HTML_OPTS);
      } catch (e) {
        htmlError = e as Error;
      }

      performance.mark(endMark);
      const durationSec =
        performance.measure('tableHtml-bitmarkToHtml', startMark, endMark).duration / 1000;

      if (cancelled) return;

      bitmarkState.setTableHtml(html, htmlError, durationSec);
    };

    const evaluate = () => {
      const markup = bitmarkState.js.markup;
      // Skip self-induced changes (Flow A pre-seeds lastOriginalMarkup) and no-op notifications.
      if (markup === lastOriginalMarkup) return;
      lastOriginalMarkup = markup;
      void run(markup);
    };

    // Run once with the current value (parser may have become ready after the
    // first Original markup was set, or this hook mounted later).
    evaluate();

    const unsubscribe = subscribe(bitmarkState.js, evaluate);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [bitmarkParserGenerator, loadSuccess]);
};

// Renderless component that drives the Original -> HTML refresh. Mount once
// inside `BitmarkParserGeneratorProvider` so the hook can read its context.
const TableHtmlRunner = (): null => {
  useTableHtmlRunner();
  return null;
};

export {
  convertHtmlToBitmark,
  noteOriginalMarkup,
  supportsHtmlTable,
  TableHtmlRunner,
  useTableHtmlRunner,
};
