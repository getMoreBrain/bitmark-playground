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
import { useBitmarkParserGenerator } from '../../services/BitmarkParserGenerator';
import { convertHtmlToBitmark } from '../../services/TableHtmlRunner';
import { bitmarkState } from '../../state/bitmarkState';
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
  const { bitmarkParserGenerator } = useBitmarkParserGenerator();
  const { markupToJson } = useBitmarkConverter();

  const onInput = useCallback(
    async (nextHtml: string) => {
      if (!bitmarkParserGenerator) return;

      let markup = '';
      let htmlError: Error | undefined;
      let durationSec: number | undefined;

      try {
        const result = await convertHtmlToBitmark(bitmarkParserGenerator, nextHtml);
        markup = result.markup;
        durationSec = result.durationSec;
      } catch (e) {
        htmlError = e as Error;
      }

      // Record the HTML the user is editing (so the editor is never clobbered
      // while focused) plus the conversion duration / error.
      bitmarkState.setTableHtml(nextHtml, htmlError, durationSec);

      if (htmlError) return;

      // Push the converted bitmark into Original ('js') and run it through the
      // parser(s). `convertHtmlToBitmark` already pre-seeded the Original -> HTML
      // dedupe, so this write does not bounce back and overwrite the HTML being edited.
      await markupToJson('js', markup);
    },
    [bitmarkParserGenerator, markupToJson],
  );

  if (!bitmarkParserGenerator) {
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
