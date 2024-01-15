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

const BitmarkJsonTextBox = (props: BitmarkJsonTextBoxProps) => {
  const { options, ...restProps } = props;
  const bitmarkStateSnap = useSnapshot(bitmarkState);
  const { loadSuccess, loadError, jsonToMarkup } = useBitmarkConverter();

  const onInput = useCallback(
    async (json: string) => {
      await jsonToMarkup(json, {
        bitmarkOptions: {
          // cardSetVersion: 1,
        },
      });
    },
    [jsonToMarkup],
  );

  if (loadSuccess) {
    const opts = {
      ...DEFAULT_MONACO_OPTIONS,
      ...options,
    };

    const value = bitmarkStateSnap.jsonErrorAsString ?? bitmarkStateSnap.jsonAsString;
    return (
      <MonacoTextArea {...restProps} theme="vs-dark" language="json" value={value} options={opts} onInput={onInput} />
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

export { BitmarkJsonTextBox };
