import { useEffect, useRef } from 'react';
import { Textarea } from 'theme-ui';

import { useBitmarkConverterJson } from './BitmarkConverter';

// TODO - proper state management / move the converter out to a service.
// While the current implementation works, it's not ideal.

export interface BitmarkJsonTextBoxProps {
  //
}

const BitmarkJsonTextBox = (_props: BitmarkJsonTextBoxProps) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const { json, jsonError, jsonToMarkup } = useBitmarkConverterJson();

  /* Register the textarea input change handler */
  useEffect(() => {
    if (!ref.current) return;
    const textAreaRef = ref.current;

    const onInput = () => {
      const value = textAreaRef.value ?? '';
      jsonToMarkup(value);
    };

    ref.current.addEventListener('input', onInput, false);

    return () => {
      textAreaRef.removeEventListener('input', onInput, false);
    };
  }, [ref, jsonToMarkup]);

  let value = jsonError;
  if (!value) {
    try {
      value = JSON.stringify(json, null, 2);
    } catch (e) {
      value = JSON.stringify(e, Object.getOwnPropertyNames(e), 2);
    }
  }

  return <Textarea ref={ref} defaultValue="" value={value} rows={32} sx={{ resize: 'none' }} />;
};

export { BitmarkJsonTextBox };
