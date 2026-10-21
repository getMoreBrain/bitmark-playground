import type { BitmarkParserGenerator } from '@gmb/bitmark-parser-generator';
import { useScript } from '@uidotdev/usehooks';
import {
  createContext,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSnapshot } from 'valtio';

import { log } from '../logging/log';
import { uiState } from '../state/uiState';

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

/**
 * Loads bpg from the CDN, once mounted. Mounted only once the legacy parser
 * has been turned on, and kept mounted after (PLAN-026 D1).
 */
const BitmarkParserGeneratorLoader = ({
  onLoad,
}: {
  onLoad: (state: IBitmarkParserGeneratorContext) => void;
}): null => {
  const searchParams = new URLSearchParams(window.location.search);
  const version = searchParams.get('v') ?? 'latest';
  const scriptUrl = useMemo(
    () => `${BITMARK_PARSER_GENERATOR_SCRIPT_URL.replace('${version}', version)}?_=${_cacheBuster}`,
    [version],
  );
  const loadStatus = useScript(scriptUrl);

  useEffect(() => {
    if (loadStatus === 'ready') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bitmarkParserGeneratorLibrary = (window as any).bitmarkParserGenerator;
      if (!bitmarkParserGeneratorLibrary) {
        onLoad({ loadSuccess: false, loadError: true, bitmarkParserGenerator: undefined });
        return;
      }
      const { BitmarkParserGenerator } = bitmarkParserGeneratorLibrary;
      onLoad({
        loadSuccess: true,
        loadError: false,
        bitmarkParserGenerator: new BitmarkParserGenerator(),
      });
    } else if (loadStatus === 'error') {
      log.error('BitmarkParserGeneratorProvider: failed to load');
      onLoad({ loadSuccess: false, loadError: true, bitmarkParserGenerator: undefined });
    }
  }, [loadStatus, onLoad]);

  return null;
};

const BitmarkParserGeneratorProvider = (
  props: BitmarkParserGeneratorProviderProps,
): ReactElement => {
  const { children } = props;
  const { showLegacy } = useSnapshot(uiState);
  const [requested, setRequested] = useState(showLegacy);
  if (showLegacy && !requested) setRequested(true);
  const [state, setState] = useState<IBitmarkParserGeneratorContext>(defaultState);

  return (
    <BitmarkParserGeneratorContext.Provider value={state}>
      {requested ? <BitmarkParserGeneratorLoader onLoad={setState} /> : null}
      {children}
    </BitmarkParserGeneratorContext.Provider>
  );
};

export { BitmarkParserGeneratorContext, BitmarkParserGeneratorProvider, useBitmarkParserGenerator };
