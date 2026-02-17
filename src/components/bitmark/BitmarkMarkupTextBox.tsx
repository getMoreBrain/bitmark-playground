// @zen-component: PLAN-002-BitmarkMarkupTextBox
import { editor } from 'monaco-editor';
import * as MonacoModule from 'monaco-editor';
import { useCallback, useEffect } from 'react';
import { EditorDidMount } from 'react-monaco-editor';
import { Flex } from 'theme-ui';
import { useSnapshot } from 'valtio';
import { Parser } from 'web-tree-sitter';

import treeSitterBitmarkGrammar from '../../monaco-tree-sitter/grammars/bitmark.json';
import { Language } from '../../monaco-tree-sitter/language';
import { MonacoTreeSitter } from '../../monaco-tree-sitter/monaco-tree-sitter';
import { Grammar } from '../../monaco-tree-sitter/types/grammer';
import { useBitmarkConverter } from '../../services/BitmarkConverter';
import { bitmarkState } from '../../state/bitmarkState';
import { MonacoTextArea, MonacoTextAreaUncontrolledProps } from '../monaco/MonacoTextArea';

const DEFAULT_MONACO_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  renderWhitespace: 'all',
  insertSpaces: false,
};

export interface BitmarkMarkupTextBoxProps extends MonacoTextAreaUncontrolledProps {
  initialMarkup?: string;
}

// @zen-impl: PLAN-002-Step6 (editor reads from active tab)
const BitmarkMarkupTextBox = (props: BitmarkMarkupTextBoxProps) => {
  const { initialMarkup, options, ...restProps } = props;
  const bitmarkStateSnap = useSnapshot(bitmarkState);
  const { jsLoadSuccess, jsLoadError, wasmLoadSuccess, wasmLoadError, markupToJson } =
    useBitmarkConverter();

  const activeTab = bitmarkStateSnap.activeMarkupTab;
  const activeSlice = bitmarkStateSnap[activeTab];

  // At least one parser must be loaded
  const anyLoadSuccess = jsLoadSuccess || wasmLoadSuccess;
  const allLoadError = jsLoadError && wasmLoadError;

  const onInput = useCallback(
    async (markup: string) => {
      await markupToJson(markup, {
        jsonOptions: {
          enableWarnings: true,
        },
      });
    },
    [markupToJson],
  );

  const editorDidMount = useCallback<EditorDidMount>((editor, _monaco) => {
    const language = new Language(treeSitterBitmarkGrammar as Grammar);
    const languageWasmPath = new URL('../../tree-sitter-bitmark.wasm', import.meta.url).toString();
    void language.init(languageWasmPath, Parser).then(() => {
      new MonacoTreeSitter(MonacoModule, editor, language);
    });
  }, []);

  // Do initial conversion with the initial markup
  useEffect(() => {
    if (!initialMarkup) return;
    void onInput(initialMarkup ?? '');
  }, [initialMarkup, onInput]);

  if (anyLoadSuccess) {
    const opts = {
      ...DEFAULT_MONACO_OPTIONS,
      ...options,
    };

    const value = activeSlice.markupErrorAsString ?? activeSlice.markup;
    return (
      <MonacoTextArea
        {...restProps}
        theme="vs-dark"
        language={'bitmark'}
        value={value}
        options={opts}
        onInput={onInput}
        editorDidMount={editorDidMount}
      />
    );
  } else {
    let text = 'Loading...';
    if (allLoadError) {
      text = 'Load failed.';
    }
    return (
      <Flex
        sx={{
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {text}
      </Flex>
    );
  }
};

export { BitmarkMarkupTextBox };
