// @awa-component: PLAN-017-EditorServicesRunner
import { useEffect } from 'react';

import { setSplitBitsSource } from '../scrollSync/scrollSync';
import { useBitmarkParser } from './BitmarkParser';

// @awa-impl: PLAN-018-Step1 (splitBits -> linked scrolling)
// Highlighting, diagnostics, completion and hover no longer go through
// module-level sources: each editor attaches the lib's services with its
// engine (PLAN-021 Step 2). Only the scroll sync's splitBits remains here,
// until the scroll group takes its engine per pane (PLAN-021 Step 5).
const useEditorServicesRunner = (): void => {
  const { splitBits, loadSuccess } = useBitmarkParser();

  useEffect(() => {
    if (!loadSuccess) return;
    setSplitBitsSource(splitBits);
    return () => {
      setSplitBitsSource(undefined);
    };
  }, [splitBits, loadSuccess]);
};

// Renderless component that feeds the WASM parser's bit splits to the
// scroll sync. Mount once inside `BitmarkParserProvider`.
const EditorServicesRunner = (): null => {
  useEditorServicesRunner();
  return null;
};

export { EditorServicesRunner, useEditorServicesRunner };
