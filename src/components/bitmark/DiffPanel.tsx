// @awa-component: PLAN-005-DiffPanel
/** @jsxImportSource theme-ui */
import { IDisposable } from 'monaco-editor';
import { useCallback, useRef } from 'react';
import { DiffEditorDidMount, DiffEditorWillUnmount } from 'react-monaco-editor';

import {
  attachBitmarkHighlighter,
  BITMARK_LANGUAGE_ID,
  MONACO_THEME,
} from '../../monaco-bitmark/bitmarkLanguage';
import { MonacoDiffEditorAutoResize } from '../monaco/MonacoDiffEditorAutoResize';

export interface DiffPanelProps {
  /** Left side content (JS / "Original" parser output) */
  original: string;
  /** Right side content (WASM parser output) */
  modified: string;
  /** Monaco language id (e.g. 'bitmark', 'json') */
  language: string;
}

// @awa-impl: PLAN-005-Step2 (read-only inline diff viewer)
const DiffPanel = ({ original, modified, language }: DiffPanelProps) => {
  const highlightersRef = useRef<IDisposable[]>([]);

  // @awa-impl: PLAN-016-Step5 (bitmark diff highlighted from parser semantic tokens)
  const editorDidMount = useCallback<DiffEditorDidMount>(
    (diffEditor) => {
      if (language !== BITMARK_LANGUAGE_ID) return;
      highlightersRef.current = [
        attachBitmarkHighlighter(diffEditor.getOriginalEditor()),
        attachBitmarkHighlighter(diffEditor.getModifiedEditor()),
      ];
    },
    [language],
  );

  const editorWillUnmount = useCallback<DiffEditorWillUnmount>(() => {
    for (const highlighter of highlightersRef.current) highlighter.dispose();
    highlightersRef.current = [];
  }, []);

  return (
    <MonacoDiffEditorAutoResize
      original={original}
      value={modified}
      language={language}
      theme={MONACO_THEME}
      options={{
        readOnly: true,
        renderSideBySide: false,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        renderOverviewRuler: false,
        automaticLayout: true,
      }}
      editorDidMount={editorDidMount}
      editorWillUnmount={editorWillUnmount}
    />
  );
};

export { DiffPanel };
