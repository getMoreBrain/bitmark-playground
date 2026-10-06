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
import type {
  BitmarkPane,
  BitmarkSession,
  PaneControl,
  PaneType,
  ToBitmarkResult,
} from '../session/types';
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
  /**
   * Text in this pane → bitmark, and where each bit starts in the text
   * (pinned in the pane, so typed text links its scrolling by bit).
   */
  toBitmark?(engine: BitmarkEngine, text: string): Promise<ToBitmarkResult>;
  /** Regenerate the pane's text from the session. */
  fromSession?(
    engine: BitmarkEngine,
    session: SessionInternals,
  ): Promise<{ text: string; bitStarts?: readonly number[] }>;
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
  /** After each regeneration that is shown: how long it took (e.g. for a host's timing display). */
  onRender?: (info: { durationMs: number }) => void;
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
 * mounted inside `element` (PLAN-022 D9). Editing it updates every other
 * pane; it regenerates when another pane is edited.
 */
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
  const state: { sourceError?: string; renderError?: string; stale: boolean; notice?: string } = {
    stale: false,
  };
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
      if (readOnly) return;
      // The user's own text now wins: drop any catch-up waiting for blur.
      pending = false;
      s.edit(control, text);
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
    split = createSplitBitStarts(
      editor,
      () => s.engine,
      () => link.member?.invalidate(),
    );
    link.member = s.scrollGroup.join(editor, () => split!.bitStarts(), {
      linked: options.scrollSync ?? true,
    });
  } else if (spec.scroll === 'pinned') {
    markers = attachBitMarkers(monaco, editor, () => link.member?.invalidate());
    link.member = s.scrollGroup.join(editor, () => markers!.bitStarts(), {
      linked: options.scrollSync ?? true,
    });
  }

  const regenerate = createLatestRunner(async (engine: BitmarkEngine) => {
    const started = performance.now();
    const out = await spec.fromSession!(engine, s);
    return { ...out, durationMs: performance.now() - started };
  });

  /**
   * This pane made the document's current text (it was the last edit's
   * source): it keeps the user's text verbatim and does not catch up later.
   */
  let isSource = false;
  /** A regeneration the focused editor could not take: applied on blur. */
  let pending = false;

  /** Show regenerated `text`; true when the editor took it. */
  const show = (text: string, force: boolean): boolean => {
    const applied = textEditor.setValue(text, { force });
    if (applied) {
      isSource = false;
      // The text is now the document's again: any earlier error is gone (D15).
      if (state.sourceError !== undefined) clearSourceError();
    } else if (!isSource) {
      pending = true;
    }
    return applied;
  };

  const render = (opts?: { force?: boolean }) => {
    const force = !!opts?.force;
    if (spec.type === 'bitmark') {
      show(s.getBitmark(), force);
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
        if (show(out.text, force)) markers?.pin(out.text, out.bitStarts);
        showBanner();
        options.onRender?.({ durationMs: out.durationMs });
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

  const blurListener = editor.onDidBlurEditorText?.(() => {
    if (!pending || disposed) return;
    pending = false;
    render();
  });

  const clearSourceError = () => {
    state.sourceError = undefined;
    monaco.editor.setModelMarkers(model, CONVERT_MARKER_OWNER, []);
  };

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
      blurListener?.dispose();
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
    pinInput: (text: string, inputStarts: readonly number[] | undefined) =>
      markers?.pin(text, inputStarts),
    render,
    engineChanged: () => {
      services?.setEngine(s.engine);
      split?.refresh();
      render();
    },
    showEngineError: (error: Error) => {
      state.notice = `${messages.errorPrefix}${error.message}`;
      showBanner();
    },
    showSourceError: (error: Error | undefined) => {
      // A committed edit (no error) makes this pane the document's source.
      if (!error) {
        isSource = true;
        pending = false;
      }
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

  // The session sets the first state: rendered, its engine error, or loading.
  const unregister = s.register(control);
  return pane;
};

export { BITMARK_LANGUAGE_ID };
