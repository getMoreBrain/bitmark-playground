import type { EnginePort } from '@gmb/bitmark-editor';

/**
 * The parser's own time for a call, measured in the worker (PLAN-030 D8).
 * Timed on the main thread, a call would also count the wait behind the
 * other conversions in its worker and the messages each way.
 *
 * The package's protocol: a `call` message `{ type, id, method, args }`
 * answered by a `result` message with the same `id`. The worker adds
 * `parseMs` to the result; the package's side ignores it.
 */

interface CallMessage {
  type: 'call';
  id: number;
}

interface ResultMessage {
  type: 'result';
  id: number;
  parseMs?: number;
}

const isMessage = <T extends { type: string; id: number }>(m: unknown, type: T['type']): m is T =>
  typeof m === 'object' && m !== null && (m as T).type === type && typeof (m as T).id === 'number';

/**
 * The worker side: wraps the port `serveBitmarkEngine` answers on, so each
 * result says how long its call took, from when the worker took it up (it
 * runs one at a time) to its answer.
 */
export const timedPort = (port: EnginePort): EnginePort => {
  const started = new Map<number, number>();
  return {
    postMessage: (m) => {
      if (isMessage<ResultMessage>(m, 'result') && started.has(m.id)) {
        const parseMs = performance.now() - started.get(m.id)!;
        started.delete(m.id);
        port.postMessage({ ...m, parseMs });
      } else port.postMessage(m);
    },
    addEventListener: (type, listener) =>
      port.addEventListener(
        type,
        type === 'message'
          ? (event) => {
              if (isMessage<CallMessage>(event.data, 'call')) {
                started.set(event.data.id, performance.now());
              }
              listener(event);
            }
          : listener,
      ),
    // `serveBitmarkEngine` never removes its listeners.
    removeEventListener: (type, listener) => port.removeEventListener(type, listener),
  };
};

/** The call just sent, and where its result's time goes. */
let lastCall: { times: Map<number, number | undefined>; id: number } | undefined;

/** The call sent since the last take, if any. */
const takeLastCall = (): typeof lastCall => {
  const call = lastCall;
  lastCall = undefined;
  return call;
};

/** The main-thread side: keep the parser times a worker reports. */
export const trackParseTimes = <W extends EnginePort>(worker: W): W => {
  // Only the calls `timeParse` asked about; the rest are not kept.
  const times = new Map<number, number | undefined>();
  worker.addEventListener('message', (event) => {
    const m: unknown = event.data;
    if (isMessage<ResultMessage>(m, 'result') && times.has(m.id)) times.set(m.id, m.parseMs);
  });
  const post = worker.postMessage.bind(worker);
  worker.postMessage = (m: unknown) => {
    if (isMessage<CallMessage>(m, 'call')) lastCall = { times, id: m.id };
    post(m);
  };
  return worker;
};

/**
 * Run an engine call and say how long the parser took. On the main thread
 * (no worker; PLAN-030 D2) that is the time the call took.
 */
export const timeParse = async <T>(call: () => Promise<T>): Promise<{ value: T; ms: number }> => {
  takeLastCall();
  const started = performance.now();
  const result = call();
  // The engine posts its message synchronously, so this is the one just sent.
  const sent = takeLastCall();
  sent?.times.set(sent.id, undefined);
  try {
    const value = await result;
    return { value, ms: sent?.times.get(sent.id) ?? performance.now() - started };
  } finally {
    sent?.times.delete(sent.id);
  }
};
