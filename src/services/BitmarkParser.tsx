// @zen-component: PLAN-002-BitmarkParser

import type { generate as generateFn, lex as lexFn, parse as parseFn } from '@gmb/bitmark-parser';
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

interface BitmarkParserModule {
  init: (wasmUrl?: string) => Promise<void>;
  lex: typeof lexFn;
  parse: typeof parseFn;
  generate: typeof generateFn;
  version: () => string;
}

interface BitmarkParserProviderProps {
  children?: ReactNode;
}

interface IBitmarkParserContext {
  loadSuccess: boolean;
  loadError: boolean;
  lex: typeof lexFn | undefined;
  parse: typeof parseFn | undefined;
  generate: typeof generateFn | undefined;
  version: string;
}

const defaultState: IBitmarkParserContext = {
  loadSuccess: false,
  loadError: false,
  lex: undefined,
  parse: undefined,
  generate: undefined,
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
          parse: module.parse,
          generate: module.generate,
          version: resolvedVersion,
        });
      } catch (e) {
        log.error('BitmarkParserProvider: failed to load', e);
        setState({
          loadSuccess: false,
          loadError: true,
          lex: undefined,
          parse: undefined,
          generate: undefined,
          version: '',
        });
      }
    };

    void load();
  }, []);

  return <BitmarkParserContext.Provider value={state}>{children}</BitmarkParserContext.Provider>;
};

export { BitmarkParserContext, BitmarkParserProvider, useBitmarkParser };
