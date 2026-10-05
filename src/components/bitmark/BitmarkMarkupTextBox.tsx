// @awa-component: PLAN-002-BitmarkMarkupTextBox
import { BITMARK_LANGUAGE_ID } from '@gmb/bitmark-editor';
import { MONACO_THEME } from '@gmb/bitmark-editor';
import { editor } from 'monaco-editor';
import { useCallback, useEffect } from 'react';
import { EditorDidMount, EditorWillUnmount } from 'react-monaco-editor';
import { Flex } from 'theme-ui';
import { useSnapshot } from 'valtio';

import { useSplitScrollSync } from '../../scrollSync/useScrollSync';
import { useBitmarkConverter } from '../../services/BitmarkConverter';
import { bitmarkState, TAB_LABEL } from '../../state/bitmarkState';
import { MonacoTextArea, MonacoTextAreaUncontrolledProps } from '../monaco/MonacoTextArea';
import { useBitmarkEditorServices } from '../monaco/useBitmarkEditorServices';

const DEFAULT_MONACO_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  renderWhitespace: 'all',
  insertSpaces: false,
  // Bitmark is prose with markup in it: the suggestion list opens on the
  // characters that begin a construct (`[`, `=`, …) and on Ctrl+Space, never
  // on every letter typed (parser PLAN-203 D1).
  quickSuggestions: false,
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
  const services = useBitmarkEditorServices();
  const scrollSync = useSplitScrollSync();

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
  // @awa-impl: PLAN-018-Step7 (and linked to the output pane's scrolling)
  // @awa-impl: PLAN-021-Step2 (through the lib's per-editor services)
  const { onMount: scrollSyncMount, onUnmount: scrollSyncUnmount } = scrollSync;
  const { attach, detach } = services;
  const editorDidMount = useCallback<EditorDidMount>(
    (editor) => {
      attach(editor);
      scrollSyncMount(editor);
    },
    [attach, scrollSyncMount],
  );

  const editorWillUnmount = useCallback<EditorWillUnmount>(() => {
    detach();
    scrollSyncUnmount();
  }, [detach, scrollSyncUnmount]);

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
