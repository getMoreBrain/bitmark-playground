import { BITMARK_LANGUAGE_ID, MONACO_THEME } from '@gmb/bitmark-editor';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorDidMount, EditorWillUnmount } from 'react-monaco-editor';
import { Flex } from 'theme-ui';
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

export const FINAL_BITMARK_LABEL = 'Final Bitmark';

interface BitmarkEditorProps extends MonacoTextAreaUncontrolledProps {
  searchArea: SearchArea;
  searchLabel: string;
  value: string;
  onInput: (value: string) => void;
}

/**
 * A bitmark editor of the Diff panes (PLAN-032 D2, D3): the parser's editor
 * services, searchable, not scroll-linked; a large document's edits wait
 * for a pause in typing (D9).
 */
const BitmarkEditor = (props: BitmarkEditorProps) => {
  const { searchArea, searchLabel, value, onInput, options, ...restProps } = props;
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
      <Flex sx={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        {loadError ? 'Load failed.' : 'Loading...'}
      </Flex>
    );
  }
  return (
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

/** The Diff tab's editor (PLAN-032 D3): an edit is applied (D5). */
export const DiffTextBox = (props: MonacoTextAreaUncontrolledProps) => {
  const { diff, diffErrorAsString } = useSnapshot(diffState);
  const sync = useDiffSync();
  const onInput = useCallback((text: string) => sync?.applyDiff(text), [sync]);
  return (
    <BitmarkEditor
      {...props}
      searchArea="right"
      searchLabel={JSON_TAB_LABEL.diff}
      value={diffErrorAsString ?? diff}
      onInput={onInput}
    />
  );
};
