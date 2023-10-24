import type { BitWrapperJson, ConvertOptions } from '@gmb/bitmark-parser-generator';
import { useCallback } from 'react';

import { bitmarkState } from '../state/bitmarkState';
import { StringUtils } from '../utils/StringUtils';

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

      performance.mark('Start');

      try {
        json = await bitmarkParserGenerator.convert(markup, options);
      } catch (e) {
        jsonError = e as Error;
      }

      performance.mark('End');
      const convertTimeSecs = Math.round(performance.measure('markupToJson', 'Start', 'End').duration) / 1000;

      // Update state
      bitmarkState.setJson(markup, json as BitWrapperJson[] | undefined, jsonError, convertTimeSecs);
    },
    [bitmarkParserGenerator],
  );

  const jsonToMarkup = useCallback(
    async (json: string, options?: ConvertOptions) => {
      if (!bitmarkParserGenerator) return;

      let markup: unknown;
      let markupError: Error | undefined;

      performance.mark('Start');

      try {
        markup = await bitmarkParserGenerator.convert(json, options);
        if (!StringUtils.isString(markup)) {
          throw new Error('Expected string');
        }
      } catch (e) {
        markupError = e as Error;
      }

      performance.mark('End');
      const convertTimeSecs = Math.round(performance.measure('jsonToMarkup', 'Start', 'End').duration) / 1000;

      // Update state (if no error)
      if (!markupError || markupError.message !== 'Expected string') {
        bitmarkState.setMarkup(json, markup as string | undefined, markupError, convertTimeSecs);
      }
    },
    [bitmarkParserGenerator],
  );

  return {
    markupToJson,
    jsonToMarkup,
  };
};

export { useBitmarkConverter };
