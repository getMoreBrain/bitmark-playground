// @awa-component: PLAN-011-TextPanel
/** @jsxImportSource theme-ui */
import { MONACO_THEME } from '@gmb/bitmark-editor';
import { editor } from 'monaco-editor';

import { usePinnedScrollSync } from '../../scrollSync/useScrollSync';
import { MonacoTextArea } from '../monaco/MonacoTextArea';

const READ_ONLY_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  readOnly: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on',
};

export interface TextPanelProps {
  /** Plain text produced from the WASM optimized bitmark */
  text: string;
  /** Where each bit starts in `text`, recorded by the conversion (PLAN-018 D1) */
  bitStarts?: readonly number[];
  /** Error string from the conversion, displayed in place of text when present */
  errorAsString?: string;
}

// @awa-impl: PLAN-011-Step3 (read-only plain-text view)
const TextPanel = ({ text, bitStarts, errorAsString }: TextPanelProps) => {
  // @awa-impl: PLAN-018-Step7 (linked to the bitmark editor's scrolling)
  const { onMount, onUnmount } = usePinnedScrollSync(text, bitStarts);
  const value = errorAsString ?? text;

  return (
    <MonacoTextArea
      theme={MONACO_THEME}
      language="plaintext"
      value={value}
      options={READ_ONLY_OPTIONS}
      editorDidMount={onMount}
      editorWillUnmount={onUnmount}
    />
  );
};

export { TextPanel };
