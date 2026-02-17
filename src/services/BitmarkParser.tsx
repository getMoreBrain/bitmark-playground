// @zen-component: PLAN-002-BitmarkParser
/* eslint-disable no-template-curly-in-string */
import { useState, useEffect, useRef, createContext, useContext, ReactNode, ReactElement } from 'react';

import { log } from '../logging/log';

const BITMARK_PARSER_CDN_URL =
  'https://cdn.jsdelivr.net/npm/@gmb/bitmark-parser@${version}/dist/browser/bitmark-parser.min.js';
const BITMARK_PARSER_PACKAGE_JSON_URL = 'https://cdn.jsdelivr.net/npm/@gmb/bitmark-parser@${version}/package.json';

interface BitmarkParserModule {
  init: (wasmUrl?: string) => Promise<void>;
  parse: (input: string) => string;
  generate: (json: string) => string;
}

interface BitmarkParserProviderProps {
  children?: ReactNode;
}

interface IBitmarkParserContext {
  loadSuccess: boolean;
  loadError: boolean;
  parse: ((input: string) => string) | undefined;
  generate: ((json: string) => string) | undefined;
  version: string;
}

const defaultState: IBitmarkParserContext = {
  loadSuccess: false,
  loadError: false,
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
    const moduleUrl = BITMARK_PARSER_CDN_URL.replace('${version}', version);
    const packageJsonUrl = BITMARK_PARSER_PACKAGE_JSON_URL.replace('${version}', version);

    const load = async () => {
      try {
        // Load ES module via dynamic import
        const module = (await import(/* webpackIgnore: true */ moduleUrl)) as BitmarkParserModule;

        // Initialize WASM
        await module.init();

        // Fetch version from package.json
        let resolvedVersion = '';
        try {
          const res = await fetch(packageJsonUrl);
          if (res.ok) {
            const pkg = await res.json();
            resolvedVersion = pkg.version ?? '';
          }
        } catch {
          // Version fetch is best-effort
          log.error('BitmarkParserProvider: failed to fetch version');
        }

        setState({
          loadSuccess: true,
          loadError: false,
          parse: module.parse,
          generate: module.generate,
          version: resolvedVersion,
        });
      } catch (e) {
        log.error('BitmarkParserProvider: failed to load', e);
        setState({
          loadSuccess: false,
          loadError: true,
          parse: undefined,
          generate: undefined,
          version: '',
        });
      }
    };

    load();
  }, []);

  return <BitmarkParserContext.Provider value={state}>{children}</BitmarkParserContext.Provider>;
};

export { BitmarkParserProvider, BitmarkParserContext, useBitmarkParser };
