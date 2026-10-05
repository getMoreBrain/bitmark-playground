// @awa-component: PLAN-021-MonacoServices
import { createLatestRunner, SUPERSEDED } from '../engine/latest';
import type { CodeEditor, IDisposable, TextModel } from './types';

/** A trailing-edge debounce with `cancel`; `ms <= 0` runs on the next microtask. */
export const debounce = (fn: () => void, ms: number) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let queued = false;
  const run = () => {
    timer = undefined;
    queued = false;
    fn();
  };
  const debounced = () => {
    if (ms <= 0) {
      if (!queued) {
        queued = true;
        queueMicrotask(() => queued && run());
      }
      return;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, ms);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    queued = false;
  };
  return debounced;
};

export interface ModelJobOptions<R> {
  editor: CodeEditor;
  debounceMs: number;
  /** Compute for this model text. `undefined`: nothing to apply (no engine, no capability). */
  compute: (text: string) => Promise<R> | undefined;
  /** Apply a result that is still current for `model`. */
  apply: (model: TextModel, result: R) => void;
  /** Nothing to compute (no engine): clear what was applied. */
  clear: (model: TextModel) => void;
  onError: (e: unknown, model: TextModel) => void;
}

/**
 * Run `compute` over an editor's text after each change (debounced,
 * latest-wins), and apply the result only if the model is still at the
 * version it was computed for (PLAN-020 D14). `run()` re-runs now, e.g.
 * when the engine changes.
 */
export const attachModelJob = <R>(options: ModelJobOptions<R>): IDisposable & { run(): void } => {
  const { editor } = options;
  let disposed = false;
  const latest = createLatestRunner(
    async (model: TextModel, version: number, text: string): Promise<{ model: TextModel; version: number; result: R } | undefined> => {
      const pending = options.compute(text);
      if (!pending) return undefined;
      return { model, version, result: await pending };
    },
  );

  const run = () => {
    const model = editor.getModel();
    if (!model || disposed) return;
    const version = model.getVersionId();
    latest(model, version, model.getValue()).then(
      (out) => {
        if (disposed || out === SUPERSEDED) return;
        if (out === undefined) {
          options.clear(model);
          return;
        }
        // Stale: the model moved on, or the editor shows another model.
        if (editor.getModel() !== out.model || out.model.getVersionId() !== out.version) return;
        options.apply(out.model, out.result);
      },
      (e) => {
        if (!disposed) options.onError(e, model);
      },
    );
  };
  const debounced = debounce(run, options.debounceMs);
  const listeners = [
    editor.onDidChangeModelContent(() => debounced()),
    editor.onDidChangeModel(() => debounced()),
  ];
  run();

  return {
    run,
    dispose: () => {
      disposed = true;
      debounced.cancel();
      for (const l of listeners) l.dispose();
    },
  };
};
