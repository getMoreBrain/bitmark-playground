// @awa-component: PLAN-013-XmlPanel
/** @jsxImportSource theme-ui */
// Register the XML basic-language so the editor highlights XML. The app
// aliases bare `monaco-editor` to the selective editor API (no languages), so
// the contribution must be imported explicitly.
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution';

import { editor } from 'monaco-editor';
import { useCallback } from 'react';
import { Flex } from 'theme-ui';

import { useBitmarkConverter } from '../../services/BitmarkConverter';
import { useBitmarkParser } from '../../services/BitmarkParser';
import { applyXmlEdit } from '../../services/XmlRunner';
import { XmlVariant } from '../../state/bitmarkState';
import { MonacoTextArea } from '../monaco/MonacoTextArea';

/**
 * The parser emits the whole NISO-STS document as a SINGLE line (no newlines
 * between elements). Monaco stops tokenizing any line longer than
 * `maxTokenizationLineLength` (default 20,000 chars) for performance, which
 * silently disables syntax highlighting on every non-trivial document — the
 * text renders, just unhighlighted. Raise the limit so the XML is always
 * highlighted; `wordWrap` keeps that single line readable.
 */
const XML_MAX_TOKENIZATION_LINE_LENGTH = 10_000_000;

const DEFAULT_MONACO_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  wordWrap: 'on',
  maxTokenizationLineLength: XML_MAX_TOKENIZATION_LINE_LENGTH,
};

export interface XmlPanelProps {
  /** Which XML mapping this panel edits */
  variant: XmlVariant;
  /** Current NISO-STS XML document (bidirectionally synced with the WASM bitmark) */
  xml: string;
  /** Last conversion error (either direction), shown in place of the xml when present */
  errorAsString?: string;
}

// @awa-impl: PLAN-013-Step3 (editable XML editor; XML -> WASM bitmark on input)
const XmlPanel = ({ variant, xml, errorAsString }: XmlPanelProps) => {
  const { convert: wasmConvert } = useBitmarkParser();
  const { markupToJson } = useBitmarkConverter();

  const onInput = useCallback(
    async (nextXml: string) => {
      if (!wasmConvert) return;
      await applyXmlEdit(wasmConvert, variant, nextXml, markupToJson);
    },
    [wasmConvert, markupToJson, variant],
  );

  if (!wasmConvert) {
    return (
      <Flex
        sx={{
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        Loading...
      </Flex>
    );
  }

  // @awa-impl: PLAN-013-Step3 (surface conversion errors inside the editor)
  // Show the error text in the editor itself (in place of the xml) so a blank
  // pane is never mistaken for a broken view. The editor is not overwritten
  // while focused, so this does not interrupt active editing.
  const value = errorAsString ?? xml;

  return (
    <MonacoTextArea
      theme="vs-dark"
      language="xml"
      value={value}
      options={DEFAULT_MONACO_OPTIONS}
      onInput={onInput}
    />
  );
};

export { XML_MAX_TOKENIZATION_LINE_LENGTH, XmlPanel };
