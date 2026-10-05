// @awa-component: PLAN-021-Session
import {
  BitmarkEngine,
  createBitmarkEngine,
  createLatestRunner,
  loadBitmarkEngine,
  LoadBitmarkEngineOptions,
  parserCdnUrl,
  SUPERSEDED,
} from '../engine';
import { log } from '../log';
import {
  bindBitmarkJsonSchema,
  loadBitmarkJsonSchema,
  schemaUrlFor,
  schemaUrlForVersion,
} from '../monaco/jsonSchema';
import { debounce } from '../monaco/modelJob';
import { setupBitmarkMonaco } from '../monaco/setup';
import { createScrollSyncGroup } from '../scroll/scrollSyncGroup';
import { applyBitmarkTheme, BitmarkTheme } from '../theme/applyTheme';
import { resolveMessages } from './messages';
import type {
  BitmarkPane,
  BitmarkSession,
  BitmarkSessionOptions,
  EngineSource,
  LastEdit,
  PaneControl,
  SessionEvents,
  SessionInternals,
} from './types';

const isEngine = (s: EngineSource): s is BitmarkEngine =>
  typeof (s as BitmarkEngine).bitmarkToJsonText === 'function';
const isPromise = (s: EngineSource): s is Promise<BitmarkEngine> =>
  typeof (s as Promise<BitmarkEngine>).then === 'function';
const isRaw = (s: EngineSource): s is Extract<EngineSource, { module: unknown }> =>
  typeof (s as { module?: unknown }).module === 'object';

/** The engine for `source`, whether the session loads it, and the URL it came from. */
const resolveEngine = (
  source: EngineSource | undefined,
): { engine: Promise<BitmarkEngine>; loading: boolean; url?: string } => {
  if (source && isEngine(source)) return { engine: Promise.resolve(source), loading: false };
  if (source && isPromise(source)) return { engine: source, loading: false };
  if (source && isRaw(source)) {
    // Injected (D7): never initialised here; the host declares its variant.
    return { engine: Promise.resolve(createBitmarkEngine(source.module, { feature: source.feature })), loading: false };
  }
  const options = (source ?? {}) as LoadBitmarkEngineOptions;
  const url = options.url ?? parserCdnUrl(options.version);
  return { engine: loadBitmarkEngine({ ...options, url }), loading: true, url };
};

/**
 * One bitmark document (PLAN-020 D9). The bitmark text is the source of
 * truth: an edit in any pane converts to bitmark, then every other pane
 * regenerates from it; the edited pane keeps the user's text. A failed
 * conversion keeps the last good document, marks the edited pane and shows
 * the others as stale (D15).
 */
