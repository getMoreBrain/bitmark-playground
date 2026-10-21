import type { BitmarkEngine } from '@gmb/bitmark-editor';
import {
  bindBitmarkJsonSchema,
  createBitmarkEngine,
  createBitmarkWorkerEngine,
  loadBitmarkJsonSchema,
  loadBitmarkModule,
  Monaco,
  schemaUrlFor,
} from '@gmb/bitmark-editor';
import EngineWorker from '@gmb/bitmark-editor/worker?worker';
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
  version: string;
  /** The parser, in workers off the main thread (PLAN-030 D1, D3). */
  engine: BitmarkEngine | undefined;
}

const defaultState: IBitmarkParserContext = {
  loadSuccess: false,
  loadError: false,
  markupReady: false,
  version: '',
  engine: undefined,
};

/**
 * The parser in two workers, a fast lane and a conversion lane (PLAN-030
 * D1); on the main thread if they cannot start (D2).
 */
export const startEngine = async (
  moduleUrl: string,
  createWorker: () => Worker = () => new EngineWorker(),
): Promise<BitmarkEngine> => {
  try {
    return await createBitmarkWorkerEngine({
      createPort: createWorker,
      // A worker resolves a relative URL against its own script, not the page.
      url: new URL(moduleUrl, window.location.href).href,
      feature: 'full',
    });
  } catch (e) {
    log.warn('BitmarkParserProvider: the parser workers failed; parsing on the main thread', e);
    // Stage 1 now; stage 2 (`full`) in the background (parser PLAN-203 D4).
    const { module, stage2 } = await loadBitmarkModule(moduleUrl, { feature: 'full' });
    const engine = createBitmarkEngine(module, { feature: 'bitmark-json' });
    stage2.then(
      (feature) => engine.setFeature(feature),
      (err) => log.error('BitmarkParserProvider: the full engine failed to load', err),
    );
    return engine;
  }
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

    const load = async () => {
      try {
        const engine = await startEngine(moduleUrl);

        // The JSON pane validates against the schema the SAME parser
        // version publishes (PLAN-017). Independent of the
        // engine: a failure leaves JSON syntax checking as it was.
        // Every JSON model in the playground holds a bitmark document, so
        // the schema applies to all of them.
        void loadBitmarkJsonSchema(schemaUrlFor(moduleUrl)).then(
          (schema) =>
            schema !== undefined &&
            bindBitmarkJsonSchema(monaco as unknown as Monaco, schema, { fileMatch: ['*'] }),
        );

        setState({
          loadSuccess: true,
          loadError: false,
          markupReady: engine.markupFormats,
          version: engine.version,
          engine,
        });
        // Stage 2 lands in the background; a failure leaves stage 1 in place.
        engine.onFeatureChange(() =>
          setState((state) => ({ ...state, markupReady: engine.markupFormats })),
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

export { BitmarkParserContext, BitmarkParserProvider, useBitmarkParser };
