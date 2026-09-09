// @awa-component: PLAN-002-BitmarkMarkupTextBox
import { editor, IDisposable } from 'monaco-editor';
import { useCallback, useEffect, useRef } from 'react';
import { EditorDidMount, EditorWillUnmount } from 'react-monaco-editor';
import { Flex } from 'theme-ui';
import { useSnapshot } from 'valtio';

import { attachBitmarkDiagnostics } from '../../monaco-bitmark/bitmarkDiagnostics';
import {
  attachBitmarkHighlighter,
  BITMARK_LANGUAGE_ID,
  MONACO_THEME,
} from '../../monaco-bitmark/bitmarkLanguage';
import { useBitmarkConverter } from '../../services/BitmarkConverter';
import { bitmarkState, TAB_LABEL } from '../../state/bitmarkState';
import { MonacoTextArea, MonacoTextAreaUncontrolledProps } from '../monaco/MonacoTextArea';

const DEFAULT_MONACO_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  renderWhitespace: 'all',
  insertSpaces: false,
};

export interface BitmarkMarkupTextBoxProps extends MonacoTextAreaUncontrolledProps {
  initialMarkup?: string;
}

// @awa-impl: PLAN-002-Step6 (editor reads from active tab)
const BitmarkMarkupTextBox = (props: BitmarkMarkupTextBoxProps) => {
  const { initialMarkup, options, ...restProps } = props;
  const bitmarkStateSnap = useSnapshot(bitmarkState);
  const { jsLoadSuccess, jsLoadError, wasmLoadSuccess, wasmLoadError, markupToJson } =
    useBitmarkConverter();
  const highlighterRef = useRef<IDisposable>();
  const diagnosticsRef = useRef<IDisposable>();

  const activeTab = bitmarkStateSnap.activeMarkupTab;
  const activeSlice = bitmarkStateSnap[activeTab];

  // At least one parser must be loaded
  const anyLoadSuccess = jsLoadSuccess || wasmLoadSuccess;
  const allLoadError = jsLoadError && wasmLoadError;

  // @awa-impl: PLAN-008-Step3 (edited tab = active markup tab)
  const onInput = useCallback(
    async (markup: string) => {
      const tab = bitmarkState.activeMarkupTab;
      // @awa-impl: PLAN-014-Step3 (record the edited window for the mapping report)
      bitmarkState.setLastEdit('bitmark', markup, `${TAB_LABEL[tab]} bitmark`);
      await markupToJson(tab, markup);
    },
    [markupToJson],
  );

  // @awa-impl: PLAN-016-Step5 (bitmark editor highlighted from parser semantic tokens)
  // @awa-impl: PLAN-017-Step3 (and marked from parser diagnostics)
  const editorDidMount = useCallback<EditorDidMount>((editor) => {
    highlighterRef.current = attachBitmarkHighlighter(editor);
    diagnosticsRef.current = attachBitmarkDiagnostics(editor);
  }, []);

  const editorWillUnmount = useCallback<EditorWillUnmount>(() => {
    highlighterRef.current?.dispose();
    highlighterRef.current = undefined;
    diagnosticsRef.current?.dispose();
    diagnosticsRef.current = undefined;
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
        theme={MONACO_THEME}
        language={BITMARK_LANGUAGE_ID}
        value={value}
        options={opts}
        onInput={onInput}
        editorDidMount={editorDidMount}
        editorWillUnmount={editorWillUnmount}
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
