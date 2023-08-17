import { useCallback } from 'react';
import { useSnapshot } from 'valtio';

import { useBitmarkConverter } from '../../services/BitmarkConverter';
import { bitmarkState } from '../../state/bitmarkState';
import { TextAreaUncontrolled, TextAreaUncontrolledProps } from '../generic/ui/TextAreaUncontrolled';

export interface BitmarkJsonTextBoxProps extends TextAreaUncontrolledProps {
  //
}

const BitmarkJsonTextBox = (props: BitmarkJsonTextBoxProps) => {
  const { ...restProps } = props;
  const bitmarkStateSnap = useSnapshot(bitmarkState);
  const { jsonToMarkup } = useBitmarkConverter();

  const onInput = useCallback(
    async (markup: string) => {
      await jsonToMarkup(markup, {
        bitmarkOptions: {
          cardSetVersion: 1,
        },
      });
    },
    [jsonToMarkup],
  );

  const value = bitmarkStateSnap.jsonErrorAsString ?? bitmarkStateSnap.jsonAsString;

  return <TextAreaUncontrolled {...restProps} value={value} onInputUncontrolled={onInput} />;
};

export { BitmarkJsonTextBox };
