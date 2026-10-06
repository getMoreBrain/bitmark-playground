// @awa-component: PLAN-023-Session
import type { TextEditor } from '../editor/textEditor';
import type { BitmarkEngine, Feature, LoadBitmarkEngineOptions, RawParserModule } from '../engine';
import type { Monaco } from '../monaco/types';
import type { ScrollSyncGroup } from '../scroll/scrollSyncGroup';
import type { BitmarkTheme } from '../theme/applyTheme';

/** Where an edit came from, for the mapping report (a host's own editor, say). */
export type EditOrigin = Omit<LastEdit, 'count'>;

/** The pane kinds (PLAN-022 D1, D9). */
export type PaneType = 'bitmark' | 'json' | 'html' | 'xml' | 'text' | 'info' | 'mappings';

/** The UI strings, all replaceable (PLAN-022 D12: the docs site has six locales). */
export interface BitmarkEditorMessages {
  loading: string;
  /** A markup pane on an engine without the markup formats (`bitmark-json`). */
  needsFullParser: string;
  /** A pane whose content no longer matches the document (D15). */
  stale: string;
  /** Before an error message in a pane's banner. */
  errorPrefix: string;
  /** Pane labels: the editors' ARIA labels and the mapping report's header. */
  labels: Record<PaneType, string>;
}

/**
 * How the session gets its parser (PLAN-022 D2, D7): an engine (or a promise
 * of one); a raw module the host already initialised, with the variant it
 * declared; or options to load one (the default: jsDelivr at the pinned
 * version).
 */
export type EngineSource =
  | BitmarkEngine
  | Promise<BitmarkEngine>
  | { module: RawParserModule; feature?: Feature }
  | LoadBitmarkEngineOptions;

export interface BitmarkSessionOptions {
  /** The Monaco to create the panes on (PLAN-022 D8): the host's, or the bundled one. */
  monaco: Monaco;
  engine?: EngineSource;
  /** The initial bitmark. */
  value?: string;
  /**
   * Wait for a pause in editing before converting (ms). Default 0: every
   * edit converts, as in the playground. One schedule for the whole
   * session, last edit wins (D12).
   */
  debounceMs?: number;
  theme?: BitmarkTheme;
  /** Set Monaco's (page-global) theme to match (D11). Default false. */
  applyMonacoTheme?: boolean;
  /**
   * The JSON schema: an object, a URL, or `false` for none. Default: beside
   * the loaded engine, or on the CDN at the engine's version.
   */
  schema?: unknown;
  /**
   * Join this scroll group instead of the session's own, so that a host's
   * own editors and the session's panes link together (the playground).
   */
  scrollGroup?: ScrollSyncGroup;
  messages?: Partial<Omit<BitmarkEditorMessages, 'labels'>> & {
    labels?: Partial<Record<PaneType, string>>;
  };
}

/** The window the user last edited — the mapping report's input (D1). */
export interface LastEdit {
  /** The parser `inputFormat` of that pane (`bitmark`, `json`, `html`, a mapping id). */
  inputFormat: string;
  /** That pane's own text at the time of the edit. */
  content: string;
  /** Its label, or "API" for `setBitmark`. */
  label: string;
  /** Counts every edit, even back to an earlier text. */
  count: number;
}

export interface SessionChange {
  bitmark: string;
  /** The pane the edit came from; `undefined` for `setBitmark`. */
  source: BitmarkPane | undefined;
}

export interface SessionError {
  error: Error;
  /** The pane whose edit failed, or whose regeneration failed. */
  pane: BitmarkPane | undefined;
}

export interface SessionEvents {
  change: SessionChange;
  error: SessionError;
  ready: BitmarkEngine;
}

/** A pane, as the host holds it. */
export interface BitmarkPane {
  readonly type: PaneType;
  /** The pane's own element (inside the one the host gave). */
  readonly element: HTMLElement;
  readonly textEditor: TextEditor;
  readonly readOnly: boolean;
  readonly scrollSync: boolean;
  setReadOnly(readOnly: boolean): void;
  /** Join (true) or leave (false) the session's scroll linking (D9). */
  setScrollSync(on: boolean): void;
  layout(): void;
  dispose(): void;
}

export interface BitmarkSession {
  readonly monaco: Monaco;
  /** The engine, once it has loaded. */
  readonly engine: BitmarkEngine | undefined;
  /** Resolves with the engine; rejects if it cannot load. */
  readonly ready: Promise<BitmarkEngine>;
  readonly messages: BitmarkEditorMessages;
  getBitmark(): string;
  /**
   * Replace the document. By default it counts as a bitmark edit labelled
   * "API"; `origin` says where it really came from (for the mapping
   * report), and `false` says it is not an edit at all (the mapping report
   * keeps the last one).
   */
  setBitmark(text: string, origin?: EditOrigin | false): void;
  /** The document as JSON text (computed on demand). */
  getJson(options?: { mode?: 'optimized' | 'full' }): Promise<string>;
  readonly lastEdit: LastEdit | undefined;
  panes(): readonly BitmarkPane[];
  /** Link exactly these panes' scrolling; every other pane scrolls alone (D9). */
  setScrollSync(panes: readonly BitmarkPane[]): void;
  setTheme(theme: BitmarkTheme): void;
  on<K extends keyof SessionEvents>(event: K, listener: (e: SessionEvents[K]) => void): () => void;
  dispose(): void;
}

/** What a pane needs from its session (not part of the public API). */
export interface SessionInternals extends BitmarkSession {
  readonly scrollGroup: ScrollSyncGroup;
  readonly theme: BitmarkTheme | undefined;
  /** True while the session is loading its engine's stage 2 itself. */
  readonly engineStage2Pending: boolean;
  /** The bitmark version: +1 per committed edit. */
  readonly version: number;
  register(pane: PaneControl): () => void;
  /** A user edit in `pane`. */
  edit(pane: PaneControl, text: string): void;
  reportError(pane: PaneControl | undefined, error: Error): void;
}

/** The session's handle on a pane. */
export interface PaneControl {
  readonly pane: BitmarkPane;
  readonly inputFormat: string;
  readonly label: string;
  /** Text in this pane → bitmark. `undefined`: the pane is bitmark already. */
  toBitmark?(engine: BitmarkEngine, text: string): Promise<string>;
  /**
   * Regenerate from the session's bitmark. `force`: even if the user has
   * focus here (an API change); otherwise a focused pane catches up on blur.
   */
  render(options?: { force?: boolean }): void;
  /** The engine failed to load: say so in the pane. */
  showEngineError(error: Error): void;
  /** Called when the engine arrives or changes variant. */
  engineChanged(): void;
  showSourceError(error: Error | undefined): void;
  setStale(stale: boolean): void;
  applyTheme(theme: BitmarkTheme | undefined): void;
}
