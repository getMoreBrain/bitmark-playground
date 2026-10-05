// @awa-component: PLAN-002-BitmarkParser

import type {
  bitmarkToObjects as bitmarkToObjectsFn,
  complete as completeFn,
  convert as convertFn,
  convertWithDetails as convertWithDetailsFn,
  diagnostics as diagnosticsFn,
  hover as hoverFn,
  info as infoFn,
  init as initFn,
  resolve as resolveFn,
  semanticTokens as semanticTokensFn,
  splitBits as splitBitsFn,
} from '@gmb/bitmark-parser';
import * as monaco from 'monaco-editor';
import {
  createContext,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { BitmarkEngine } from '../lib/engine';
import { createBitmarkEngine, loadBitmarkModule, throwIfParserError } from '../lib/engine';
import { bindBitmarkJsonSchema, loadBitmarkJsonSchema, Monaco, schemaUrlFor } from '../lib/monaco';
import { log } from '../logging/log';

const BITMARK_PARSER_CDN_URL =
  'https://cdn.jsdelivr.net/npm/@gmb/bitmark-parser@${version}/dist/browser/bitmark-parser.min.js';

/**
 * Where the dev server serves this checkout's own parser build from — the
 * sibling `packages/bitmark-parser/dist/browser` of the repo this playground
 * is a submodule of (see `vite.config.ts`). Selected with `?engine=local`,
 * so an UNRELEASED parser can be driven from the playground before it ships;
 * `main` always loads the published one.
 */
const LOCAL_ENGINE_URL = 'local-engine/bitmark-parser.min.js';

/** The engine URL for this page load: `?engine=local`, else the CDN at `?v2=`. */
export const engineUrl = (search: string, base: string, cacheBuster: number): string => {
  const params = new URLSearchParams(search);
  if (params.get('engine') === 'local') return `${base}${LOCAL_ENGINE_URL}?_=${cacheBuster}`;
  const version = params.get('v2') ?? 'latest';
  return `${BITMARK_PARSER_CDN_URL.replace('${version}', version)}?_=${cacheBuster}`;
};

// Single cache-buster timestamp
const _cacheBuster = Date.now();

interface BitmarkParserModule {
  init: typeof initFn;
  bitmarkToObjects: typeof bitmarkToObjectsFn;
  convert: typeof convertFn;
  info: typeof infoFn;
  semanticTokens: typeof semanticTokensFn;
  version: () => string;
  // Bit positions for linked scrolling (parser PLAN-221). An engine without
  // them leaves every pane unlinked (PLAN-018 D2).
  convertWithDetails?: typeof convertWithDetailsFn;
  splitBits?: typeof splitBitsFn;
  // The editor services (parser PLAN-196). Optional: a parser older than the
  // release that carries them simply has no such export, and the playground
  // then runs without markers, completion or hover.
  diagnostics?: typeof diagnosticsFn;
  complete?: typeof completeFn;
  resolve?: typeof resolveFn;
  hover?: typeof hoverFn;
}

interface BitmarkParserProviderProps {
  children?: ReactNode;
}

interface IBitmarkParserContext {
  loadSuccess: boolean;
  loadError: boolean;
  /**
   * The engine loads in two stages (parser PLAN-203 D4): `bitmark-json`
   * first — the smallest variant, bitmark ↔ JSON and the editor services,
   * so the editor is live sooner — then `full` in the background, which adds
   * the markup formats (HTML, XML, the mapping report), `info` as text and
   * the descriptions. `markupReady` says the second stage has landed.
   */
  markupReady: boolean;
  bitmarkToObjects: typeof bitmarkToObjectsFn | undefined;
  convert: typeof convertFn | undefined;
  convertWithDetails: typeof convertWithDetailsFn | undefined;
  info: typeof infoFn | undefined;
  semanticTokens: typeof semanticTokensFn | undefined;
  splitBits: typeof splitBitsFn | undefined;
  diagnostics: typeof diagnosticsFn | undefined;
  complete: typeof completeFn | undefined;
  resolve: typeof resolveFn | undefined;
  hover: typeof hoverFn | undefined;
  version: string;
  /**
   * The same parser as an async engine (PLAN-021 Step 1), for code moving
   * to `src/lib`. The raw functions above stay until the playground runs on
   * the package (PLAN-021 Step 14).
   */
  engine: BitmarkEngine | undefined;
}

const defaultState: IBitmarkParserContext = {
  loadSuccess: false,
  loadError: false,
  markupReady: false,
  bitmarkToObjects: undefined,
  convert: undefined,
  convertWithDetails: undefined,
  info: undefined,
  semanticTokens: undefined,
  splitBits: undefined,
  diagnostics: undefined,
  complete: undefined,
  resolve: undefined,
  hover: undefined,
  version: '',
  engine: undefined,
};

const BitmarkParserContext = createContext<IBitmarkParserContext>(defaultState);

const useBitmarkParser = () => useContext(BitmarkParserContext);

const BitmarkParserProvider = (props: BitmarkParserProviderProps): ReactElement => {
  const { children } = props;
  const [state, setState] = useState<IBitmarkParserContext>(defaultState);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const moduleUrl = engineUrl(window.location.search, import.meta.env.BASE_URL, _cacheBuster);

    // @awa-impl: PLAN-021-Step1 (the provider loads through the lib's load path)
    const load = async () => {
      try {
        // Stage 1: the smallest variant, so the editor is live as soon as
        // possible — bitmark ↔ JSON, highlighting, diagnostics, completion
        // and hover. `info` waits: this variant renders it as JSON only.
        // Stage 2 (`full`) — the markup formats, `info` as text, and the
        // `info` meta layer (bit and tag descriptions, which completion
        // documentation and hover show) — loads in the background while
        // stage 1 keeps serving; the package swaps atomically.
        const { module: loadedModule, stage2 } = await loadBitmarkModule(moduleUrl, {
          feature: 'full',
        });
        const module = loadedModule as BitmarkParserModule;
        const engine = createBitmarkEngine(loadedModule, { feature: 'bitmark-json' });

        // @awa-impl: PLAN-017-Step5 (the JSON pane validates against the
        // schema the SAME parser version publishes). Independent of the
        // engine: a failure leaves JSON syntax checking as it was.
        // Every JSON model in the playground holds a bitmark document (the
        // JSON tabs and the JSON diff), so the schema applies to all of them.
        void loadBitmarkJsonSchema(schemaUrlFor(moduleUrl)).then(
          (schema) =>
            schema !== undefined &&
            bindBitmarkJsonSchema(monaco as unknown as Monaco, schema, { fileMatch: ['*'] }),
        );

        const loaded: IBitmarkParserContext = {
          loadSuccess: true,
          loadError: false,
          markupReady: false,
          bitmarkToObjects: module.bitmarkToObjects,
          convert: module.convert,
          convertWithDetails: module.convertWithDetails,
          info: undefined,
          semanticTokens: module.semanticTokens,
          splitBits: module.splitBits,
          diagnostics: module.diagnostics,
          complete: module.complete,
          resolve: module.resolve,
          hover: module.hover,
          version: engine.version,
          engine,
        };
        setState(loaded);

        // A stage-2 failure leaves stage 1 in place.
        stage2.then(
          (feature) => {
            engine.setFeature(feature);
            setState({ ...loaded, markupReady: true, info: module.info });
          },
          (e) => log.error('BitmarkParserProvider: the full engine failed to load', e),
        );
      } catch (e) {
        log.error('BitmarkParserProvider: failed to load', e);
        setState({ ...defaultState, loadError: true });
      }
    };

    void load();
  }, []);

  return <BitmarkParserContext.Provider value={state}>{children}</BitmarkParserContext.Provider>;
};

export { BitmarkParserContext, BitmarkParserProvider, throwIfParserError, useBitmarkParser };
