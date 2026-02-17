// @zen-component: PLAN-002-BitmarkJsonTextBox
import { editor } from 'monaco-editor';
import { useCallback } from 'react';
import { Flex } from 'theme-ui';
import { useSnapshot } from 'valtio';

import { useBitmarkConverter } from '../../services/BitmarkConverter';
import { bitmarkState } from '../../state/bitmarkState';
import { MonacoTextArea, MonacoTextAreaUncontrolledProps } from '../monaco/MonacoTextArea';

const DEFAULT_MONACO_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  //
};

export interface BitmarkJsonTextBoxProps extends MonacoTextAreaUncontrolledProps {
  //
}

// @zen-impl: PLAN-002-Step6 (editor reads from active tab)
const BitmarkJsonTextBox = (props: BitmarkJsonTextBoxProps) => {
  const { options, ...restProps } = props;
  const bitmarkStateSnap = useSnapshot(bitmarkState);
  const { jsLoadSuccess, jsLoadError, wasmLoadSuccess, wasmLoadError, jsonToMarkup } = useBitmarkConverter();

  const activeTab = bitmarkStateSnap.activeJsonTab;
  const activeSlice = bitmarkStateSnap[activeTab];

  // At least one parser must be loaded
  const anyLoadSuccess = jsLoadSuccess || wasmLoadSuccess;
  const allLoadError = jsLoadError && wasmLoadError;

  const onInput = useCallback(
    async (json: string) => {
      await jsonToMarkup(json, {
        bitmarkOptions: {
          prettifyJson: true,
        },
      });
    },
    [jsonToMarkup],
  );

  if (anyLoadSuccess) {
    const opts = {
      ...DEFAULT_MONACO_OPTIONS,
      ...options,
    };

    const value = activeSlice.jsonErrorAsString ?? activeSlice.jsonAsString;
    return (
      <MonacoTextArea {...restProps} theme="vs-dark" language="json" value={value} options={opts} onInput={onInput} />
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
