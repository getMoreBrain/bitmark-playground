// @awa-component: PLAN-013-XmlRunner
import type { convert as convertFn } from '@gmb/bitmark-parser';
import { useEffect } from 'react';
import { subscribe } from 'valtio';

import { bitmarkState, XmlVariant } from '../state/bitmarkState';
import { throwIfParserError, useBitmarkParser } from './BitmarkParser';

/**
 * Config mapping id per XML variant. The variants are otherwise identical —
 * same flows, same guards — so everything below is parameterised by variant
 * rather than duplicated per tab.
 */
const XML_MAPPING: Record<XmlVariant, string> = {
  xmlNiso: 'xml-niso-iec',
  xmlNisoEs: 'xml-niso-iec-es',
};

/** Display names, matching the tab bar. */
const XML_LABEL: Record<XmlVariant, string> = {
  xmlNiso: 'XML (NISO-IEC)',
  xmlNisoEs: 'XML (NISO-IEC-ES)',
};

/**
 * The published `OutputFormat` type is narrower than the runtime: it lists only
 * `bitmark | json | text`, while `convert` also accepts any config mapping id
 * (`html`, `xml-niso-iec`, …) in BOTH directions — documented in the parser
 * README and verified against the browser bundle. The cast below is that gap,
 * and nothing more; drop it once the published types include mapping ids.
 */
type ConvertOptions = NonNullable<Parameters<typeof convertFn>[1]>;
type OutputFormatOption = ConvertOptions['outputFormat'];

// bitmark -> XML: render the WASM (optimized) bitmark as a NISO-STS document.
const bitmarkToXmlOpts = (variant: XmlVariant): ConvertOptions => ({
  inputFormat: 'bitmark',
  outputFormat: XML_MAPPING[variant] as OutputFormatOption,
});

// XML -> bitmark: import a NISO-STS document back to bitmark.
const xmlToBitmarkOpts = (variant: XmlVariant): ConvertOptions => ({
  inputFormat: XML_MAPPING[variant],
  outputFormat: 'bitmark',
});

/**
 * Last `wasm.markup` each variant has rendered.
 *
 * Doubles as the loop guard: Flow A (`convertXmlToBitmark`) pre-seeds the edited
 * variant with the bitmark it produced, so the resulting `wasm.markup` write does
 * not bounce straight back and clobber the XML the user is editing.
 *
 * Seeded for the EDITED VARIANT ONLY. The other variants are a different mapping
 * of the same document and must regenerate from the new bitmark — seeding them
 * too would leave them showing stale XML.
 */
const lastWasmMarkup: Record<XmlVariant, string | null> = {
  xmlNiso: null,
  xmlNisoEs: null,
};

/** Pre-seed one variant's guard with the bitmark its own Flow A edit produced. */
const noteWasmMarkup = (variant: XmlVariant, markup: string): void => {
  lastWasmMarkup[variant] = markup;
};

/**
 * Clear the module-level guard.
 *
 * Only for tests, which mount runners selectively and would otherwise carry a
 * seeded value between cases.
 */
const resetXmlRunnerState = (): void => {
  for (const variant of Object.keys(lastWasmMarkup) as XmlVariant[]) {
    lastWasmMarkup[variant] = null;
  }
};

/**
 * Monotonic counter for `performance.mark` names. `Date.now()` is not unique
 * enough — two conversions starting in the same millisecond would share mark
 * names, and `performance.measure` resolves a name to its most recent mark,
 * producing a wrong (or negative) duration.
 */
let markSeq = 0;

/**
 * Flow A: convert NISO-STS XML input to bitmark.
 *
 * Returns the bitmark and the conversion duration. Pre-seeds this variant's
 * guard with the produced bitmark so the caller's `markupToJson` does not bounce
 * back and overwrite the XML the user is editing.
 */
const convertXmlToBitmark = (
  convert: typeof convertFn,
  variant: XmlVariant,
  xml: string,
): { markup: string; durationSec: number } => {
  const seq = ++markSeq;
  const startMark = `${variant}-x2b-start-${seq}`;
  const endMark = `${variant}-x2b-end-${seq}`;
  performance.mark(startMark);

  let markup = '';
  if (xml !== '') {
    markup = throwIfParserError(convert(xml, xmlToBitmarkOpts(variant)));
  }

  performance.mark(endMark);
  const durationSec =
    performance.measure(`${variant}-xmlToBitmark-${seq}`, startMark, endMark).duration / 1000;

  noteWasmMarkup(variant, markup);
  return { markup, durationSec };
};

