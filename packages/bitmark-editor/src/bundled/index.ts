// @awa-component: PLAN-021-Bundled
/**
 * `/bundled` (PLAN-020 D4, D8, D12): the custom elements with their own
 * Monaco, for hosts without one. Loads straight from a CDN with no bundler:
 * - this file is small; Monaco (`monaco.js`, `monaco.css`) loads from the
 *   asset base when the first session starts;
 * - Monaco's workers start from same-origin blob URLs that `importScripts`
 *   the worker files, as a cross-origin `new Worker(url)` is refused;
 * - a page that already has Monaco (`MonacoEnvironment` set) is warned and
 *   left alone: use the `/esm` build with your own Monaco instead.
 */
import { setMonacoLoader } from '../elements/defaults';
import { defineBitmarkElements } from '../elements/elements';
import type { BitmarkEngine } from '../engine/types';
import { createBitmarkWorkerEngine } from '../engine/worker/createBitmarkWorkerEngine';
import type { EnginePort } from '../engine/worker/protocol';
import { log } from '../log';
import type { Monaco } from '../monaco/types';

let assetBase = new URL('./', import.meta.url).href;

/**
 * Where `/bundled`'s files are (`monaco.js`, `monaco.css`, the workers).
 * Default: beside this file. Set it when a host bundler moved this file
 * into its own chunk and copied the rest elsewhere.
 */
// @awa-impl: PLAN-021-Step11 (asset base)
export const setBitmarkAssetBase = (base: string): void => {
  assetBase = new URL(base.endsWith('/') ? base : `${base}/`, location.href).href;
};

const asset = (name: string) => new URL(name, assetBase).href;

/** A classic worker from a same-origin blob that loads `url` (which may be cross-origin). */
const classicWorker = (url: string) =>
  new Worker(
    URL.createObjectURL(
      new Blob([`importScripts(${JSON.stringify(url)});`], { type: 'text/javascript' }),
    ),
  );

/** A module worker from a same-origin blob that imports `url` (CORS, as jsDelivr serves). */
const moduleWorker = (url: string) =>
  new Worker(
    URL.createObjectURL(new Blob([`import ${JSON.stringify(url)};`], { type: 'text/javascript' })),
    {
      type: 'module',
    },
  );

type Env = { getWorker?: unknown; getWorkerUrl?: unknown };
const g = self as unknown as { MonacoEnvironment?: Env };

// @awa-impl: PLAN-021-Step11 (the MonacoEnvironment guard, D8)
export const hostMonacoDetected = !!g.MonacoEnvironment;
if (hostMonacoDetected) {
  log.warn(
    'this page already has Monaco (MonacoEnvironment is set); use the /esm build with `monaco: yourMonaco`. ' +
      'Not overwriting the host worker setup.',
  );
} else {
  // @awa-impl: PLAN-021-Step11 (CDN-safe workers)
  g.MonacoEnvironment = {
    getWorker: (_id: string, label: string) =>
      classicWorker(asset(label === 'json' ? 'json.worker.js' : 'editor.worker.js')),
  } as Env;
}

let monacoPromise: Promise<Monaco> | undefined;
/** Load `/bundled`'s Monaco (and its CSS) from the asset base, once. */
export const loadBundledMonaco = (): Promise<Monaco> => {
  monacoPromise ??= (async () => {
    if (!document.querySelector('link[data-bitmark-editor-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = asset('monaco.css');
      link.setAttribute('data-bitmark-editor-css', '');
      document.head.appendChild(link);
    }
    const mod = (await import(/* @vite-ignore */ asset('monaco.js'))) as { monaco: Monaco };
    return mod.monaco;
  })();
  return monacoPromise;
};

/**
 * A worker engine (PLAN-020 D14) whose workers run `/bundled`'s engine
 * worker script, loading the parser at `url`.
 */
export const createBundledWorkerEngine = (
  options: { url?: string; version?: string } = {},
): Promise<BitmarkEngine> =>
  createBitmarkWorkerEngine({
    ...options,
    createPort: () => moduleWorker(asset('engineWorker.js')) as unknown as EnginePort,
  });

setMonacoLoader(loadBundledMonaco);
defineBitmarkElements();

export { setDefaultEngine, setMonacoLoader } from '../elements/defaults';
export { defineBitmarkElements } from '../elements/elements';
export * from '../index';
