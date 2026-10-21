import { BITMARK_LANGUAGE_ID } from '@gmb/bitmark-editor';
import { MONACO_THEME } from '@gmb/bitmark-editor';
import { editor } from 'monaco-editor';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorDidMount, EditorWillUnmount } from 'react-monaco-editor';
import { Flex } from 'theme-ui';
import { useSnapshot } from 'valtio';

import { useSplitScrollSync } from '../../scrollSync/useScrollSync';
import { SearchEditor, useSearchTarget } from '../../search';
import { bitmarkLabel } from '../../search/labels';
import { useBitmarkConverter } from '../../services/BitmarkConverter';
import { createInputScheduler } from '../../services/inputScheduler';
import { bitmarkState, MARKUP_TAB_LABEL, MarkupTabType, tabParser } from '../../state/bitmarkState';
import { uiState } from '../../state/uiState';
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

const BitmarkMarkupTextBox = (props: BitmarkMarkupTextBoxProps) => {
  const { initialMarkup, options, ...restProps } = props;
  const bitmarkStateSnap = useSnapshot(bitmarkState);
  const {
    jsLoadSuccess,
    jsLoadError,
    wasmLoadSuccess,
    wasmLoadError,
    markupToJson,
    regenerateWasmMarkup,
    regenerateWasm,
    syncLegacy,
  } = useBitmarkConverter();
  const { toggleTags, fullOutput, showLegacy } = useSnapshot(uiState);
  const services = useBitmarkEditorServices();
  const scrollSync = useSplitScrollSync();
  const [searchEditor, setSearchEditor] = useState<SearchEditor>();

  const activeTab = bitmarkStateSnap.activeMarkupTab;
  const activeSlice = bitmarkStateSnap[tabParser(activeTab)];
  useSearchTarget('left', bitmarkLabel(activeTab), searchEditor);

  // The tab's own parser must be loaded
  const loadSuccess = activeTab === 'legacy' ? jsLoadSuccess : wasmLoadSuccess;
  const loadError = activeTab === 'legacy' ? jsLoadError : wasmLoadError;

  const onInput = useCallback(
    async (markup: string, tab: MarkupTabType = bitmarkState.activeMarkupTab) => {
      bitmarkState.setLastEdit('bitmark', markup, MARKUP_TAB_LABEL[tab]);
      await markupToJson(tabParser(tab), markup);
    },
    [markupToJson],
  );

  // A large document's edits wait for a pause in typing (PLAN-029 D3).
  // A pending edit belongs to the tab it was typed in, even if it runs after
  // a tab switch; it is never lost (run on blur and unmount).
  const latestOnInput = useRef(onInput);
  latestOnInput.current = onInput;
  const typedIn = useRef<MarkupTabType>('bitmark');
  const scheduler = useMemo(
    () => createInputScheduler((markup) => void latestOnInput.current(markup, typedIn.current)),
    [],
  );
  const onUserInput = useCallback(
    (markup: string) => {
      typedIn.current = bitmarkState.activeMarkupTab;
      scheduler.input(markup);
    },
    [scheduler],
  );
  useEffect(() => () => scheduler.flush(), [scheduler]);
  const blurListener = useRef<{ dispose(): void }>();

  const { onMount: scrollSyncMount, onUnmount: scrollSyncUnmount } = scrollSync;
  const { attach, detach } = services;
  const editorDidMount = useCallback<EditorDidMount>(
    (editor) => {
      attach(editor);
      scrollSyncMount(editor);
      setSearchEditor(editor);
      blurListener.current = editor.onDidBlurEditorText(() => scheduler.flush());
    },
    [attach, scrollSyncMount, scheduler],
  );

  const editorWillUnmount = useCallback<EditorWillUnmount>(() => {
    blurListener.current?.dispose();
    scheduler.flush();
    detach();
    scrollSyncUnmount();
    setSearchEditor(undefined);
  }, [detach, scrollSyncUnmount, scheduler]);

  // Do initial conversion with the initial markup; again as the parsers load
  // (each changes `onInput`), but only while the document is still the
  // initial one: once edited in any pane, a parser loading (the legacy one,
  // say) must not reset it.
  useEffect(() => {
    if (!initialMarkup) return;
    const shown = bitmarkState[tabParser(bitmarkState.activeMarkupTab)].markup;
    if (shown !== '' && shown !== initialMarkup) return;
    void onInput(initialMarkup);
  }, [initialMarkup, onInput]);

  // Re-write the WASM tabs when the toggle tags setting changes (PLAN-025 D4).
  // Not on mount, nor when the converter's parsers load.
  const shownToggleTags = useRef(toggleTags);
  useEffect(() => {
    if (shownToggleTags.current === toggleTags) return;
    shownToggleTags.current = toggleTags;
    void regenerateWasmMarkup();
  }, [toggleTags, regenerateWasmMarkup]);

  // Re-run the WASM parser when the Output mode changes (PLAN-026 D3).
  // Not on mount, nor when the converter's parsers load.
  const shownFullOutput = useRef(fullOutput);
  useEffect(() => {
    if (shownFullOutput.current === fullOutput) return;
    shownFullOutput.current = fullOutput;
    void regenerateWasm();
  }, [fullOutput, regenerateWasm]);

  // Fill the Legacy tabs when the legacy parser is turned on, or once it has
  // loaded (PLAN-026 D1).
  useEffect(() => {
    if (showLegacy && jsLoadSuccess) syncLegacy();
  }, [showLegacy, jsLoadSuccess, syncLegacy]);

  if (loadSuccess) {
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
        onInput={onUserInput}
        editorDidMount={editorDidMount}
        editorWillUnmount={editorWillUnmount}
      />
    );
  } else {
    let text = activeTab === 'legacy' ? 'Loading legacy parser...' : 'Loading...';
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
