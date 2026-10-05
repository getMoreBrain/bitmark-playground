// @awa-component: PLAN-021-WorkerEngine
import type { BitmarkEngine, Feature } from '../types';
import {
  CallRequest,
  ENGINE_METHODS,
  EnginePort,
  FromWorker,
  serializeError,
  ToWorker,
} from './protocol';

/**
 * Serve an engine over `port`: the worker side. On `init` it loads the
 * engine with `load`, then answers each call in order. A worker runs one
 * call at a time, so the fast lane (tokens, diagnostics) is a second worker
 * (PLAN-020 D14).
 */
// @awa-impl: PLAN-021-Step1a (the worker side)
export const serveBitmarkEngine = (
  port: EnginePort,
  load: (url: string, feature: Feature | undefined) => Promise<BitmarkEngine>,
): void => {
  let engine: Promise<BitmarkEngine> | undefined;
  const post = (message: FromWorker) => port.postMessage(message);

  const answer = async (request: CallRequest) => {
    try {
      const e = await engine!;
      if (!ENGINE_METHODS.includes(request.method)) throw new Error(`no method ${request.method}`);
      const fn = e[request.method] as (...args: unknown[]) => Promise<unknown>;
      post({ type: 'result', id: request.id, ok: true, value: await fn(...request.args) });
    } catch (err) {
      post({ type: 'result', id: request.id, ok: false, error: serializeError(err) });
    }
  };

  port.addEventListener('message', (event: MessageEvent) => {
    const message = event.data as ToWorker;
    if (message.type === 'init') {
      if (engine) return;
      engine = load(message.url, message.feature);
      engine.then(
        (e) => {
          post({
            type: 'ready',
            version: e.version,
            feature: e.feature,
            capabilities: e.capabilities,
          });
          e.onFeatureChange((feature) => post({ type: 'feature', feature }));
        },
        (err) => post({ type: 'failed', error: serializeError(err) }),
      );
    } else if (message.type === 'call') {
      void answer(message);
    }
  });
};
