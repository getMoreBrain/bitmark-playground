// @awa-test: PLAN-006-Step4 (BitmarkJsonTextBox swaps to WasmCheckPanel for wasmCheck tab)
/** @jsxImportSource theme-ui */
import { render, screen } from '@testing-library/react';
import { ThemeUIProvider } from 'theme-ui';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BitmarkParserContext } from '../../services/BitmarkParser';
import { BitmarkParserGeneratorContext } from '../../services/BitmarkParserGenerator';
import { bitmarkState } from '../../state/bitmarkState';
import { theme } from '../../theme/theme';
import { BitmarkJsonTextBox } from './BitmarkJsonTextBox';

const fakeParserGenerator = {
  loadSuccess: true,
  loadError: false,
  bitmarkParserGenerator: {
    convert: async () => '',
    convertHtmlTable: () => '',
  } as unknown as Parameters<
    typeof BitmarkParserGeneratorContext.Provider
  >[0]['value']['bitmarkParserGenerator'],
};

const fakeWasmParser = {
  loadSuccess: true,
  loadError: false,
  parse: () => '',
  convert: () => '',
  lex: () => '',
  version: 'test',
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeUIProvider theme={theme}>
    <BitmarkParserGeneratorContext.Provider value={fakeParserGenerator}>
      <BitmarkParserContext.Provider value={fakeWasmParser}>
        {children}
      </BitmarkParserContext.Provider>
    </BitmarkParserGeneratorContext.Provider>
  </ThemeUIProvider>
);

describe('BitmarkJsonTextBox', () => {
  beforeEach(() => {
    bitmarkState.setActiveJsonTab('js');
    bitmarkState.setWasmCheck('', undefined, undefined);
    bitmarkState.setTableHtml('', undefined, undefined);
  });

  afterEach(() => {
    bitmarkState.setActiveJsonTab('js');
  });

  it('renders the JSON editor (language=json) for js tab', () => {
    render(<BitmarkJsonTextBox />, { wrapper });
    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toHaveAttribute('language', 'json');
  });

  it('renders the WasmCheckPanel (language=bitmark) when activeJsonTab is wasmCheck', () => {
    bitmarkState.setWasmCheck('[.article] round-tripped', undefined, undefined);
    bitmarkState.setActiveJsonTab('wasmCheck');

    render(<BitmarkJsonTextBox />, { wrapper });
    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toHaveAttribute('language', 'bitmark');
    expect(editor).toHaveAttribute('data-default-value', '[.article] round-tripped');
  });

  // @awa-test: PLAN-007-Step5 (BitmarkJsonTextBox swaps to TableHtmlPanel for tableHtml tab)
  it('renders the TableHtmlPanel (language=html) when activeJsonTab is tableHtml', () => {
    bitmarkState.setTableHtml('<table><tr><td>x</td></tr></table>', undefined, undefined);
    bitmarkState.setActiveJsonTab('tableHtml');

    render(<BitmarkJsonTextBox />, { wrapper });
    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toHaveAttribute('language', 'html');
    expect(editor).toHaveAttribute('data-default-value', '<table><tr><td>x</td></tr></table>');
  });
});
