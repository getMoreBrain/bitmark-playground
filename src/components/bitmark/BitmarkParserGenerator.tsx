import type { BitmarkParserGenerator } from '@gmb/bitmark-parser-generator';
import { useScript } from '@uidotdev/usehooks';
import { useState, createContext, useContext, ReactNode, ReactElement } from 'react';

import { log } from '../../logging/log';

const BITMARK_PARSER_GENERATOR_SCRIPT_URL =
  'https://cdn.jsdelivr.net/npm/@gmb/bitmark-parser-generator@latest/dist/browser/bitmark-parser-generator.min.js';

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

const useBitmarkParserGeneratorContext = () => useContext(BitmarkParserGeneratorContext);

const BitmarkParserGeneratorProvider = (props: BitmarkParserGeneratorProviderProps): ReactElement => {
  const { children } = props;
  const loadStatus = useScript(BITMARK_PARSER_GENERATOR_SCRIPT_URL);
  const [state, setState] = useState<IBitmarkParserGeneratorContext>(defaultState);

  if (!state.loadSuccess && !state.loadError) {
    if (loadStatus === 'ready') {
      // log.debug('BitmarkParserGeneratorProvider: Loaded OK');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bitmarkParserGeneratorLibrary = (window as any).bitmarkParserGenerator;
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

  // const toggleDark = () => {
  //   setDark(!dark);
  // };

  return <BitmarkParserGeneratorContext.Provider value={state}>{children}</BitmarkParserGeneratorContext.Provider>;
};

export { BitmarkParserGeneratorProvider, BitmarkParserGeneratorContext, useBitmarkParserGeneratorContext };
