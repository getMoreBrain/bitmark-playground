import {
  BitmarkEngine,
  createBitmarkEngine,
  createLatestRunner,
  LoadBitmarkEngineOptions,
  loadBitmarkModule,
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
  EditOrigin,
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
): {
  engine: Promise<BitmarkEngine>;
  loading: boolean;
  url?: string;
  /** The load path's stage 2: settles when the full variant lands, or fails. */
  stage2?: Promise<unknown>;
} => {
  if (source && isEngine(source)) return { engine: Promise.resolve(source), loading: false };
  if (source && isPromise(source)) return { engine: source, loading: false };
  if (source && isRaw(source)) {
    // Injected (D7): never initialised here; the host declares its variant.
    return {
      engine: Promise.resolve(createBitmarkEngine(source.module, { feature: source.feature })),
      loading: false,
    };
  }
  const options = (source ?? {}) as LoadBitmarkEngineOptions;
  const url = options.url ?? parserCdnUrl(options.version);
  // The load path (D2): two stages, the second followed here so that a
  // failure ends "loading" (the markup panes then say they need the full parser).
  const loaded = loadBitmarkModule(url, options);
  const engine = loaded.then(({ module, stage2 }) => {
    const e = createBitmarkEngine(module, { feature: 'bitmark-json' });
    stage2.then(
      (feature) => e.setFeature(feature),
      () => undefined,
    );
    return e;
  });
  const stage2 = loaded.then(({ stage2 }) => stage2);
  stage2.catch(() => undefined);
  return { engine, loading: true, url, stage2 };
};

/**
 * One bitmark document (PLAN-022 D9). The bitmark text is the source of
 * truth: an edit in any pane converts to bitmark, then every other pane
 * regenerates from it; the edited pane keeps the user's text. A failed
 * conversion keeps the last good document, marks the edited pane and shows
 * the others as stale (D15).
 */
export const createBitmarkSession = (options: BitmarkSessionOptions): BitmarkSession => {
  const { monaco } = options;
  setupBitmarkMonaco({ monaco });
  const messages = resolveMessages(options.messages);
  const scrollGroup = options.scrollGroup ?? createScrollSyncGroup();
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
  /**
   * +1 per edit started and per commit: a conversion whose number is no
   * longer the latest is dropped, result and error alike, so a slow
   * conversion can never overwrite a newer edit (from any pane, or the API).
   */
  let editSeq = 0;
  let offFeature: (() => void) | undefined;
  let engineError: Error | undefined;

  const resolved = resolveEngine(options.engine);
  stage2Pending = resolved.loading;
  const ready = resolved.engine;

  // The session-wide theme: Monaco's is global, so it is set here once (D11),
  // from the first theme the session gets (at start or later).
  let monacoTheme: ReturnType<typeof applyBitmarkTheme> | undefined;
  const applyMonacoTheme = (next: BitmarkTheme | undefined) => {
    if (!options.applyMonacoTheme || next === undefined) return;
    if (monacoTheme) monacoTheme.setTheme(next);
    else
      monacoTheme = applyBitmarkTheme(document.createElement('div'), next, {
        monaco,
        applyMonacoTheme: true,
      });
  };
  applyMonacoTheme(theme);

  const commit = (text: string, source: PaneControl | undefined, edit: EditOrigin | undefined) => {
    editSeq++;
    bitmark = text;
    version++;
    if (edit) lastEdit = { ...edit, count: ++editCount };
    source?.showSourceError(undefined);
    // An API change (no source pane) replaces the text even where the user
    // has focus: it is the new document, not an echo of their typing.
    for (const c of controls) if (c !== source) c.render({ force: !source });
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
    const seq = ++editSeq;
    convert(c, text).then(
      (out) => {
        if (disposed || out === SUPERSEDED || seq !== editSeq) return;
        commit(out.bitmark, c, { inputFormat: c.inputFormat, content: text, label: c.label });
        c.pinInput(text, out.inputStarts);
      },
      (err: unknown) => {
        if (disposed || seq !== editSeq) return;
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
    setBitmark: (text, origin) => {
      // The new document replaces an edit still waiting out the debounce,
      // as it replaces one in flight (commit's editSeq).
      flush.cancel();
      pending = undefined;
      commit(
        text,
        undefined,
        origin === false
          ? undefined
          : (origin ?? { inputFormat: 'bitmark', content: text, label: 'API' }),
      );
    },
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
      applyMonacoTheme(next);
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
      else if (engineError) c.showEngineError(engineError);
      else c.render();
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
      offFeature?.();
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
      offFeature = e.onFeatureChange(() => {
        stage2Pending = false;
        for (const c of controls) c.engineChanged();
      });
      for (const c of controls) c.engineChanged();
      emit('ready', e);
      void bindSchema(e);
    },
    (err: unknown) => {
      stage2Pending = false;
      if (disposed) return;
      const error = err instanceof Error ? err : new Error(String(err));
      engineError = error;
      log.error('the bitmark engine failed to load', err);
      for (const c of controls) c.showEngineError(error);
      emit('error', { error, pane: undefined });
    },
  );
  // A stage-2 failure ends "loading": the markup panes say they need the full parser.
  resolved.stage2?.catch(() => {
    if (disposed || !stage2Pending) return;
    stage2Pending = false;
    for (const c of controls) c.engineChanged();
  });

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
