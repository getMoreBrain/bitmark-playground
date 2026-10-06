// @awa-component: PLAN-023-Elements
import type { Monaco } from '../monaco/types';
import type { EngineSource } from '../session/types';

/**
 * Page-wide defaults for the elements: where Monaco and the engine come
 * from when an element is not given them as properties. `/bundled` sets
 * the Monaco loader to its own lazily-loaded copy (PLAN-022 D4, D12).
 */
let monacoLoader: (() => Promise<Monaco>) | undefined;
let defaultEngine: (() => EngineSource) | undefined;

/** Register how the elements get Monaco (called on first use, once). */
export const setMonacoLoader = (loader: () => Promise<Monaco>): void => {
  monacoLoader = loader;
  monacoPromise = undefined;
};

let monacoPromise: Promise<Monaco> | undefined;

/** The page's Monaco, through the registered loader; `undefined` when none is registered. */
export const loadDefaultMonaco = (): Promise<Monaco> | undefined => {
  if (!monacoLoader) return undefined;
  monacoPromise ??= monacoLoader();
  return monacoPromise;
};

/** Register the engine source the elements use when given none (default: the pinned CDN load). */
export const setDefaultEngine = (source: () => EngineSource): void => {
  defaultEngine = source;
};

export const getDefaultEngine = (): EngineSource | undefined => defaultEngine?.();
