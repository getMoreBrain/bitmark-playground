import { editor } from 'monaco-editor';
import { useCallback, useEffect } from 'react';
import { Flex } from 'theme-ui';
import { useSnapshot } from 'valtio';

import { useBitmarkConverter } from '../../services/BitmarkConverter';
import { bitmarkState } from '../../state/bitmarkState';
import { MonacoTextArea, MonacoTextAreaUncontrolledProps } from '../monaco/MonacoTextArea';

const DEFAULT_MONACO_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  renderWhitespace: 'all',
  insertSpaces: false,
};

export interface BitmarkMarkupTextBoxProps extends MonacoTextAreaUncontrolledProps {
  initialMarkup?: string;
}

const BitmarkMarkupTextBox = (props: BitmarkMarkupTextBoxProps) => {
  const { initialMarkup, options, ...restProps } = props;
  const bitmarkStateSnap = useSnapshot(bitmarkState);
  const { loadSuccess, loadError, markupToJson } = useBitmarkConverter();

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

  if (loadSuccess) {
    const opts = {
      ...DEFAULT_MONACO_OPTIONS,
      ...options,
    };

    const value = bitmarkStateSnap.markupErrorAsString ?? bitmarkStateSnap.markup;
    return (
      <MonacoTextArea {...restProps} theme="vs-dark" language="ini" value={value} options={opts} onInput={onInput} />
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

export { BitmarkMarkupTextBox };
