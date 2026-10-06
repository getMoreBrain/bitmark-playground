// @awa-test: PLAN-006-Step4 (BitmarkJsonTextBox swaps to WasmCheckPanel for wasmCheck tab)
/** @jsxImportSource theme-ui */
import { render, screen } from '@testing-library/react';
import { ThemeUIProvider } from 'theme-ui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BitmarkParserContext } from '../../services/BitmarkParser';
import { BitmarkParserGeneratorContext } from '../../services/BitmarkParserGenerator';
import { bitmarkState } from '../../state/bitmarkState';
import { theme } from '../../theme/theme';
import { BitmarkJsonTextBox } from './BitmarkJsonTextBox';

// The session panes are the package's (tested there); here only which tab shows one.
vi.mock('../../session/PlaygroundSession', () => ({
  SessionPaneTab: ({ tab }: { tab: string }) => <div data-testid="session-pane" data-tab={tab} />,
}));

const fakeParserGenerator = {
  loadSuccess: true,
  markupReady: true,
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
  markupReady: true,
  loadError: false,
  bitmarkToObjects: () => [],
  convert: () => '',
  info: () => '',
  semanticTokens: undefined,
  splitBits: undefined,
  convertWithDetails: undefined,
  diagnostics: undefined,
  complete: undefined,
  resolve: undefined,
  hover: undefined,
  version: 'test',
  engine: undefined,
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

  // @awa-test: PLAN-021-Step14 (the WASM JSON tabs and the HTML/Text/XML tabs are session panes)
  it.each(['wasm', 'wasmFull', 'tableHtml', 'text', 'xmlNiso', 'xmlNisoEs'] as const)(
    'renders a session pane when activeJsonTab is %s',
    (tab) => {
      bitmarkState.setActiveJsonTab(tab);

      render(<BitmarkJsonTextBox />, { wrapper });
      expect(screen.getByTestId('session-pane')).toHaveAttribute('data-tab', tab);
      expect(screen.queryByTestId('monaco-editor')).toBeNull();
    },
  );
});
