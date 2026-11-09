import { BITMARK_LANGUAGE_ID, MONACO_THEME } from '@gmb/bitmark-editor';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorDidMount, EditorWillUnmount } from 'react-monaco-editor';
import { Box, Flex } from 'theme-ui';
import { useSnapshot } from 'valtio';

import { SearchArea, SearchEditor, useSearchTarget } from '../../search';
import { useBitmarkParser } from '../../services/BitmarkParser';
import { useDiffSync } from '../../services/DiffSyncProvider';
import { createInputScheduler } from '../../services/inputScheduler';
import { JSON_TAB_LABEL } from '../../state/bitmarkState';
import { diffState } from '../../state/diffState';
import { MonacoTextArea, MonacoTextAreaUncontrolledProps } from '../monaco/MonacoTextArea';
import { useBitmarkEditorServices } from '../monaco/useBitmarkEditorServices';
import { BITMARK_MONACO_OPTIONS } from './BitmarkMarkupTextBox';
import { PANE_COLUMN_SX, PANE_EDITOR_SX, PaneBanner, ParserLoadingPane } from './ParserLoadingPane';

export const FINAL_BITMARK_LABEL = 'Final Bitmark';

interface BitmarkEditorProps extends MonacoTextAreaUncontrolledProps {
  searchArea: SearchArea;
  searchLabel: string;
  value: string;
  onInput: (value: string) => void;
  /** A message over the editor, e.g. why the Diff does not apply. */
  banner?: string;
}

/**
 * A bitmark editor of the Diff panes (PLAN-032 D2, D3): the parser's editor
 * services, searchable, not scroll-linked; a large document's edits wait
 * for a pause in typing (D9). Its banner sits below the editor, so the text
 * does not move as it comes and goes (a Diff being typed rarely applies),
 * and does not remount the editor.
 */
const BitmarkEditor = (props: BitmarkEditorProps) => {
  const { searchArea, searchLabel, value, onInput, banner, options, className, ...restProps } =
    props;
  const { loadSuccess, loadError } = useBitmarkParser();
  const { attach, detach } = useBitmarkEditorServices();
  const [searchEditor, setSearchEditor] = useState<SearchEditor>();
  useSearchTarget(searchArea, searchLabel, searchEditor);

  const latestOnInput = useRef(onInput);
  latestOnInput.current = onInput;
  const scheduler = useMemo(() => createInputScheduler((text) => latestOnInput.current(text)), []);
  useEffect(() => () => scheduler.flush(), [scheduler]);
  const blurListener = useRef<{ dispose(): void }>();

  const editorDidMount = useCallback<EditorDidMount>(
    (editor) => {
      attach(editor);
      setSearchEditor(editor);
      blurListener.current = editor.onDidBlurEditorText(() => scheduler.flush());
    },
    [attach, scheduler],
  );
  const editorWillUnmount = useCallback<EditorWillUnmount>(() => {
    blurListener.current?.dispose();
    scheduler.flush();
    detach();
    setSearchEditor(undefined);
  }, [detach, scheduler]);

  if (!loadSuccess) {
    return (
      <ParserLoadingPane
        message={loadError ? 'Load failed.' : 'Loading...'}
        className={className}
        options={{ ...BITMARK_MONACO_OPTIONS, ...options }}
      />
    );
  }
  return (
    <Flex className={className ?? undefined} sx={PANE_COLUMN_SX}>
      <Box sx={PANE_EDITOR_SX}>
        <MonacoTextArea
          {...restProps}
          theme={MONACO_THEME}
          language={BITMARK_LANGUAGE_ID}
          value={value}
          options={{ ...BITMARK_MONACO_OPTIONS, ...options }}
          onInput={scheduler.input}
          editorDidMount={editorDidMount}
          editorWillUnmount={editorWillUnmount}
        />
      </Box>
      {banner ? <PaneBanner>{banner}</PaneBanner> : null}
    </Flex>
  );
};

/** The Final Bitmark panel's editor (PLAN-032 D2). */
export const FinalBitmarkTextBox = (props: MonacoTextAreaUncontrolledProps) => {
  const { finalMarkup } = useSnapshot(diffState);
  return (
    <BitmarkEditor
      {...props}
      searchArea="middle"
      searchLabel={FINAL_BITMARK_LABEL}
      value={finalMarkup}
      onInput={diffState.setFinalMarkup}
    />
  );
};

/** The Diff tab's editor (PLAN-032 D3): an edit is applied, or says why not (D5). */
export const DiffTextBox = (props: MonacoTextAreaUncontrolledProps) => {
  const { diff, diffErrorAsString, applyErrorAsString } = useSnapshot(diffState);
  const sync = useDiffSync();
  const onInput = useCallback((text: string) => sync?.applyDiff(text), [sync]);
  return (
    <BitmarkEditor
      {...props}
      searchArea="right"
      searchLabel={JSON_TAB_LABEL.diff}
      value={diffErrorAsString ?? diff}
      onInput={onInput}
      banner={
        applyErrorAsString === undefined
          ? undefined
          : `Not applied, Final Bitmark is unchanged: ${applyErrorAsString}`
      }
    />
  );
};
