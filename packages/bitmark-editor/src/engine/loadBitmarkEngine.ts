import type { Feature } from '@gmb/bitmark-parser';

import { createBitmarkEngine } from './createBitmarkEngine';
import { BitmarkEngine, RawParserModule } from './types';

/**
 * The parser version loaded when the host names none (PLAN-022 D13): one
 * exact version per release, so the editor behaves the same wherever it is
 * installed and the CDN serves it as immutable. Bumped by an automated PR.
 */
export const DEFAULT_PARSER_VERSION = '7.9.0';

/** The jsDelivr URL of the parser's browser build at `version`. */
export const parserCdnUrl = (version: string = DEFAULT_PARSER_VERSION): string =>
  `https://cdn.jsdelivr.net/npm/@gmb/bitmark-parser@${version}/dist/browser/bitmark-parser.min.js`;

export interface LoadedParserModule {
  module: RawParserModule;
  /** Settles when stage 2 has loaded (its variant), or rejects if it failed. */
  stage2: Promise<Feature>;
}

const modules = new Map<string, Promise<LoadedParserModule>>();

/**
 * Import the parser at `url` and initialise it in two stages (parser PLAN-203
 * D4): `bitmark-json` first, the smallest variant, so the editor is live
 * sooner; then `feature` (default `full`, which carries the descriptions
 * that hover and completion show) in the background. Resolves after stage 1.
 * Cached per URL: one module, one initialisation.
 *
 * This is the load path, where the package owns the module (PLAN-022 D7).
 */
export const loadBitmarkModule = (
  url: string,
  options: { feature?: Feature; importModule?: (url: string) => Promise<unknown> } = {},
): Promise<LoadedParserModule> => {
  const hit = modules.get(url);
  if (hit) return hit;
  const feature = options.feature ?? 'full';
  const importModule = options.importModule ?? ((u: string) => import(/* @vite-ignore */ u));
  const loading = (async () => {
    const module = (await importModule(url)) as RawParserModule;
    if (!module.init) throw new Error(`no parser at ${url}: it has no init()`);
    await module.init({ feature: 'bitmark-json' });
    const stage2 =
      feature === 'bitmark-json'
        ? Promise.resolve(feature)
        : module.init({ feature }).then(() => feature);
    // A stage-2 failure leaves stage 1 in place; callers see it via `stage2`.
    stage2.catch(() => undefined);
    return { module, stage2 };
  })();
  modules.set(url, loading);
  // A failed load is not cached, so a later call can retry.
  loading.catch(() => modules.delete(url));
  return loading;
};

export interface LoadBitmarkEngineOptions {
  /** The parser's browser build. Default: jsDelivr at `version`. */
  url?: string;
  /** Default: `DEFAULT_PARSER_VERSION` (D13). `'latest'` works but is not cacheable. */
  version?: string;
  /** Stage 2 variant. Default `full`; `browser-full` is smaller, with no descriptions. */
  feature?: Feature;
  /** For tests: how to import the module. */
  importModule?: (url: string) => Promise<unknown>;
}

/**
 * Load the parser and wrap it as an engine. The engine is ready after stage
 * 1 (`bitmark-json`) and switches its `feature` when stage 2 lands.
 */
export const loadBitmarkEngine = async (
  options: LoadBitmarkEngineOptions = {},
): Promise<BitmarkEngine> => {
  const url = options.url ?? parserCdnUrl(options.version);
  const { module, stage2 } = await loadBitmarkModule(url, options);
  const engine = createBitmarkEngine(module, { feature: 'bitmark-json' });
  stage2.then(
    (feature) => engine.setFeature(feature),
    () => undefined,
  );
  return engine;
};

/** Forget every loaded module. Only for tests. */
export const resetLoadedModules = (): void => modules.clear();
