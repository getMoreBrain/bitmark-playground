/** @jsxImportSource theme-ui */
import { BITMARK_LANGUAGE_ID } from '@gmb/bitmark-editor';
import { MONACO_THEME } from '@gmb/bitmark-editor';
import { editor } from 'monaco-editor';
import { useCallback } from 'react';
import { EditorDidMount, EditorWillUnmount } from 'react-monaco-editor';

import { useSplitScrollSync } from '../../scrollSync/useScrollSync';
import { MonacoTextArea } from '../monaco/MonacoTextArea';
import { useBitmarkEditorServices } from '../monaco/useBitmarkEditorServices';

const READ_ONLY_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  readOnly: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  renderWhitespace: 'all',
  insertSpaces: false,
};

/** A read-only view: highlighted, not validated. */
const READ_ONLY_SERVICES = { diagnostics: false } as const;

export interface WasmCheckPanelProps {
  /** Bitmark markup produced by feeding wasm.jsonAsString through the JS parser */
  markup: string;
  /** Error string from the JS parser, displayed in place of markup when present */
  errorAsString?: string;
}

const WasmCheckPanel = ({ markup, errorAsString }: WasmCheckPanelProps) => {
  const { attach, detach } = useBitmarkEditorServices(READ_ONLY_SERVICES);
  const { onMount: scrollSyncMount, onUnmount: scrollSyncUnmount } = useSplitScrollSync();

  const editorDidMount = useCallback<EditorDidMount>(
    (editor) => {
      attach(editor);
      scrollSyncMount(editor);
    },
    [attach, scrollSyncMount],
  );

  const editorWillUnmount = useCallback<EditorWillUnmount>(() => {
    detach();
    scrollSyncUnmount();
  }, [detach, scrollSyncUnmount]);

  const value = errorAsString ?? markup;

  return (
    <MonacoTextArea
      theme={MONACO_THEME}
      language={BITMARK_LANGUAGE_ID}
      value={value}
      options={READ_ONLY_OPTIONS}
      editorDidMount={editorDidMount}
      editorWillUnmount={editorWillUnmount}
    />
  );
};

export { WasmCheckPanel };
