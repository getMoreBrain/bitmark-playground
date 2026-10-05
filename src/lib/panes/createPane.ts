// @awa-component: PLAN-021-Panes
import type * as MonacoApi from 'monaco-editor';

import { createTextEditor } from '../editor/textEditor';
import { createLatestRunner, SUPERSEDED } from '../engine/latest';
import type { BitmarkEngine } from '../engine/types';
import { attachBitmarkEditor, BitmarkEditorServices } from '../monaco/attach';
import { BITMARK_LANGUAGE_ID } from '../monaco/setup';
import { attachBitMarkers, BitMarkers } from '../scroll/bitMarkers';
import type { ScrollSyncMember } from '../scroll/scrollSyncGroup';
import { createSplitBitStarts, SplitBitStarts } from '../scroll/splitBitStarts';
import type { SessionInternals } from '../session/types';
import type { BitmarkPane, BitmarkSession, PaneControl, PaneType } from '../session/types';
import { AppliedTheme, applyBitmarkTheme } from '../theme/applyTheme';
import { injectPaneCss } from './styles';

/** What one pane type does (the per-type part of a pane). */
export interface PaneSpec {
  type: PaneType;
  language: string;
  extension: string;
  /** The parser `inputFormat` of this pane's text (for the mapping report). */
  inputFormat: string;
  /** False: always read-only (Text, Info, Mappings). */
  editable: boolean;
  /** How the pane's bit starts are known; `none`: not in scroll sync (Info, Mappings). */
  scroll: 'split' | 'pinned' | 'none';
  /** The bitmark editor services (highlighting, diagnostics, completion, hover). */
  services?: boolean;
  /** Needs the `full` variant's markup formats (D1). */
  needsMarkup?: boolean;
  toBitmark?(engine: BitmarkEngine, text: string): Promise<string>;
  /** Regenerate the pane's text from the session. */
  fromSession?(engine: BitmarkEngine, session: SessionInternals): Promise<{ text: string; bitStarts?: readonly number[] }>;
}

export interface PaneOptions {
  /** Read-only (switchable later). Text, Info and Mappings are always read-only. */
  readOnly?: boolean;
  /** Take part in the session's scroll linking (default true, false for Info / Mappings). */
  scrollSync?: boolean;
  /** Passed to `monaco.editor.create`. */
  editorOptions?: MonacoApi.editor.IStandaloneEditorConstructionOptions;
  /** Also show this pane's error here: an element (its text), or a callback (D12). */
  errorSlot?: HTMLElement | ((message: string | undefined) => void);
  /** The pane's label (ARIA, mapping report). Default: the session's messages. */
  label?: string;
}

/** Marker owner for a failed conversion of the edited pane (D15). */
export const CONVERT_MARKER_OWNER = 'bitmark-convert';

const DEFAULT_EDITOR_OPTIONS: MonacoApi.editor.IStandaloneEditorConstructionOptions = {
  wordWrap: 'on',
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
};

/**
 * A pane: one Monaco editor showing the session's document in one format,
 * mounted inside `element` (PLAN-020 D9). Editing it updates every other
 * pane; it regenerates when another pane is edited.
 */
