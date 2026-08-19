// @awa-component: PLAN-007-TableHtmlPanel
/** @jsxImportSource theme-ui */
// Register the HTML basic-language so the editor highlights HTML. The app
// aliases bare `monaco-editor` to the selective editor API (no languages), so
// the contribution must be imported explicitly.
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution';

import { editor } from 'monaco-editor';
import { useCallback } from 'react';
import { Flex } from 'theme-ui';

import { useBitmarkConverter } from '../../services/BitmarkConverter';
import { useBitmarkParser } from '../../services/BitmarkParser';
import { applyHtmlEdit } from '../../services/TableHtmlRunner';
import { MonacoTextArea } from '../monaco/MonacoTextArea';

const DEFAULT_MONACO_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  wordWrap: 'on',
};

export interface TableHtmlPanelProps {
  /** Current HTML-table document (bidirectionally synced with the Original bitmark) */
  html: string;
  /** Last conversion error (either direction), shown in place of the html when present */
  errorAsString?: string;
}

// @awa-impl: PLAN-007-Step3 (editable HTML editor; HTML -> bitmark on input)
const TableHtmlPanel = ({ html, errorAsString }: TableHtmlPanelProps) => {
  const { convert: wasmConvert } = useBitmarkParser();
  const { markupToJson } = useBitmarkConverter();

  const onInput = useCallback(
    async (nextHtml: string) => {
      if (!wasmConvert) return;
      await applyHtmlEdit(wasmConvert, nextHtml, markupToJson);
    },
    [wasmConvert, markupToJson],
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

  // @awa-impl: PLAN-007-Step3 (surface conversion errors inside the editor)
  // Show the error text in the editor itself (in place of the html) so a blank
  // pane is never mistaken for a broken view. The editor is not overwritten
  // while focused, so this does not interrupt active editing.
  const value = errorAsString ?? html;

  return (
    <MonacoTextArea
      theme="vs-dark"
      language="html"
      value={value}
      options={DEFAULT_MONACO_OPTIONS}
      onInput={onInput}
    />
  );
};

export { TableHtmlPanel };
