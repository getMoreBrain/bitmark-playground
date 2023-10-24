import { useCallback } from 'react';
import { useSnapshot } from 'valtio';

import { useBitmarkConverter } from '../../services/BitmarkConverter';
import { bitmarkState } from '../../state/bitmarkState';
import { MonacoTextArea, MonacoTextAreaUncontrolledProps } from '../monaco/MonacoTextArea';

export interface BitmarkJsonTextBoxProps extends MonacoTextAreaUncontrolledProps {
  //
}

const BitmarkJsonTextBox = (props: BitmarkJsonTextBoxProps) => {
  const { ...restProps } = props;
  const bitmarkStateSnap = useSnapshot(bitmarkState);
  const { jsonToMarkup } = useBitmarkConverter();

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

  const value = bitmarkStateSnap.jsonErrorAsString ?? bitmarkStateSnap.jsonAsString;

  return <MonacoTextArea {...restProps} theme="vs-dark" language="json" value={value} onInput={onInput} />;
};

export { BitmarkJsonTextBox };
