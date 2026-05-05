// @awa-component: PLAN-006-WasmCheckPanel
/** @jsxImportSource theme-ui */
import { editor } from 'monaco-editor';
import * as MonacoModule from 'monaco-editor';
import { useCallback } from 'react';
import { EditorDidMount } from 'react-monaco-editor';
import { Parser } from 'web-tree-sitter';

import treeSitterBitmarkGrammar from '../../monaco-tree-sitter/grammars/bitmark.json';
import { Language } from '../../monaco-tree-sitter/language';
import { MonacoTreeSitter } from '../../monaco-tree-sitter/monaco-tree-sitter';
import { Grammar } from '../../monaco-tree-sitter/types/grammer';
import { MonacoTextArea } from '../monaco/MonacoTextArea';

const READ_ONLY_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  readOnly: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  renderWhitespace: 'all',
  insertSpaces: false,
};

export interface WasmCheckPanelProps {
  /** Bitmark markup produced by feeding wasm.jsonAsString through the JS parser */
  markup: string;
  /** Error string from the JS parser, displayed in place of markup when present */
  errorAsString?: string;
}

// @awa-impl: PLAN-006-Step5 (read-only round-trip bitmark view)
const WasmCheckPanel = ({ markup, errorAsString }: WasmCheckPanelProps) => {
  const editorDidMount = useCallback<EditorDidMount>((editor, _monaco) => {
    const language = new Language(treeSitterBitmarkGrammar as Grammar);
    const languageWasmPath = new URL(`../../tree-sitter-bitmark.wasm`, import.meta.url).toString();
    void language.init(languageWasmPath, Parser).then(() => {
      new MonacoTreeSitter(MonacoModule, editor, language);
    });
  }, []);

  const value = errorAsString ?? markup;

  return (
    <MonacoTextArea
      theme="vs-dark"
      language="bitmark"
      value={value}
      options={READ_ONLY_OPTIONS}
      editorDidMount={editorDidMount}
    />
  );
};

export { WasmCheckPanel };
