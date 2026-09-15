// @awa-test: PLAN-016-Step4 (runner installs / removes the parser's semanticTokens as Monaco source)
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setBitmarkSemanticTokensSource } from '../monaco-bitmark/bitmarkLanguage';
import { BitmarkParserContext } from './BitmarkParser';
import { SemanticTokensRunner } from './SemanticTokensRunner';

vi.mock('../monaco-bitmark/bitmarkLanguage', () => ({
  setBitmarkSemanticTokensSource: vi.fn(),
}));

type ContextValue = Parameters<typeof BitmarkParserContext.Provider>[0]['value'];

const semanticTokens = vi.fn();

const renderWith = (value: Partial<ContextValue>) =>
  render(
    <BitmarkParserContext.Provider
      value={{ loadSuccess: false, loadError: false, version: '', ...value } as ContextValue}
    >
      <SemanticTokensRunner />
    </BitmarkParserContext.Provider>,
  );

describe('SemanticTokensRunner', () => {
  beforeEach(() => {
    vi.mocked(setBitmarkSemanticTokensSource).mockClear();
  });

  it('installs the parser semanticTokens once the parser has loaded, and removes it on unmount', () => {
    const { unmount } = renderWith({
      loadSuccess: true,
      markupReady: true,
      semanticTokens: semanticTokens as unknown as ContextValue['semanticTokens'],
    });
    expect(setBitmarkSemanticTokensSource).toHaveBeenLastCalledWith(semanticTokens);

    unmount();
    expect(setBitmarkSemanticTokensSource).toHaveBeenLastCalledWith(undefined);
  });

  it('does nothing while the parser is not loaded', () => {
    renderWith({ loadSuccess: false, semanticTokens: undefined });
    expect(setBitmarkSemanticTokensSource).not.toHaveBeenCalled();
  });
});
