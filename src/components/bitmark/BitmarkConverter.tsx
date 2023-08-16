import type { BitWrapperJson } from '@gmb/bitmark-parser-generator';
import { useState, createContext, useContext, ReactNode, ReactElement, useCallback } from 'react';

import { log } from '../../logging/log';

import { useBitmarkParserGeneratorContext } from './BitmarkParserGenerator';

interface BitmarkConverterProviderProps {
  children?: ReactNode;
}

interface IBitmarkConverterContext {
  markup: string | undefined;
  markupError: string | undefined;
  markupUpdates: number;
  json: BitWrapperJson[] | undefined;
  jsonError: string | undefined;
  jsonUpdates: number;
  // AST not implemented yet
  // ast: BitmarkAst | undefined;
  // astError: string | undefined;
  // astUpdates: number;
  markupToJson: (markup: string) => Promise<void>;
  jsonToMarkup: (json: string) => Promise<void>;
}

const defaultState = {
  markup: undefined,
  markupError: undefined,
  markupUpdates: 0,
  json: undefined,
  jsonError: undefined,
  jsonUpdates: 0,
  // AST not implemented yet
  // ast: undefined,
  // astError: undefined,
  // astUpdates: 0,
  markupToJson: () => Promise.resolve(),
  jsonToMarkup: () => Promise.resolve(),
};

interface IBitmarkConverterJsonState {
  json: BitWrapperJson[] | undefined;
  jsonError: string | undefined;
  jsonUpdates: number;
  jsonToMarkup: (json: string) => Promise<void>;
}

const defaultJsonState = {
  json: undefined,
  jsonError: undefined,
  jsonUpdates: -1,
  jsonToMarkup: () => Promise.resolve(),
};

interface IBitmarkConverterMarkupState {
  markup: string | undefined;
  markupError: string | undefined;
  markupUpdates: number;
  markupToJson: (markup: string) => Promise<void>;
}

const defaultMarkupState = {
  markup: undefined,
  markupError: undefined,
  markupUpdates: -1,
  markupToJson: () => Promise.resolve(),
};

const BitmarkConverterContext = createContext<IBitmarkConverterContext>(defaultState);

const useBitmarkConverterContext = () => useContext(BitmarkConverterContext);

const BitmarkConverterProvider = (props: BitmarkConverterProviderProps): ReactElement => {
  const { children } = props;
  const bpgContext = useBitmarkParserGeneratorContext();
  const [state, setState] = useState<IBitmarkConverterContext>(defaultState);

  const { bitmarkParserGenerator } = bpgContext;

  const markupToJson = useCallback(
    async (markup: string) => {
      if (!bitmarkParserGenerator) return;

      log.debug('BitmarkConverterProvider: markupToJson');

      let json: unknown;
      let jsonError: string | undefined;

      try {
        json = await bitmarkParserGenerator.convert(markup, {
          jsonOptions: {
            enableWarnings: true,
            textAsPlainText: true,
          },
        });
      } catch (e) {
        jsonError = JSON.stringify(e, Object.getOwnPropertyNames(e), 2);
      }

      setState({
        ...state,
        json: json as BitWrapperJson[],
        jsonError,
        jsonUpdates: state.jsonUpdates + 1,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bitmarkParserGenerator],
  );

  const jsonToMarkup = useCallback(
    async (json: string) => {
      if (!bitmarkParserGenerator) return;

      log.debug('BitmarkConverterProvider: jsonToMarkup');

      let markup: unknown;
      let markupError: string | undefined;

      try {
        markup = await bitmarkParserGenerator.convert(json);
      } catch (e) {
        markupError = JSON.stringify(e, Object.getOwnPropertyNames(e), 2);
      }

      setState({
        ...state,
        markup: markup as string,
        markupError,
        markupUpdates: state.markupUpdates + 1,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bitmarkParserGenerator],
  );

  return (
    <BitmarkConverterContext.Provider
      value={{
        ...state,
        markupToJson,
        jsonToMarkup,
      }}
    >
      {children}
    </BitmarkConverterContext.Provider>
  );
};

const useBitmarkConverterMarkup = () => {
  const { markup, markupError, markupUpdates, markupToJson } = useBitmarkConverterContext();
  const [state, setState] = useState<IBitmarkConverterMarkupState>(defaultMarkupState);
  const firstUpdate = state.markupUpdates === -1;

  if (firstUpdate || markupUpdates !== state.markupUpdates) {
    setState({
      ...state,
      markup,
      markupError,
      markupUpdates,
      markupToJson,
    });
  }

  return { markup, markupError, markupUpdates, markupToJson };
};

const useBitmarkConverterJson = () => {
  const { json, jsonError, jsonUpdates, jsonToMarkup } = useBitmarkConverterContext();
  const [state, setState] = useState<IBitmarkConverterJsonState>(defaultJsonState);
  const firstUpdate = state.jsonUpdates === -1;

  if (firstUpdate || jsonUpdates !== state.jsonUpdates) {
    setState({
      ...state,
      json,
      jsonError,
      jsonUpdates,
      jsonToMarkup,
    });
  }

  return { json, jsonError, jsonUpdates, jsonToMarkup };
};

export {
  BitmarkConverterProvider,
  BitmarkConverterContext,
  useBitmarkConverterContext,
  useBitmarkConverterMarkup,
  useBitmarkConverterJson,
};

// Todo - create useBitmarkJson / useBitmarkAst / useBitmarkMarkup hooks and trigger only when needed
