import { useCallback, useEffect } from 'react';
import { useSnapshot } from 'valtio';

import { useBitmarkConverter } from '../../services/BitmarkConverter';
import { bitmarkState } from '../../state/bitmarkState';
import { TextAreaUncontrolled, TextAreaUncontrolledProps } from '../generic/ui/TextAreaUncontrolled';

export interface BitmarkMarkupTextBoxProps extends TextAreaUncontrolledProps {
  initialMarkup?: string;
}

const BitmarkMarkupTextBox = (props: BitmarkMarkupTextBoxProps) => {
  const { initialMarkup, ...restProps } = props;
  const bitmarkStateSnap = useSnapshot(bitmarkState);
  const { markupToJson } = useBitmarkConverter();

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

  // Do initial conversion with the initial markup
  useEffect(() => {
    if (!initialMarkup) return;
    onInput(initialMarkup ?? '');
  }, [initialMarkup, onInput]);

  const value = bitmarkStateSnap.markupErrorAsString ?? bitmarkStateSnap.markup;

  return <TextAreaUncontrolled {...restProps} value={value} onInputUncontrolled={onInput} />;
};

export { BitmarkMarkupTextBox };
