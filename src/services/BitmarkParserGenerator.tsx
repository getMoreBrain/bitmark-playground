import type { BitmarkParserGenerator } from '@gmb/bitmark-parser-generator';
import { useScript } from '@uidotdev/usehooks';
import { createContext, ReactElement, ReactNode, useContext, useMemo, useState } from 'react';

import { log } from '../logging/log';

const BITMARK_PARSER_GENERATOR_SCRIPT_URL =
  'https://cdn.jsdelivr.net/npm/@gmb/bitmark-parser-generator@${version}/dist/browser/bitmark-parser-generator.min.js';

// Single cache-buster timestamp
const _cacheBuster = Date.now();

interface BitmarkParserGeneratorProviderProps {
  children?: ReactNode;
}

interface IBitmarkParserGeneratorContext {
  loadSuccess: boolean;
  loadError: boolean;
  bitmarkParserGenerator: BitmarkParserGenerator | undefined;
  // toggleDark?: () => void;
}

const defaultState = {
  loadSuccess: false,
  loadError: false,
  bitmarkParserGenerator: undefined,
};

const BitmarkParserGeneratorContext = createContext<IBitmarkParserGeneratorContext>(defaultState);

const useBitmarkParserGenerator = () => useContext(BitmarkParserGeneratorContext);

const BitmarkParserGeneratorProvider = (
  props: BitmarkParserGeneratorProviderProps,
): ReactElement => {
  const searchParams = new URLSearchParams(window.location.search);
  const version = searchParams.get('v') ?? 'latest';
  const scriptUrl = useMemo(
    () => `${BITMARK_PARSER_GENERATOR_SCRIPT_URL.replace('${version}', version)}?_=${_cacheBuster}`,
    [version],
  );
  const { children } = props;
  const loadStatus = useScript(scriptUrl);
  const [state, setState] = useState<IBitmarkParserGeneratorContext>(defaultState);

  if (!state.loadSuccess && !state.loadError) {
    if (loadStatus === 'ready') {
      // log.debug('BitmarkParserGeneratorProvider: Loaded OK');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bitmarkParserGeneratorLibrary = (window as any).bitmarkParserGenerator;
      if (!bitmarkParserGeneratorLibrary) {
        setState({
          loadSuccess: false,
          loadError: true,
          bitmarkParserGenerator: undefined,
        });
        return <></>;
      }
      const { BitmarkParserGenerator } = bitmarkParserGeneratorLibrary;
      const bitmarkParserGenerator = new BitmarkParserGenerator();
      setState({
        loadSuccess: true,
        loadError: false,
        bitmarkParserGenerator,
      });
    } else if (loadStatus === 'error') {
      log.error('BitmarkParserGeneratorProvider: failed to load');
      setState({
        loadSuccess: false,
        loadError: true,
        bitmarkParserGenerator: undefined,
      });
    }
  }

  return (
    <BitmarkParserGeneratorContext.Provider value={state}>
      {children}
    </BitmarkParserGeneratorContext.Provider>
  );
};

export { BitmarkParserGeneratorContext, BitmarkParserGeneratorProvider, useBitmarkParserGenerator };
