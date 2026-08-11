// @awa-component: PLAN-002-BitmarkParser

import type {
  bitmarkToObjects as bitmarkToObjectsFn,
  convert as convertFn,
  lex as lexFn,
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

const BITMARK_PARSER_CDN_URL =
  'https://cdn.jsdelivr.net/npm/@gmb/bitmark-parser@${version}/dist/browser/bitmark-parser.min.js';

// Single cache-buster timestamp
const _cacheBuster = Date.now();

// The string-based API (`convert`, `lex`) reports failures by returning an
// `error: …`-prefixed string rather than throwing.
const PARSER_ERROR_PREFIX = 'error:';

/**
 * Return `out` unchanged, or throw when it is a parser error string.
 *
 * Call this on every `convert` / `lex` result that is piped onward, otherwise
 * an error message is treated as document content and re-parsed downstream.
 */
const throwIfParserError = (out: string): string => {
  if (out.startsWith(PARSER_ERROR_PREFIX)) {
    throw new Error(out.slice(PARSER_ERROR_PREFIX.length).trim());
  }
  return out;
};

interface BitmarkParserModule {
  init: (wasmUrl?: string) => Promise<void>;
  lex: typeof lexFn;
  bitmarkToObjects: typeof bitmarkToObjectsFn;
  convert: typeof convertFn;
  version: () => string;
}

interface BitmarkParserProviderProps {
  children?: ReactNode;
}

interface IBitmarkParserContext {
  loadSuccess: boolean;
  loadError: boolean;
  lex: typeof lexFn | undefined;
  bitmarkToObjects: typeof bitmarkToObjectsFn | undefined;
  convert: typeof convertFn | undefined;
  version: string;
}

const defaultState: IBitmarkParserContext = {
  loadSuccess: false,
  loadError: false,
  lex: undefined,
  bitmarkToObjects: undefined,
  convert: undefined,
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

    const searchParams = new URLSearchParams(window.location.search);
    const version = searchParams.get('v2') ?? 'latest';
    const moduleUrl = `${BITMARK_PARSER_CDN_URL.replace('${version}', version)}?_=${_cacheBuster}`;

    const load = async () => {
      try {
        // Load ES module via dynamic import
        const module = (await import(/* @vite-ignore */ moduleUrl)) as BitmarkParserModule;

        // Initialize WASM
        await module.init();

        // Get version from the library itself
        const resolvedVersion = module.version();

        setState({
          loadSuccess: true,
          loadError: false,
          lex: module.lex,
          bitmarkToObjects: module.bitmarkToObjects,
          convert: module.convert,
          version: resolvedVersion,
        });
      } catch (e) {
        log.error('BitmarkParserProvider: failed to load', e);
        setState({
          loadSuccess: false,
          loadError: true,
          lex: undefined,
          bitmarkToObjects: undefined,
          convert: undefined,
          version: '',
        });
      }
    };

    void load();
  }, []);

  return <BitmarkParserContext.Provider value={state}>{children}</BitmarkParserContext.Provider>;
};

export { BitmarkParserContext, BitmarkParserProvider, throwIfParserError, useBitmarkParser };
