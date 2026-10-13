/** @jsxImportSource theme-ui */
import { memo, useEffect, useRef } from 'react';
import { Textarea, TextareaProps } from 'theme-ui';

export interface TextAreaUncontrolledProps extends TextareaProps {
  value?: string;
  onInputUncontrolled?: (value: string) => void;
}

/**
 * An uncontrolled textarea component.
 *
 * This component will NOT update when props have not changed, so value can be fed back to it via state without
 * causing unwanted renders that would cause the user to lose focus.
 */
const TextAreaUncontrolled = memo((props: TextAreaUncontrolledProps) => {
  const { value, onInputUncontrolled, ...restProps } = props;
  const ref = useRef<HTMLTextAreaElement>(null);

  /* Register the textarea input change handler */
  useEffect(() => {
    if (!ref.current) return;
    const textAreaRef = ref.current;

    const onInput = () => {
      const value = textAreaRef.value ?? '';
      if (onInputUncontrolled) onInputUncontrolled(value);
    };

    ref.current.addEventListener('input', onInput, false);

    return () => {
      textAreaRef.removeEventListener('input', onInput, false);
    };
  }, [ref, onInputUncontrolled]);

  // Update the value (uncontrolled)
  if (ref.current && ref.current.value !== value) ref.current.value = value ?? '';

  return <Textarea {...restProps} ref={ref} defaultValue={value} />;
});

export { TextAreaUncontrolled };
