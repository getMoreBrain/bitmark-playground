// @awa-component: PLAN-017-EditorServicesRunner
import { useEffect } from 'react';

import {
  setBitmarkCompleteSource,
  setBitmarkResolveSource,
} from '../monaco-bitmark/bitmarkCompletion';
import { setBitmarkDiagnosticsSource } from '../monaco-bitmark/bitmarkDiagnostics';
import { setBitmarkHoverSource } from '../monaco-bitmark/bitmarkHover';
import { setSplitBitsSource } from '../scrollSync/scrollSync';
import { useBitmarkParser } from './BitmarkParser';

// @awa-impl: PLAN-017-Step2 (parser diagnostics / complete / hover -> Monaco)
// @awa-impl: PLAN-018-Step1 (and splitBits -> linked scrolling)
const useEditorServicesRunner = (): void => {
  const { diagnostics, complete, resolve, hover, splitBits, loadSuccess } = useBitmarkParser();

  useEffect(() => {
    if (!loadSuccess) return;
    // Each is installed only when the loaded parser has it: an engine older
    // than the release that carries the editor services simply leaves the
    // editor without markers, completion or hover.
    setBitmarkDiagnosticsSource(diagnostics);
    setBitmarkCompleteSource(complete);
    setBitmarkResolveSource(resolve);
    setBitmarkHoverSource(hover);
    setSplitBitsSource(splitBits);
    return () => {
      setBitmarkDiagnosticsSource(undefined);
      setBitmarkCompleteSource(undefined);
      setBitmarkResolveSource(undefined);
      setBitmarkHoverSource(undefined);
      setSplitBitsSource(undefined);
    };
  }, [diagnostics, complete, resolve, hover, splitBits, loadSuccess]);
};

// Renderless component that feeds the WASM parser's editor services to the
// bitmark editors. Mount once inside `BitmarkParserProvider`.
const EditorServicesRunner = (): null => {
  useEditorServicesRunner();
  return null;
};

export { EditorServicesRunner, useEditorServicesRunner };
