// @awa-component: PLAN-006-WasmCheckPanel
/** @jsxImportSource theme-ui */
import { editor } from 'monaco-editor';
import { useCallback } from 'react';
import { EditorDidMount, EditorWillUnmount } from 'react-monaco-editor';

import { BITMARK_LANGUAGE_ID } from '../../lib/monaco';
import { MONACO_THEME } from '../../lib/theme/tokens';
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

// @awa-impl: PLAN-006-Step5 (read-only round-trip bitmark view)
const WasmCheckPanel = ({ markup, errorAsString }: WasmCheckPanelProps) => {
  const { attach, detach } = useBitmarkEditorServices(READ_ONLY_SERVICES);
  const { onMount: scrollSyncMount, onUnmount: scrollSyncUnmount } = useSplitScrollSync('output');

  // @awa-impl: PLAN-016-Step5 (bitmark editor highlighted from parser semantic tokens)
  // @awa-impl: PLAN-018-Step7 (and linked to the bitmark editor's scrolling)
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
