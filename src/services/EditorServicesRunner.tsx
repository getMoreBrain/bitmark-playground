// @awa-component: PLAN-017-EditorServicesRunner
import { useEffect } from 'react';

import { setBitmarkCompleteSource } from '../monaco-bitmark/bitmarkCompletion';
import { setBitmarkDiagnosticsSource } from '../monaco-bitmark/bitmarkDiagnostics';
import { setBitmarkHoverSource } from '../monaco-bitmark/bitmarkHover';
import { useBitmarkParser } from './BitmarkParser';

// @awa-impl: PLAN-017-Step2 (parser diagnostics / complete / hover -> Monaco)
const useEditorServicesRunner = (): void => {
  const { diagnostics, complete, hover, loadSuccess } = useBitmarkParser();

  useEffect(() => {
    if (!loadSuccess) return;
    // Each is installed only when the loaded parser has it: an engine older
    // than the release that carries the editor services simply leaves the
    // editor without markers, completion or hover.
    setBitmarkDiagnosticsSource(diagnostics);
    setBitmarkCompleteSource(complete);
    setBitmarkHoverSource(hover);
    return () => {
      setBitmarkDiagnosticsSource(undefined);
      setBitmarkCompleteSource(undefined);
      setBitmarkHoverSource(undefined);
    };
  }, [diagnostics, complete, hover, loadSuccess]);
};

// Renderless component that feeds the WASM parser's editor services to the
// bitmark editors. Mount once inside `BitmarkParserProvider`.
const EditorServicesRunner = (): null => {
  useEditorServicesRunner();
  return null;
};

export { EditorServicesRunner, useEditorServicesRunner };
