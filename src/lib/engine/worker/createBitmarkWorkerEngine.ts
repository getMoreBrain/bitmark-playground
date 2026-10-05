// @awa-component: PLAN-021-WorkerEngine
import { parserCdnUrl } from '../loadBitmarkEngine';
import { BitmarkEngine, BitmarkEngineError, EngineCapabilities, Feature } from '../types';
import { EngineMethod, EnginePort, FromWorker, ResultMessage } from './protocol';

/**
 * Methods on the fast lane: what the editor needs on every keystroke and
 * must never wait behind a long conversion (PLAN-020 D14).
 */
const FAST_LANE: ReadonlySet<EngineMethod> = new Set([
  'semanticTokens',
  'splitBits',
  'diagnostics',
  'complete',
  'resolve',
  'hover',
]);

export interface CreateBitmarkWorkerEngineOptions {
  /** Start one worker running the engine worker script (`engineWorker`). Called twice: one per lane. */
  createPort: () => EnginePort;
  /** The parser's browser build, loaded inside each worker. Default: jsDelivr at the pinned version. */
  url?: string;
  version?: string;
  /** Stage 2 variant inside the workers. Default `full`. */
  feature?: Feature;
}

interface Lane {
  port: EnginePort;
  feature: Feature;
  call(method: EngineMethod, args: unknown[]): Promise<unknown>;
  ready: Promise<{ version: string; feature: Feature; capabilities: EngineCapabilities }>;
}

const openLane = (port: EnginePort, url: string, feature: Feature | undefined, onFeature: () => void): Lane => {
  let nextId = 0;
  const pending = new Map<number, { resolve(v: unknown): void; reject(e: Error): void }>();
  let resolveReady!: Lane['ready'] extends Promise<infer T> ? (v: T) => void : never;
  let rejectReady!: (e: Error) => void;
  const ready = new Promise<{ version: string; feature: Feature; capabilities: EngineCapabilities }>(
    (res, rej) => {
      resolveReady = res;
      rejectReady = rej;
    },
  );
  const lane: Lane = {
    port,
    feature: 'bitmark-json',
    ready,
    call(method, args) {
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        port.postMessage({ type: 'call', id, method, args });
      });
    },
  };
  port.addEventListener('message', (event: MessageEvent) => {
    const message = event.data as FromWorker;
    if (message.type === 'ready') {
      lane.feature = message.feature;
      resolveReady(message);
    } else if (message.type === 'feature') {
      lane.feature = message.feature;
      onFeature();
    } else if (message.type === 'failed') {
      rejectReady(new BitmarkEngineError(message.error.message));
    } else if (message.type === 'result') {
      const r = message as ResultMessage;
      const p = pending.get(r.id);
      if (!p) return;
      pending.delete(r.id);
      if (r.ok) p.resolve(r.value);
      else {
        const err = new BitmarkEngineError(r.error?.message ?? 'worker call failed');
        err.name = r.error?.name ?? err.name;
        p.reject(err);
      }
    }
  });
  port.postMessage({ type: 'init', url, feature });
  return lane;
};

/**
 * An engine whose parser runs in workers, off the main thread (PLAN-020
 * D14): one worker for the fast lane (tokens, diagnostics, completion,
 * hover, bit splits) and one for conversions. Resolves once both workers
 * have loaded the parser (stage 1); `feature` follows stage 2 once both
 * lanes have it.
 *
 * Calls are not coalesced here: one engine can serve several documents, so
 * "the latest call" is the caller's to decide (`createLatestRunner`).
 */
// @awa-impl: PLAN-021-Step1a (the worker engine)
export const createBitmarkWorkerEngine = async (
  options: CreateBitmarkWorkerEngineOptions,
): Promise<BitmarkEngine> => {
  const url = options.url ?? parserCdnUrl(options.version);
  const listeners = new Set<(feature: Feature) => void>();
  let feature: Feature = 'bitmark-json';
  const lanes: Lane[] = [];
  const onFeature = () => {
    // The engine's variant is the one both lanes have reached.
    if (lanes.length < 2 || lanes[0]!.feature !== lanes[1]!.feature) return;
    setFeature(lanes[0]!.feature);
  };
  const setFeature = (next: Feature) => {
    if (next === feature) return;
    feature = next;
    for (const listener of listeners) listener(next);
  };
  const fast = openLane(options.createPort(), url, options.feature, onFeature);
  const slow = openLane(options.createPort(), url, options.feature, onFeature);
  lanes.push(fast, slow);

  const end = () => {
    for (const lane of lanes) {
      lane.port.terminate?.();
      lane.port.close?.();
    }
  };
  let first;
  try {
    [first] = await Promise.all([fast.ready, slow.ready]);
  } catch (e) {
    end();
    throw e;
  }
  onFeature();

  const call =
    <R>(method: EngineMethod) =>
    (...args: unknown[]): Promise<R> =>
      (FAST_LANE.has(method) ? fast : slow).call(method, args) as Promise<R>;

  return {
    version: first.version,
    get feature() {
      return feature;
    },
    capabilities: first.capabilities,
    get markupFormats() {
      return feature !== 'bitmark-json';
    },
    // The workers own their parser's variant; a host-declared one only labels it.
    setFeature,
    onFeatureChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    bitmarkToObjects: call('bitmarkToObjects'),
    bitmarkToJsonText: call('bitmarkToJsonText'),
    convert: call('convert'),
    convertWithBitStarts: call('convertWithBitStarts'),
    semanticTokens: call('semanticTokens'),
    splitBits: call('splitBits'),
    diagnostics: call('diagnostics'),
    complete: call('complete'),
    resolve: call('resolve'),
    hover: call('hover'),
    info: call('info'),
    dispose: () => {
      listeners.clear();
      end();
    },
  };
};
