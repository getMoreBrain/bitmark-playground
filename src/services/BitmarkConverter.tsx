import type { BitWrapperJson, ConvertOptions } from '@gmb/bitmark-parser-generator';
import { useCallback } from 'react';

import { log } from '../logging/log';
import { bitmarkState } from '../state/bitmarkState';

import { useBitmarkParserGenerator } from './BitmarkParserGenerator';

export interface BitmarkConverter {
  markupToJson: (markup: string, options?: ConvertOptions) => Promise<void>;
  jsonToMarkup: (json: string, options?: ConvertOptions) => Promise<void>;
}

const useBitmarkConverter = (): BitmarkConverter => {
  const { bitmarkParserGenerator } = useBitmarkParserGenerator();

  const markupToJson = useCallback(
    async (markup: string, options?: ConvertOptions) => {
      if (!bitmarkParserGenerator) return;

      let json: unknown;
      let jsonError: Error | undefined;

      try {
        json = await bitmarkParserGenerator.convert(markup, options);
      } catch (e) {
        jsonError = e as Error;
      }

      // Update state
      bitmarkState.setJson(markup, json as BitWrapperJson[] | undefined, jsonError);
    },
    [bitmarkParserGenerator],
  );

  const jsonToMarkup = useCallback(
    async (json: string, options?: ConvertOptions) => {
      if (!bitmarkParserGenerator) return;

      log.debug('BitmarkConverterProvider: jsonToMarkup');

      let markup: unknown;
      let markupError: Error | undefined;

      try {
        markup = await bitmarkParserGenerator.convert(json, options);
      } catch (e) {
        markupError = e as Error;
      }

      // Update state
      bitmarkState.setMarkup(json, markup as string | undefined, markupError);
    },
    [bitmarkParserGenerator],
  );

  return {
    markupToJson,
    jsonToMarkup,
  };
};

export { useBitmarkConverter };
