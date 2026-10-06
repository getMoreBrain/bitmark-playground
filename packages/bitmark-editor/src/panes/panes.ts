import type { OutputMode } from '@gmb/bitmark-parser';

import type { BitmarkEngine } from '../engine/types';
import { BITMARK_LANGUAGE_ID } from '../monaco/setup';
import type { BitmarkPane, BitmarkSession } from '../session/types';
import { createPane, PaneOptions, PaneSpec } from './createPane';

/** The bitmark pane: the document itself, with the editor services (D1). */
export const createBitmarkPane = (
  element: HTMLElement,
  session: BitmarkSession,
  options?: PaneOptions,
): BitmarkPane =>
  createPane(
    element,
    session,
    {
      type: 'bitmark',
      language: BITMARK_LANGUAGE_ID,
      extension: 'bitmark',
      inputFormat: 'bitmark',
      editable: true,
      scroll: 'split',
      services: true,
    },
    // Bitmark is prose with markup in it: the suggestion list opens on the
    // characters that begin a construct and on Ctrl+Space, never on every
    // letter typed (parser PLAN-203 D1).
    {
      ...options,
      editorOptions: {
        renderWhitespace: 'all',
        insertSpaces: false,
        quickSuggestions: false,
        ...options?.editorOptions,
      },
    },
  );

/** The JSON pane (D1): `mode` `optimized` (default) or `full`. */
export const createJsonPane = (
  element: HTMLElement,
  session: BitmarkSession,
  options?: PaneOptions & { mode?: OutputMode },
): BitmarkPane =>
  createPane(
    element,
    session,
    {
      type: 'json',
      language: 'json',
      extension: 'json',
      inputFormat: 'json',
      editable: true,
      scroll: 'pinned',
      toBitmark: async (engine, text) => {
        // The engine recovers leniently from malformed JSON: check the
        // syntax first, so the user sees the real error (a SyntaxError).
        JSON.parse(text);
        const { output, inputStarts } = await engine.convertWithBitStarts(text, {
          inputFormat: 'json',
          outputFormat: 'bitmark',
        });
        return { bitmark: output, inputStarts };
      },
      fromSession: (engine, s) => engine.bitmarkToJsonText(s.getBitmark(), { mode: options?.mode }),
    },
    options,
  );

/** A pane over a config mapping (HTML, an XML mapping): both ways, positions from the conversion. */
const mappingSpec = (type: 'html' | 'xml', mapping: string, language: string): PaneSpec => ({
  type,
  language,
  extension: type,
  inputFormat: mapping,
  editable: true,
  scroll: 'pinned',
  needsMarkup: true,
  toBitmark: async (engine, text) => {
    if (text === '') return { bitmark: '', inputStarts: [] };
    const { output, inputStarts } = await engine.convertWithBitStarts(text, {
      inputFormat: mapping,
      outputFormat: 'bitmark',
    });
    return { bitmark: output, inputStarts };
  },
  fromSession: async (engine, s) => {
    const bitmark = s.getBitmark();
    if (bitmark === '') return { text: '', bitStarts: [] };
    const { output, bitStarts } = await engine.convertWithBitStarts(bitmark, {
      inputFormat: 'bitmark',
      outputFormat: mapping,
    });
    return { text: output, bitStarts };
  },
});

/**
 * The HTML pane (D1): the whole document through the parser's `html`
 * mapping (the core's `<bitmark-bit>` envelope markup). The host's Monaco
 * needs the HTML language for highlighting; without it the text is plain.
 */
export const createHtmlPane = (
  element: HTMLElement,
  session: BitmarkSession,
  options?: PaneOptions,
): BitmarkPane => createPane(element, session, mappingSpec('html', 'html', 'html'), options);

/** An XML pane over a mapping id, e.g. `xml-niso-iec` or `xml-niso-iec-es` (D1). */
export const createXmlPane = (
  element: HTMLElement,
  session: BitmarkSession,
  options: PaneOptions & { mapping: string },
): BitmarkPane =>
  createPane(element, session, mappingSpec('xml', options.mapping, 'xml'), {
    label: `${session.messages.labels.xml} (${options.mapping})`,
    ...options,
  });

/** The Text pane (D1): the document's plain text. Read-only: there is no text → bitmark. */
export const createTextPane = (
  element: HTMLElement,
  session: BitmarkSession,
  options?: PaneOptions,
): BitmarkPane =>
  createPane(
    element,
    session,
    {
      type: 'text',
      language: 'plaintext',
      extension: 'txt',
      inputFormat: 'text',
      editable: false,
      scroll: 'pinned',
      needsMarkup: true,
      fromSession: async (engine, s) => {
        const { output, bitStarts } = await engine.convertWithBitStarts(s.getBitmark(), {
          inputFormat: 'bitmark',
          outputFormat: 'text',
        });
        return { text: output, bitStarts };
      },
    },
    options,
  );

/** Distinct bit types, in first-occurrence order. */
export const bitTypesOf = (bits: readonly unknown[]): string[] => {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const wrapper of bits) {
    const name = (wrapper as { bit?: { type?: unknown } })?.bit?.type;
    if (typeof name === 'string' && name !== '' && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
};

const infoFor = async (engine: BitmarkEngine, bitmark: string): Promise<string> => {
  const names = bitTypesOf(await engine.bitmarkToObjects(bitmark));
  const sections = await Promise.all(
    names.map((bit) =>
      engine.info({ infoType: 'bit', bit }).then(
        (text) => text ?? '',
        (e: Error) => `[${bit}] info failed: ${e.message}`,
      ),
    ),
  );
  return sections.join('\n\n');
};

/**
 * The Info pane (D1): the parser's `info` for each distinct bit type in the
 * document. Read-only; not in scroll sync (one section per type, not per
 * bit).
 */
export const createInfoPane = (
  element: HTMLElement,
  session: BitmarkSession,
  options?: PaneOptions,
): BitmarkPane =>
  createPane(
    element,
    session,
    {
      type: 'info',
      language: 'plaintext',
      extension: 'txt',
      inputFormat: 'text',
      editable: false,
      scroll: 'none',
      needsMarkup: true,
      fromSession: async (engine, s) => ({ text: await infoFor(engine, s.getBitmark()) }),
    },
    options,
  );

/** The format a mapping report is made into: bitmark reports into JSON, everything else into bitmark. */
export const reportTargetFor = (inputFormat: string): string =>
  inputFormat === 'bitmark' ? 'json' : 'bitmark';

/**
 * The Mappings pane (D1): the parser's mapping report for the last edit —
 * how the edited pane's format mapped. Read-only; not in scroll sync;
 * re-made on every edit, even back to an earlier text.
 */
export const createMappingsPane = (
  element: HTMLElement,
  session: BitmarkSession,
  options?: PaneOptions,
): BitmarkPane =>
  createPane(
    element,
    session,
    {
      type: 'mappings',
      language: 'plaintext',
      extension: 'txt',
      inputFormat: 'text',
      editable: false,
      scroll: 'none',
      needsMarkup: true,
      fromSession: async (engine, s) => {
        const edit = s.lastEdit;
        if (!edit || edit.content === '') return { text: '' };
        const target = reportTargetFor(edit.inputFormat);
        const report = await engine.convert(edit.content, {
          inputFormat: edit.inputFormat,
          outputFormat: target,
          mappingReport: true,
        } as Parameters<BitmarkEngine['convert']>[1]);
        return {
          text: `Last edited: ${edit.label}  (${edit.inputFormat} → ${target})\n\n${report}`,
        };
      },
    },
    options,
  );
