// @awa-component: PLAN-021-Engine

/** The result of a run that a newer one replaced before it started. */
export const SUPERSEDED: unique symbol = Symbol('superseded');

/**
 * Latest-wins scheduling for one caller (PLAN-020 D14): at most one run in
 * flight; while it runs, only the newest request waits, and any request it
 * replaces resolves `SUPERSEDED` without running. So a burst of edits never
 * builds a backlog, however slow each run is.
 *
 * Results that arrive for an older input are the caller's to drop (tag them
 * with the model version).
 */
// @awa-impl: PLAN-021-Step1a (latest-wins coalescing per caller)
export const createLatestRunner = <A extends unknown[], R>(run: (...args: A) => Promise<R>) => {
  let inFlight: Promise<unknown> | undefined;
  let waiting:
    | { args: A; resolve(v: R | typeof SUPERSEDED): void; reject(e: unknown): void }
    | undefined;

  const start = (args: A): Promise<R> => {
    const p = run(...args);
    inFlight = p;
    const next = () => {
      inFlight = undefined;
      const w = waiting;
      waiting = undefined;
      if (w) start(w.args).then(w.resolve, w.reject);
    };
    p.then(next, next);
    return p;
  };

  return (...args: A): Promise<R | typeof SUPERSEDED> => {
    if (!inFlight) return start(args);
    waiting?.resolve(SUPERSEDED);
    return new Promise((resolve, reject) => {
      waiting = { args, resolve, reject };
    });
  };
};
