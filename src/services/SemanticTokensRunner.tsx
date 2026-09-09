// @awa-component: PLAN-016-SemanticTokensRunner
import { useEffect } from 'react';

import { setBitmarkSemanticTokensSource } from '../monaco-bitmark/bitmarkLanguage';
import { useBitmarkParser } from './BitmarkParser';

// @awa-impl: PLAN-016-Step4 (parser semanticTokens -> Monaco provider)
const useSemanticTokensRunner = (): void => {
  const { semanticTokens, loadSuccess } = useBitmarkParser();

  useEffect(() => {
    if (!loadSuccess || !semanticTokens) return;
    setBitmarkSemanticTokensSource(semanticTokens);
    return () => {
      setBitmarkSemanticTokensSource(undefined);
    };
  }, [semanticTokens, loadSuccess]);
};

// Renderless component that feeds the WASM parser's semantic tokens to the
// bitmark editors. Mount once inside `BitmarkParserProvider`.
const SemanticTokensRunner = (): null => {
  useSemanticTokensRunner();
  return null;
};

export { SemanticTokensRunner, useSemanticTokensRunner };
