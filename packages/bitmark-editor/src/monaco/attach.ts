// @awa-component: PLAN-021-MonacoServices
import type { BitmarkEngine } from '../engine/types';
import { log } from '../log';
import { attachBitmarkDiagnostics } from './diagnostics';
import { attachBitmarkHighlighter } from './highlighter';
import { bindModelEngine, setupBitmarkMonaco } from './setup';
import type { CodeEditor, IDisposable, Monaco } from './types';

export interface BitmarkEditorServices extends IDisposable {
  /** Switch the engine (or `undefined`: none yet). Highlighting and markers re-run. */
  setEngine(engine: BitmarkEngine | undefined): void;
}

export interface AttachBitmarkEditorOptions {
  /** Highlight from the parser's tokens. Default true. */
  highlight?: boolean;
  /** Mark from the parser's diagnostics. Default true (an editable bitmark pane). */
  diagnostics?: boolean;
}

/** Contribution ids differ between Monaco versions; any one means it is there. */
const SUGGEST_IDS = ['editor.contrib.suggestController'];
const HOVER_IDS = ['editor.contrib.contentHover', 'editor.contrib.hover'];

const hasContribution = (editor: CodeEditor, ids: string[]): boolean =>
  ids.some((id) => {
    try {
      return !!editor.getContribution(id);
    } catch {
      return false;
    }
  });

/**
 * The bitmark editor services on one editor (PLAN-020 D8, D14): highlighting,
 * diagnostics, and the completion and hover the providers give for its
 * model. The engine may arrive later (`setEngine`).
 */
// @awa-impl: PLAN-021-Step2 (per-instance services, engine switchable)
export const attachBitmarkEditor = (
  monaco: Monaco,
  editor: CodeEditor,
  engine: BitmarkEngine | undefined,
  options: AttachBitmarkEditorOptions = {},
): BitmarkEditorServices => {
  setupBitmarkMonaco({ monaco });
  let current = engine;
  const get = () => current;

  // Capability check (D8): the host's Monaco may lack contributions.
  if (!hasContribution(editor, SUGGEST_IDS)) {
    log.warnOnce(
      'no-suggest',
      'this Monaco has no suggest contribution: bitmark completion is off',
    );
  }
  if (!hasContribution(editor, HOVER_IDS)) {
    log.warnOnce('no-hover', 'this Monaco has no hover contribution: bitmark hover is off');
  }

  let unbind: (() => void) | undefined;
  const bind = () => {
    unbind?.();
    const model = editor.getModel();
    unbind = model ? bindModelEngine(model, get) : undefined;
  };
  bind();
  const modelListener = editor.onDidChangeModel(bind);

  const parts = [
    options.highlight === false ? undefined : attachBitmarkHighlighter(monaco, editor, get),
    options.diagnostics === false ? undefined : attachBitmarkDiagnostics(monaco, editor, get),
  ].filter((p) => p !== undefined);

  return {
    setEngine: (next) => {
      if (next === current) return;
      current = next;
      for (const p of parts) p.refresh();
    },
    dispose: () => {
      modelListener.dispose();
      unbind?.();
      for (const p of parts) p.dispose();
    },
  };
};
