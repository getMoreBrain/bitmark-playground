// @awa-test: PLAN-007-Step3 (TableHtmlPanel renders an editable HTML editor)
/** @jsxImportSource theme-ui */
import { render, screen } from '@testing-library/react';
import { ThemeUIProvider } from 'theme-ui';
import { describe, expect, it } from 'vitest';

import { BitmarkParserContext } from '../../services/BitmarkParser';
import { BitmarkParserGeneratorContext } from '../../services/BitmarkParserGenerator';
import { theme } from '../../theme/theme';
import { TableHtmlPanel } from './TableHtmlPanel';

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
  bitmarkToObjects: () => [],
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

describe('TableHtmlPanel', () => {
  it('renders an editable Monaco editor in html language with the html value', () => {
    render(<TableHtmlPanel html="<table><tr><td>x</td></tr></table>" />, { wrapper });
    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveAttribute('language', 'html');
    expect(editor).toHaveAttribute('theme', 'vs-dark');
    expect(editor).toHaveAttribute('data-default-value', '<table><tr><td>x</td></tr></table>');
  });

  it('shows a loading state when the parser is not available', () => {
    const loadingWrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeUIProvider theme={theme}>
        <BitmarkParserGeneratorContext.Provider
          value={{ loadSuccess: false, loadError: false, bitmarkParserGenerator: undefined }}
        >
          <BitmarkParserContext.Provider value={fakeWasmParser}>
            {children}
          </BitmarkParserContext.Provider>
        </BitmarkParserGeneratorContext.Provider>
      </ThemeUIProvider>
    );
    render(<TableHtmlPanel html="<table></table>" />, { wrapper: loadingWrapper });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('monaco-editor')).not.toBeInTheDocument();
  });

  // @awa-test: PLAN-007-Step3 (conversion error shown inside the editor, in place of html)
  it('renders the error string as the editor value when errorAsString is set', () => {
    render(<TableHtmlPanel html="<table></table>" errorAsString="boom: bad table" />, { wrapper });
    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toHaveAttribute('data-default-value', 'boom: bad table');
  });
});
