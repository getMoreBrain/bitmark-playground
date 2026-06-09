// @awa-component: PLAN-011-TextPanel
/** @jsxImportSource theme-ui */
import { editor } from 'monaco-editor';

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
  /** Error string from the conversion, displayed in place of text when present */
  errorAsString?: string;
}

// @awa-impl: PLAN-011-Step3 (read-only plain-text view)
const TextPanel = ({ text, errorAsString }: TextPanelProps) => {
  const value = errorAsString ?? text;

  return (
    <MonacoTextArea
      theme="vs-dark"
      language="plaintext"
      value={value}
      options={READ_ONLY_OPTIONS}
    />
  );
};

export { TextPanel };
