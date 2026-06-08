// @awa-component: PLAN-002-BitmarkJsonTextBox
// @awa-component: PLAN-006-BitmarkJsonTextBox
// @awa-component: PLAN-007-BitmarkJsonTextBox
import { editor } from 'monaco-editor';
import { useCallback } from 'react';
import { Flex } from 'theme-ui';
import { useSnapshot } from 'valtio';

import { useBitmarkConverter } from '../../services/BitmarkConverter';
import { bitmarkState } from '../../state/bitmarkState';
import { MonacoTextArea, MonacoTextAreaUncontrolledProps } from '../monaco/MonacoTextArea';
import { TableHtmlPanel } from './TableHtmlPanel';
import { WasmCheckPanel } from './WasmCheckPanel';

const DEFAULT_MONACO_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  //
};

export interface BitmarkJsonTextBoxProps extends MonacoTextAreaUncontrolledProps {
  //
}

// @awa-impl: PLAN-002-Step6 (editor reads from active tab)
const BitmarkJsonTextBox = (props: BitmarkJsonTextBoxProps) => {
  const { options, ...restProps } = props;
  const bitmarkStateSnap = useSnapshot(bitmarkState);
  const { jsLoadSuccess, jsLoadError, wasmLoadSuccess, wasmLoadError, jsonToMarkup } =
    useBitmarkConverter();

  const activeTab = bitmarkStateSnap.activeJsonTab;

  // At least one parser must be loaded
  const anyLoadSuccess = jsLoadSuccess || wasmLoadSuccess;
  const allLoadError = jsLoadError && wasmLoadError;

  // @awa-impl: PLAN-008-Step3 (edited tab = active JSON tab; special tabs are not JSON editors)
  const onInput = useCallback(
    async (json: string) => {
      const tab = bitmarkState.activeJsonTab;
      if (tab === 'wasmCheck' || tab === 'tableHtml') return;
      await jsonToMarkup(tab, json);
    },
    [jsonToMarkup],
  );

  // @awa-impl: PLAN-006-Step4 (render WasmCheckPanel when wasmCheck tab is active)
  if (activeTab === 'wasmCheck') {
    return (
      <WasmCheckPanel
        markup={bitmarkStateSnap.wasmCheck.markup}
        errorAsString={bitmarkStateSnap.wasmCheck.markupErrorAsString}
      />
    );
  }

  // @awa-impl: PLAN-007-Step5 (render TableHtmlPanel when tableHtml tab is active)
  if (activeTab === 'tableHtml') {
    return (
      <TableHtmlPanel
        html={bitmarkStateSnap.tableHtml.html}
        errorAsString={bitmarkStateSnap.tableHtml.htmlErrorAsString}
      />
    );
  }

  const activeSlice = bitmarkStateSnap[activeTab];

  if (anyLoadSuccess) {
    const opts = {
      ...DEFAULT_MONACO_OPTIONS,
      ...options,
    };

    const value = activeSlice.jsonErrorAsString ?? activeSlice.jsonAsString;
    return (
      <MonacoTextArea
        {...restProps}
        theme="vs-dark"
        language="json"
        value={value}
        options={opts}
        onInput={onInput}
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

export { BitmarkJsonTextBox };
