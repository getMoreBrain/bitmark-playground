import type { Monaco } from '../monaco/types';
import type { EngineSource } from '../session/types';

/**
 * Page-wide defaults for the elements: where Monaco and the engine come
 * from when an element is not given them as properties. `/bundled` sets
 * the Monaco loader to its own lazily-loaded copy (PLAN-022 D4, D12).
 */
let monacoLoader: (() => Promise<Monaco>) | undefined;
let monacoIsOwn = false;
let defaultEngine: (() => EngineSource) | undefined;

/**
 * Register how the elements get Monaco (called on first use, once). `own`:
 * this Monaco is the package's (`/bundled`), so sessions on it set its theme
 * too (PLAN-022 D11); a host's Monaco keeps the host's theme.
 */
export const setMonacoLoader = (
  loader: () => Promise<Monaco>,
  options?: { own?: boolean },
): void => {
  monacoLoader = loader;
  monacoIsOwn = options?.own ?? false;
  monacoPromise = undefined;
};

/** Whether the registered Monaco is the package's own (see `setMonacoLoader`). */
export const defaultMonacoIsOwn = (): boolean => monacoIsOwn;

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
