import type { EnginePort, RawParserModule } from '@gmb/bitmark-editor';
import { loadBitmarkModule } from '@gmb/bitmark-editor';
import type * as Parser from '@gmb/bitmark-parser';

/**
 * The parser's diff and its application (PLAN-032): not methods of the
 * package's engine, so the playground's engine worker answers them itself
 * (D8), as `patch` messages beside the package's own.
 */
export interface BitmarkPatcher {
  /** The diff that turns `a` into `b`. */
  diff(a: string, b: string): Promise<Timed>;
  /** `a` with `diff` applied, as bitmark. */
  apply(a: string, diff: string): Promise<Timed>;
}

/** A result, and the parser's time for it (as PLAN-030 D8). */
export interface Timed {
  value: string;
  ms: number;
}

/**
 * How the diff is written (D7): bitmark change proposals (`[.bit-diff]`
 * bits), which `transform` applies as its `patch`.
 */
export const DIFF_OPTIONS: Parser.DiffOptions = { outputFormat: 'bitmark-patch' };

type PatchMethod = keyof BitmarkPatcher;

interface PatchRequest {
  type: 'patch';
  id: number;
  method: PatchMethod;
  args: [string, string];
}

interface PatchResult {
  type: 'patchResult';
  id: number;
  ok: boolean;
  value?: Timed;
  error?: string;
}

/** The parser module, with the exports the engine does not wrap. */
type PatchModule = RawParserModule & {
  diff?: typeof Parser.diff;
  transform?: typeof Parser.transform;
};

/** Time a parser call. */
const timed = (call: () => string): Timed => {
  const started = performance.now();
  const value = call();
  return { value, ms: performance.now() - started };
};

/**
 * The patcher on a loaded parser module: the main thread's (PLAN-030 D2),
 * and the worker's. Calls wait for `ready`, its second stage: the first
 * (`bitmark-json`) has no diff (D8).
 */
export const modulePatcher = (
  module: RawParserModule,
  ready: Promise<unknown> = Promise.resolve(),
): BitmarkPatcher => {
  const { diff, transform } = module as PatchModule;
  const loaded = ready.catch(() => undefined);
  return {
    diff: async (a, b) => {
      await loaded;
      if (!diff) throw new Error('this parser has no diff()');
      return timed(() => diff(a, b, DIFF_OPTIONS));
    },
    apply: async (a, patch) => {
      await loaded;
      if (!transform) throw new Error('this parser has no transform()');
      return timed(() => transform(a, { inputFormat: 'bitmark', outputFormat: 'bitmark', patch }));
    },
  };
};

const isPatchMessage = <T extends { type: string; id: number }>(
  m: unknown,
  type: T['type'],
): m is T =>
  typeof m === 'object' && m !== null && (m as T).type === type && typeof (m as T).id === 'number';

/**
 * The worker side: answers `patch` messages on `port` from the module the
 * engine loads (the package caches it per URL: the same module), once its
 * second stage is in (D8). Returns the port for `serveBitmarkEngine`, which
 * never sees them.
 */
export const servePatches = (
  port: EnginePort,
  load: typeof loadBitmarkModule = loadBitmarkModule,
): EnginePort => {
  let patcher: Promise<BitmarkPatcher> | undefined;
  const answer = async ({ id, method, args }: PatchRequest) => {
    try {
      if (!patcher) throw new Error('the parser is not loaded');
      const value = await (await patcher)[method](...args);
      port.postMessage({ type: 'patchResult', id, ok: true, value } satisfies PatchResult);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      port.postMessage({ type: 'patchResult', id, ok: false, error } satisfies PatchResult);
    }
  };
  return {
    postMessage: (m) => port.postMessage(m),
    addEventListener: (type, listener) =>
      port.addEventListener(
        type,
        type === 'message'
          ? (event) => {
              const m: unknown = event.data;
              if (isPatchMessage<PatchRequest>(m, 'patch')) {
                void answer(m);
                return;
              }
              const init = m as { type?: string; url?: string; feature?: Parser.Feature };
              if (init?.type === 'init' && init.url && !patcher) {
                patcher = load(init.url, { feature: init.feature }).then(({ module, stage2 }) =>
                  modulePatcher(module, stage2),
                );
                patcher.catch(() => undefined);
              }
              listener(event);
            }
          : listener,
      ),
    removeEventListener: (type, listener) => port.removeEventListener(type, listener),
  };
};

/** The main-thread side: the patcher in the worker on `port`. */
export const workerPatcher = (port: EnginePort): BitmarkPatcher => {
  let nextId = 1;
  const pending = new Map<number, { resolve(v: Timed): void; reject(e: Error): void }>();
  port.addEventListener('message', (event) => {
    const m: unknown = event.data;
    if (!isPatchMessage<PatchResult>(m, 'patchResult')) return;
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.ok) p.resolve(m.value ?? { value: '', ms: 0 });
    else p.reject(new Error(m.error ?? 'the patch call failed'));
  });
  const call = (method: PatchMethod, args: [string, string]) =>
    new Promise<Timed>((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      port.postMessage({ type: 'patch', id, method, args } satisfies PatchRequest);
    });
  return {
    diff: (a, b) => call('diff', [a, b]),
    apply: (a, diff) => call('apply', [a, diff]),
  };
};