// @awa-impl: PLAN-021-Step7 (the session)
export const createBitmarkSession = (options: BitmarkSessionOptions): BitmarkSession => {
  const { monaco } = options;
  setupBitmarkMonaco({ monaco });
  const messages = resolveMessages(options.messages);
  const scrollGroup = createScrollSyncGroup();
  const controls: PaneControl[] = [];
  const listeners: { [K in keyof SessionEvents]: Set<(e: SessionEvents[K]) => void> } = {
    change: new Set(),
    error: new Set(),
    ready: new Set(),
  };
  const emit = <K extends keyof SessionEvents>(event: K, e: SessionEvents[K]) => {
    for (const l of listeners[event]) l(e);
  };

  let bitmark = options.value ?? '';
  let version = 0;
  let lastEdit: LastEdit | undefined;
  let editCount = 0;
  let engine: BitmarkEngine | undefined;
  let theme = options.theme;
  let disposed = false;
  let stage2Pending = false;

  const resolved = resolveEngine(options.engine);
  stage2Pending = resolved.loading;
  const ready = resolved.engine;

  // The session-wide theme: Monaco's is global, so it is set here once (D11).
  const monacoTheme =
    options.applyMonacoTheme && theme !== undefined
      ? applyBitmarkTheme(document.createElement('div'), theme, { monaco, applyMonacoTheme: true })
      : undefined;

  const commit = (text: string, source: PaneControl | undefined, edit: Omit<LastEdit, 'count'>) => {
    bitmark = text;
    version++;
    lastEdit = { ...edit, count: ++editCount };
    source?.showSourceError(undefined);
    for (const c of controls) if (c !== source) c.render();
    emit('change', { bitmark, source: source?.pane });
  };

  // One conversion schedule for the session: latest edit wins (D12, D14).
  const convert = createLatestRunner(async (c: PaneControl, text: string) => {
    const e = engine ?? (await ready);
    return c.toBitmark!(e, text);
  });

  const runEdit = (c: PaneControl, text: string) => {
    if (!c.toBitmark) {
      commit(text, c, { inputFormat: c.inputFormat, content: text, label: c.label });
      return;
    }
    convert(c, text).then(
      (out) => {
        if (disposed || out === SUPERSEDED) return;
        commit(out, c, { inputFormat: c.inputFormat, content: text, label: c.label });
      },
      (err: unknown) => {
        if (disposed) return;
        const error = err instanceof Error ? err : new Error(String(err));
        c.showSourceError(error);
        for (const other of controls) if (other !== c) other.setStale(true);
        emit('error', { error, pane: c.pane });
      },
    );
  };

  let pending: { c: PaneControl; text: string } | undefined;
  const flush = debounce(() => {
    const p = pending;
    pending = undefined;
    if (p && !disposed) runEdit(p.c, p.text);
  }, options.debounceMs ?? 0);

  const session: SessionInternals = {
    monaco,
    get engine() {
      return engine;
    },
    ready,
    messages,
    scrollGroup,
    get theme() {
      return theme;
    },
    get engineStage2Pending() {
      return stage2Pending;
    },
    get version() {
      return version;
    },
    get lastEdit() {
      return lastEdit;
    },
    getBitmark: () => bitmark,
    setBitmark: (text) => commit(text, undefined, { inputFormat: 'bitmark', content: text, label: 'API' }),
    getJson: async (opts) => {
      const e = engine ?? (await ready);
      return (await e.bitmarkToJsonText(bitmark, { mode: opts?.mode })).text;
    },
    panes: () => controls.map((c) => c.pane),
    setScrollSync: (panes: readonly BitmarkPane[]) => {
      for (const c of controls) c.pane.setScrollSync(panes.includes(c.pane));
    },
    setTheme: (next) => {
      theme = next;
      monacoTheme?.setTheme(next);
      for (const c of controls) c.applyTheme(next);
    },
    on: (event, listener) => {
      listeners[event].add(listener as never);
      return () => listeners[event].delete(listener as never);
    },
    register: (c) => {
      controls.push(c);
      c.applyTheme(theme);
      if (engine) c.engineChanged();
      return () => {
        const i = controls.indexOf(c);
        if (i !== -1) controls.splice(i, 1);
      };
    },
    edit: (c, text) => {
      pending = { c, text };
      flush();
    },
    reportError: (c, error) => emit('error', { error, pane: c?.pane }),
    dispose: () => {
      disposed = true;
      flush.cancel();
      for (const c of [...controls]) c.pane.dispose();
      monacoTheme?.dispose();
      for (const set of Object.values(listeners)) set.clear();
    },
  };

  ready.then(
    (e) => {
      if (disposed) return;
      engine = e;
      stage2Pending = resolved.loading && !e.markupFormats;
      e.onFeatureChange(() => {
        stage2Pending = false;
        for (const c of controls) c.engineChanged();
      });
      for (const c of controls) c.engineChanged();
      emit('ready', e);
      void bindSchema(e);
    },
    (err: unknown) => {
      stage2Pending = false;
      log.error('the bitmark engine failed to load', err);
      emit('error', { error: err instanceof Error ? err : new Error(String(err)), pane: undefined });
    },
  );

  // The JSON schema for the session's JSON panes (D2): the host's, or the
  // one the engine's own version publishes.
  const bindSchema = async (e: BitmarkEngine) => {
    if (options.schema === false) return;
    let schema = options.schema;
    if (schema === undefined || typeof schema === 'string') {
      const url =
        typeof schema === 'string'
          ? schema
          : resolved.url
            ? schemaUrlFor(resolved.url)
            : schemaUrlForVersion(e.version);
      schema = await loadBitmarkJsonSchema(url);
    }
    if (schema !== undefined && !disposed) bindBitmarkJsonSchema(monaco, schema);
  };

  return session;
};

export type { BitmarkTheme };