// @awa-impl: PLAN-021-Step8 (the pane: mount, edit, regenerate, error, stale, theme, scroll)
export const createPane = (
  element: HTMLElement,
  session: BitmarkSession,
  spec: PaneSpec,
  options: PaneOptions = {},
): BitmarkPane => {
  const s = session as SessionInternals;
  const { monaco, messages } = s;
  injectPaneCss();
  const label = options.label ?? messages.labels[spec.type];

  const container = document.createElement('div');
  container.className = `bm-pane bm-pane-${spec.type}`;
  const banner = document.createElement('div');
  banner.className = 'bm-pane-banner';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.hidden = true;
  const host = document.createElement('div');
  host.className = 'bm-pane-editor';
  container.append(banner, host);
  element.appendChild(container);

  let readOnly = !spec.editable || !!options.readOnly;
  // Banner precedence: the edited pane's own error, a failed regeneration,
  // stale, a notice (loading / needs the full parser).
  const state: { sourceError?: string; renderError?: string; stale: boolean; notice?: string } = { stale: false };
  const showBanner = () => {
    const error = state.sourceError ?? state.renderError;
    const text = error
      ? `${messages.errorPrefix}${error}`
      : state.stale
        ? messages.stale
        : state.notice;
    banner.textContent = text ?? '';
    banner.hidden = !text;
    container.classList.toggle('bm-stale', state.stale);
    const slot = options.errorSlot;
    if (typeof slot === 'function') slot(error);
    else if (slot) {
      slot.textContent = error ?? '';
      slot.hidden = !error;
    }
  };

  const control: PaneControl = {} as PaneControl;
  const textEditor = createTextEditor(host, {
    monaco,
    value: spec.type === 'bitmark' ? s.getBitmark() : '',
    language: spec.language,
    kind: spec.type,
    extension: spec.extension,
    readOnly,
    editorOptions: { ...DEFAULT_EDITOR_OPTIONS, ariaLabel: label, ...options.editorOptions },
    onInput: (text) => {
      if (!readOnly) s.edit(control, text);
    },
  });
  const { editor, model } = textEditor;

  let services: BitmarkEditorServices | undefined;
  if (spec.services) {
    services = attachBitmarkEditor(monaco, editor, s.engine, { diagnostics: !readOnly });
  }

  // Scroll linking (D9): split panes from the engine, pinned panes from
  // the positions the conversion recorded.
  const link: { member?: ScrollSyncMember } = {};
  let split: SplitBitStarts | undefined;
  let markers: BitMarkers | undefined;
  if (spec.scroll === 'split') {
    split = createSplitBitStarts(editor, () => s.engine, () => link.member?.invalidate());
    link.member = s.scrollGroup.join(editor, () => split!.bitStarts(), { linked: options.scrollSync ?? true });
  } else if (spec.scroll === 'pinned') {
    markers = attachBitMarkers(monaco, editor, () => link.member?.invalidate());
    link.member = s.scrollGroup.join(editor, () => markers!.bitStarts(), { linked: options.scrollSync ?? true });
  }

  const regenerate = createLatestRunner((engine: BitmarkEngine) => spec.fromSession!(engine, s));

  const render = () => {
    if (spec.type === 'bitmark') {
      textEditor.setValue(s.getBitmark());
      state.stale = false;
      showBanner();
      return;
    }
    const engine = s.engine;
    if (!engine) {
      state.notice = messages.loading;
      showBanner();
      return;
    }
    if (spec.needsMarkup && !engine.markupFormats) {
      state.notice = s.engineStage2Pending ? messages.loading : messages.needsFullParser;
      showBanner();
      return;
    }
    const version = s.version;
    regenerate(engine).then(
      (out) => {
        if (out === SUPERSEDED || version !== s.version || disposed) return;
        state.notice = undefined;
        state.renderError = undefined;
        state.stale = false;
        if (textEditor.setValue(out.text)) markers?.pin(out.text, out.bitStarts);
        showBanner();
      },
      (err: unknown) => {
        if (disposed) return;
        const error = err instanceof Error ? err : new Error(String(err));
        // Keep the last good text; say it is out of date (D15).
        state.notice = undefined;
        state.renderError = error.message;
        state.stale = true;
        showBanner();
        s.reportError(control, error);
      },
    );
  };

  let theme: AppliedTheme | undefined;
  let disposed = false;

  const pane: BitmarkPane = {
    type: spec.type,
    element: container,
    textEditor,
    get readOnly() {
      return readOnly;
    },
    get scrollSync() {
      return link.member?.linked ?? false;
    },
    setReadOnly: (next) => {
      readOnly = !spec.editable || next;
      textEditor.setReadOnly(readOnly);
    },
    setScrollSync: (on) => link.member?.setLinked(on),
    layout: () => textEditor.layout(),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      unregister();
      services?.dispose();
      split?.dispose();
      markers?.dispose();
      link.member?.dispose();
      theme?.dispose();
      textEditor.dispose();
      container.remove();
    },
  };

  Object.assign(control, {
    pane,
    inputFormat: spec.inputFormat,
    label,
    toBitmark: spec.toBitmark,
    render,
    engineChanged: () => {
      services?.setEngine(s.engine);
      split?.refresh();
      render();
    },
    showSourceError: (error: Error | undefined) => {
      state.sourceError = error?.message;
      // A JSON syntax error is marked by Monaco's JSON language already.
      const convertMarkers =
        error && error.name !== 'SyntaxError'
          ? [
              {
                severity: monaco.MarkerSeverity.Error,
                message: error.message,
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: 1,
                endColumn: model.getLineMaxColumn?.(1) ?? 2,
              },
            ]
          : [];
      monaco.editor.setModelMarkers(model, CONVERT_MARKER_OWNER, convertMarkers);
      if (!error) {
        state.stale = false;
      }
      showBanner();
    },
    setStale: (stale: boolean) => {
      state.stale = stale;
      showBanner();
    },
    applyTheme: (next: Parameters<PaneControl['applyTheme']>[0]) => {
      theme?.dispose();
      theme = next === undefined ? undefined : applyBitmarkTheme(container, next);
    },
  } satisfies PaneControl);

  const unregister = s.register(control);
  if (spec.type !== 'bitmark' && !s.engine) render();
  return pane;
};

export { BITMARK_LANGUAGE_ID };
