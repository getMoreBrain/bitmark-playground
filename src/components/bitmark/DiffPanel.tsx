// @zen-component: PLAN-005-DiffPanel
/** @jsxImportSource theme-ui */

import { MonacoDiffEditorAutoResize } from '../monaco/MonacoDiffEditorAutoResize';

export interface DiffPanelProps {
  /** Left side content (JS / "Original" parser output) */
  original: string;
  /** Right side content (WASM parser output) */
  modified: string;
  /** Monaco language id (e.g. 'bitmark', 'json') */
  language: string;
}

// @zen-impl: PLAN-005-Step2 (read-only inline diff viewer)
const DiffPanel = ({ original, modified, language }: DiffPanelProps) => {
  return (
    <MonacoDiffEditorAutoResize
      original={original}
      value={modified}
      language={language}
      theme="vs-dark"
      options={{
        readOnly: true,
        renderSideBySide: false,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        renderOverviewRuler: false,
        automaticLayout: true,
      }}
    />
  );
};

export { DiffPanel };
