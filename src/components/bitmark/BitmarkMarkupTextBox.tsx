import { editor } from 'monaco-editor';
import * as MonacoModule from 'monaco-editor';
import { EditorDidMount } from 'react-monaco-editor';
import { useCallback, useEffect } from 'react';
import { Flex } from 'theme-ui';
import { useSnapshot } from 'valtio';
import { Parser } from 'web-tree-sitter';

import treeSitterBitmarkGrammar from '../../monaco-tree-sitter/grammars/bitmark.json';
// import treeSitterCppGrammar from '../../monaco-tree-sitter/grammars/cpp.json';
// import treeSitterTypescriptGrammar from '../../monaco-tree-sitter/grammars/typescript.json';
import { Language } from '../../monaco-tree-sitter/language';
import { MonacoTreeSitter } from '../../monaco-tree-sitter/monaco-tree-sitter';
import { Grammar } from '../../monaco-tree-sitter/types/grammer';
import { useBitmarkConverter } from '../../services/BitmarkConverter';
import { bitmarkState } from '../../state/bitmarkState';
import { MonacoTextArea, MonacoTextAreaUncontrolledProps } from '../monaco/MonacoTextArea';
import { buildInfo } from '../../generated/build-info';

const DEFAULT_MONACO_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  renderWhitespace: 'all',
  insertSpaces: false,
};

export interface BitmarkMarkupTextBoxProps extends MonacoTextAreaUncontrolledProps {
  initialMarkup?: string;
}

const BitmarkMarkupTextBox = (props: BitmarkMarkupTextBoxProps) => {
  const { initialMarkup, options, ...restProps } = props;
  const bitmarkStateSnap = useSnapshot(bitmarkState);
  const { loadSuccess, loadError, markupToJson } = useBitmarkConverter();

  const onInput = useCallback(
    async (markup: string) => {
      await markupToJson(markup, {
        jsonOptions: {
          enableWarnings: true,
          // textAsPlainText: true,
        },
      });
    },
    [markupToJson],
  );

  const editorDidMount = useCallback<EditorDidMount>((editor, _monaco) => {
    // HACK: Init monaco-tree-sitter language

    // editor.updateOptions({
    //   // Disable the default monaco highlighter
    //   // This is needed because monaco-tree-sitter will handle the highlighter
    //   // and monaco will not be able to handle the tree-sitter highlighter
    //   wordWrap: 'on',
    //   bracketPairColorization: {
    //     enabled: false,
    //   },
    // });

    // Load the tree-sitter language WASM file
    // const languageWasmPath = new URL('./tree-sitter-languages.wasm', import.meta.url).toString();
    // const language = new Language(treeSitterTypescriptGrammar as Grammar);
    // const language = new Language(treeSitterCppGrammar as Grammar);
    const language = new Language(treeSitterBitmarkGrammar as Grammar);

    // TODO - this loads the language WASM file (is async, should be awaited)
    // const languageWasmPath = new URL('../../tree-sitter-typescript.wasm', import.meta.url).toString();
    const languageWasmPath = new URL(`../../tree-sitter-bitmark.wasm?${buildInfo.version}`, import.meta.url).toString();
    language.init(languageWasmPath, Parser).then(() => {
      // Apply the language to the editor
      new MonacoTreeSitter(MonacoModule, editor, language);
    });
  }, []);

  // Do initial conversion with the initial markup
  useEffect(() => {
    if (!initialMarkup) return;
    onInput(initialMarkup ?? '');
  }, [initialMarkup, onInput]);

  if (loadSuccess) {
    const opts = {
      ...DEFAULT_MONACO_OPTIONS,
      ...options,
    };

    const value = bitmarkStateSnap.markupErrorAsString ?? bitmarkStateSnap.markup;
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
    if (loadError) {
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
