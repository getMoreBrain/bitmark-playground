// @awa-component: PLAN-021-UseBitmarkEditorServices
import * as monaco from 'monaco-editor';
import { useCallback, useEffect, useRef } from 'react';

import type { AttachBitmarkEditorOptions, CodeEditor } from '../../lib/monaco';
import { attachBitmarkEditor, BitmarkEditorServices, Monaco } from '../../lib/monaco';
import { useBitmarkParser } from '../../services/BitmarkParser';

/**
 * The lib's bitmark editor services (PLAN-021 Step 2) on the playground's
 * editors: attach on mount, follow the parser context's engine as it
 * arrives, dispose on unmount. Several editors may attach (a diff editor's
 * two sides).
 */
// @awa-impl: PLAN-021-Step2 (the playground attaches the lib services)
export const useBitmarkEditorServices = (options?: AttachBitmarkEditorOptions) => {
  const { engine } = useBitmarkParser();
  const handles = useRef<BitmarkEditorServices[]>([]);
  const latest = useRef({ engine, options });
  latest.current = { engine, options };

  useEffect(() => {
    for (const handle of handles.current) handle.setEngine(engine);
  }, [engine]);

  const attach = useCallback((editor: CodeEditor) => {
    const { engine: current, options: opts } = latest.current;
    handles.current.push(attachBitmarkEditor(monaco as unknown as Monaco, editor, current, opts));
  }, []);

  const detach = useCallback(() => {
    for (const handle of handles.current) handle.dispose();
    handles.current = [];
  }, []);

  return { attach, detach };
};
