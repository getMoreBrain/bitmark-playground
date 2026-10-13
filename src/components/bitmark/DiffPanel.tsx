/** @jsxImportSource theme-ui */
import { BITMARK_LANGUAGE_ID } from '@gmb/bitmark-editor';
import { MONACO_THEME } from '@gmb/bitmark-editor';
import { useCallback, useState } from 'react';
import { DiffEditorDidMount, DiffEditorWillUnmount } from 'react-monaco-editor';

import { SearchArea, SearchEditor, useSearchTarget } from '../../search';
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
  /** Where the panel is, for the playground search (PLAN-024). */
  searchArea?: SearchArea;
  /** The panel's name in the playground search. */
  searchLabel?: string;
}

const DiffPanel = ({ original, modified, language, searchArea, searchLabel }: DiffPanelProps) => {
  const { attach, detach } = useBitmarkEditorServices(READ_ONLY_SERVICES);
  // Inline diff: the modified editor is the one on screen (deleted lines are
  // view zones in it), so it is the one searched.
  const [searchEditor, setSearchEditor] = useState<SearchEditor>();
  useSearchTarget(searchArea ?? 'bottomLeft', searchLabel ?? 'Diff', searchArea && searchEditor);

  const editorDidMount = useCallback<DiffEditorDidMount>(
    (diffEditor) => {
      setSearchEditor(diffEditor.getModifiedEditor());
      if (language !== BITMARK_LANGUAGE_ID) return;
      attach(diffEditor.getOriginalEditor());
      attach(diffEditor.getModifiedEditor());
    },
    [attach, language],
  );

  const editorWillUnmount = useCallback<DiffEditorWillUnmount>(() => {
    detach();
    setSearchEditor(undefined);
  }, [detach]);

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
