// @awa-test: PLAN-013-Step3 (XmlPanel renders an editable XML editor, per variant)
/** @jsxImportSource theme-ui */
import { render, screen } from '@testing-library/react';
import { ThemeUIProvider } from 'theme-ui';
import { describe, expect, it } from 'vitest';

import { BitmarkParserContext } from '../../services/BitmarkParser';
import { BitmarkParserGeneratorContext } from '../../services/BitmarkParserGenerator';
import type { XmlVariant } from '../../state/bitmarkState';
import { theme } from '../../theme/theme';
import { XML_MAX_TOKENIZATION_LINE_LENGTH, XmlPanel } from './XmlPanel';

const XML_DOC = '<bit type="article"><node type="paragraph">hi</node></bit>';

const fakeParserGenerator = {
  loadSuccess: true,
  loadError: false,
  bitmarkParserGenerator: {
    convert: async () => '',
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

const VARIANTS: readonly XmlVariant[] = ['xmlNiso', 'xmlNisoEs'];

describe.each(VARIANTS)('XmlPanel(%s)', (variant) => {
  it('renders an editable Monaco editor in xml language with the xml value', () => {
    render(<XmlPanel variant={variant} xml={XML_DOC} />, { wrapper });
    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveAttribute('language', 'xml');
    expect(editor).toHaveAttribute('theme', 'vs-dark');
    expect(editor).toHaveAttribute('data-default-value', XML_DOC);
  });

  it('shows the error text in place of the xml when a conversion failed', () => {
    render(<XmlPanel variant={variant} xml={XML_DOC} errorAsString="boom" />, { wrapper });
    expect(screen.getByTestId('monaco-editor')).toHaveAttribute('data-default-value', 'boom');
  });

  it('shows a loading state when the WASM parser is not available', () => {
    const loadingWrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeUIProvider theme={theme}>
        <BitmarkParserGeneratorContext.Provider value={fakeParserGenerator}>
          <BitmarkParserContext.Provider
            value={
              {
                loadSuccess: false,
                loadError: false,
                lex: undefined,
                bitmarkToObjects: undefined,
                convert: undefined,
                version: '',
              } as unknown as Parameters<typeof BitmarkParserContext.Provider>[0]['value']
            }
          >
            {children}
          </BitmarkParserContext.Provider>
        </BitmarkParserGeneratorContext.Provider>
      </ThemeUIProvider>
    );
    render(<XmlPanel variant={variant} xml={XML_DOC} />, { wrapper: loadingWrapper });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

// @awa-test: PLAN-013-Step3 (single-line XML is still syntax highlighted)
describe('XmlPanel tokenization limit', () => {
  it('raises maxTokenizationLineLength above Monaco default of 20000', () => {
    // The NISO XML is emitted as one line; at the default limit any document
    // over 20k chars would render unhighlighted.
    expect(XML_MAX_TOKENIZATION_LINE_LENGTH).toBeGreaterThan(20000);
  });
});
