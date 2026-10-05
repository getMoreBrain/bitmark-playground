// @awa-component: PLAN-005-DiffPanel
/** @jsxImportSource theme-ui */
import { BITMARK_LANGUAGE_ID } from '@gmb/bitmark-editor';
import { MONACO_THEME } from '@gmb/bitmark-editor';
import { useCallback } from 'react';
import { DiffEditorDidMount, DiffEditorWillUnmount } from 'react-monaco-editor';

import { MonacoDiffEditorAutoResize } from '../monaco/MonacoDiffEditorAutoResize';
import { useBitmarkEditorServices } from '../monaco/useBitmarkEditorServices';

/** A read-only view: highlighted, not validated. */
const READ_ONLY_SERVICES = { diagnostics: false } as const;

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
  const { attach, detach } = useBitmarkEditorServices(READ_ONLY_SERVICES);

  // @awa-impl: PLAN-016-Step5 (bitmark diff highlighted from parser semantic tokens)
  const editorDidMount = useCallback<DiffEditorDidMount>(
    (diffEditor) => {
      if (language !== BITMARK_LANGUAGE_ID) return;
      attach(diffEditor.getOriginalEditor());
      attach(diffEditor.getModifiedEditor());
    },
    [attach, language],
  );

  const editorWillUnmount = useCallback<DiffEditorWillUnmount>(() => detach(), [detach]);

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