/**
 * Flow A, end to end: apply a user edit of an XML tab.
 *
 * Records the XML verbatim, then — on success — records the conversion duration
 * against the WASM bitmark tab (the XML -> bitmark conversion generated THAT
 * tab's content, so the time belongs there, not on the XML tab, whose duration
 * measures bitmark -> XML) and propagates the bitmark through the normal
 * round-trip convention.
 */
// @awa-impl: PLAN-013-Step3 (XML edit -> WASM bitmark, duration on the WASM tab)
const applyXmlEdit = async (
  convert: typeof convertFn,
  variant: XmlVariant,
  nextXml: string,
  markupToJson: (editedTab: 'wasm', markup: string) => Promise<void>,
): Promise<void> => {
  let markup = '';
  let xmlError: Error | undefined;
  let durationSec: number | undefined;

  try {
    const result = convertXmlToBitmark(convert, variant, nextXml);
    markup = result.markup;
    durationSec = result.durationSec;
  } catch (e) {
    xmlError = e as Error;
  }

  // The XML the user is editing, stored verbatim so the editor is never
  // clobbered while focused. The duration is deliberately not recorded here.
  bitmarkState.setEditedXml(variant, nextXml, xmlError);

  // @awa-impl: PLAN-014-Step3 (record the edited window for the mapping report)
  bitmarkState.setLastEdit(XML_MAPPING[variant], nextXml, XML_LABEL[variant]);

  if (xmlError) return;

  // Set before `markupToJson`, whose `setEditedMarkup` stores the edited tab's
  // markup verbatim without touching the duration.
  bitmarkState.setMarkup('wasm', markup, undefined, durationSec);

  // `convertXmlToBitmark` already pre-seeded this variant's guard, so this write
  // does not bounce back and overwrite the XML being edited.
  await markupToJson('wasm', markup);
};

// @awa-impl: PLAN-013-Step2 (WASM bitmark -> XML refresh, per variant)
const useXmlRunner = (variant: XmlVariant): void => {
  const { convert: wasmConvert, loadSuccess } = useBitmarkParser();

  useEffect(() => {
    if (!loadSuccess || !wasmConvert) return;

    const run = (markup: string) => {
      if (markup === '') {
        bitmarkState.setXml(variant, '', undefined, undefined);
        return;
      }

      let xml: string | undefined;
      let xmlError: Error | undefined;

      const seq = ++markSeq;
      const startMark = `${variant}-b2x-start-${seq}`;
      const endMark = `${variant}-b2x-end-${seq}`;
      performance.mark(startMark);

      try {
        xml = throwIfParserError(wasmConvert(markup, bitmarkToXmlOpts(variant)));
      } catch (e) {
        xmlError = e as Error;
      }

      performance.mark(endMark);
      const durationSec =
        performance.measure(`${variant}-bitmarkToXml-${seq}`, startMark, endMark).duration / 1000;

      bitmarkState.setXml(variant, xml, xmlError, durationSec);
    };

    const evaluate = () => {
      const markup = bitmarkState.wasm.markup;
      // Skips this variant's own Flow A write (pre-seeded above) and no-op
      // notifications. Other variants have their own guard and still refresh.
      if (markup === lastWasmMarkup[variant]) return;
      lastWasmMarkup[variant] = markup;
      run(markup);
    };

    // Run once with the current value (parser may have become ready after the
    // first WASM markup was set, or this hook mounted later).
    evaluate();

    const unsubscribe = subscribe(bitmarkState.wasm, evaluate);

    return () => {
      unsubscribe();
    };
  }, [wasmConvert, loadSuccess, variant]);
};

export interface XmlRunnerProps {
  variant: XmlVariant;
}

// Renderless component that drives one variant's WASM-bitmark -> XML refresh.
// Mount once per variant inside `BitmarkParserProvider` so the hook can read its context.
const XmlRunner = ({ variant }: XmlRunnerProps): null => {
  useXmlRunner(variant);
  return null;
};

export {
  applyXmlEdit,
  convertXmlToBitmark,
  noteWasmMarkup,
  resetXmlRunnerState,
  useXmlRunner,
  XML_LABEL,
  XML_MAPPING,
  XmlRunner,
};
