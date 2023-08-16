import { useEffect, useRef } from 'react';
import { Textarea } from 'theme-ui';

import { useBitmarkConverterMarkup } from './BitmarkConverter';

export interface BitmarkMarkupTextBoxProps {
  initialMarkup?: string;
}

const BitmarkMarkupTextBox = (props: BitmarkMarkupTextBoxProps) => {
  const { initialMarkup } = props;
  const ref = useRef<HTMLTextAreaElement>(null);
  const { markup, markupError, markupToJson } = useBitmarkConverterMarkup();

  /* Convert the initial markup to JSON */
  useEffect(() => {
    if (initialMarkup) markupToJson(initialMarkup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markupToJson]);

  /* Register the textarea input change handler */
  useEffect(() => {
    if (!ref.current) return;
    const textAreaRef = ref.current;

    const onInput = () => {
      const value = textAreaRef.value ?? '';
      markupToJson(value);
    };

    ref.current.addEventListener('input', onInput, false);

    return () => {
      textAreaRef.removeEventListener('input', onInput, false);
    };
  }, [ref, markupToJson]);

  let value = markupError;
  if (!value) {
    try {
      value = markup;
    } catch (e) {
      value = JSON.stringify(e, Object.getOwnPropertyNames(e), 2);
    }
  }

  return <Textarea ref={ref} defaultValue={initialMarkup} value={value} rows={32} sx={{ resize: 'none' }} />;
};

export { BitmarkMarkupTextBox };
