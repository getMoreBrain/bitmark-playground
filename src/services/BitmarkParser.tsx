// @awa-component: PLAN-002-BitmarkParser

import type {
  bitmarkToObjects as bitmarkToObjectsFn,
  convert as convertFn,
  info as infoFn,
  init as initFn,
  semanticTokens as semanticTokensFn,
} from '@gmb/bitmark-parser';
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
import type {
  CompleteSource,
  DiagnosticsSource,
  HoverSource,
} from '../monaco-bitmark/bitmarkEditorTypes';
import { registerBitmarkJsonSchema } from '../monaco-bitmark/bitmarkJsonSchema';

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

// The string-based API (`convert`, `info`) reports failures by returning an
// `error: …`-prefixed string rather than throwing.
const PARSER_ERROR_PREFIX = 'error:';

/**
 * Return `out` unchanged, or throw when it is a parser error string.
 *
 * Call this on every `convert` / `info` result that is piped onward, otherwise
 * an error message is treated as document content and re-parsed downstream.
 */
const throwIfParserError = (out: string): string => {
  if (out.startsWith(PARSER_ERROR_PREFIX)) {
    throw new Error(out.slice(PARSER_ERROR_PREFIX.length).trim());
  }
  return out;
};

interface BitmarkParserModule {
  init: typeof initFn;
  bitmarkToObjects: typeof bitmarkToObjectsFn;
  convert: typeof convertFn;
  info: typeof infoFn;
  semanticTokens: typeof semanticTokensFn;
  version: () => string;
  // The editor services (parser PLAN-196). Optional: a parser older than the
  // release that carries them simply has no such export, and the playground
  // then runs without markers, completion or hover.
  diagnostics?: DiagnosticsSource;
  complete?: CompleteSource;
  hover?: HoverSource;
}

interface BitmarkParserProviderProps {
  children?: ReactNode;
}

interface IBitmarkParserContext {
  loadSuccess: boolean;
  loadError: boolean;
  bitmarkToObjects: typeof bitmarkToObjectsFn | undefined;
  convert: typeof convertFn | undefined;
  info: typeof infoFn | undefined;
  semanticTokens: typeof semanticTokensFn | undefined;
  diagnostics: DiagnosticsSource | undefined;
  complete: CompleteSource | undefined;
  hover: HoverSource | undefined;
  version: string;
}

const defaultState: IBitmarkParserContext = {
  loadSuccess: false,
  loadError: false,
  bitmarkToObjects: undefined,
  convert: undefined,
  info: undefined,
  semanticTokens: undefined,
  diagnostics: undefined,
  complete: undefined,
  hover: undefined,
  version: '',
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
        // Load ES module via dynamic import
        const module = (await import(/* @vite-ignore */ moduleUrl)) as BitmarkParserModule;

        // Initialize WASM. The browser entry defaults to the `browser-full`
        // variant (7.x), which has the same conversion capabilities as the
        // single pre-7 browser build.
        await module.init();

        // Get version from the library itself
        const resolvedVersion = module.version();

        // @awa-impl: PLAN-017-Step5 (the JSON pane validates against the
        // schema the SAME parser version publishes). Independent of the
        // engine: a failure leaves JSON syntax checking as it was.
        void registerBitmarkJsonSchema(moduleUrl);

        setState({
          loadSuccess: true,
          loadError: false,
          bitmarkToObjects: module.bitmarkToObjects,
          convert: module.convert,
          info: module.info,
          semanticTokens: module.semanticTokens,
          diagnostics: module.diagnostics,
          complete: module.complete,
          hover: module.hover,
          version: resolvedVersion,
        });
      } catch (e) {
        log.error('BitmarkParserProvider: failed to load', e);
        setState({
          loadSuccess: false,
          loadError: true,
          bitmarkToObjects: undefined,
          convert: undefined,
          info: undefined,
          semanticTokens: undefined,
          diagnostics: undefined,
          complete: undefined,
          hover: undefined,
          version: '',
        });
      }
    };

    void load();
  }, []);

  return <BitmarkParserContext.Provider value={state}>{children}</BitmarkParserContext.Provider>;
};

export { BitmarkParserContext, BitmarkParserProvider, throwIfParserError, useBitmarkParser };
