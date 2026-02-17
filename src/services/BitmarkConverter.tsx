// @zen-component: PLAN-002-BitmarkConverter
import type { BitWrapperJson, ConvertOptions } from '@gmb/bitmark-parser-generator';
import { useCallback } from 'react';

import { bitmarkState } from '../state/bitmarkState';
import { StringUtils } from '../utils/StringUtils';
import { useBitmarkParser } from './BitmarkParser';
import { useBitmarkParserGenerator } from './BitmarkParserGenerator';

export interface BitmarkConverter {
  jsLoadSuccess: boolean;
  jsLoadError: boolean;
  wasmLoadSuccess: boolean;
  wasmLoadError: boolean;
  markupToJson: (markup: string, options?: ConvertOptions) => Promise<void>;
  jsonToMarkup: (json: string, options?: ConvertOptions) => Promise<void>;
}

const useBitmarkConverter = (): BitmarkConverter => {
  const {
    bitmarkParserGenerator,
    loadSuccess: jsLoadSuccess,
    loadError: jsLoadError,
  } = useBitmarkParserGenerator();
  const {
    parse: wasmParse,
    loadSuccess: wasmLoadSuccess,
    loadError: wasmLoadError,
  } = useBitmarkParser();

  // @zen-impl: PLAN-002-Step3 (dual markupToJson)
  const markupToJson = useCallback(
    async (markup: string, options?: ConvertOptions) => {
      // Sync raw input to both slices immediately so tab switching shows current text
      bitmarkState.syncMarkupInput(markup);

      const promises: Promise<void>[] = [];

      // JS parser
      if (bitmarkParserGenerator) {
        promises.push(
          (async () => {
            let json: unknown;
            let jsonError: Error | undefined;

            const startMark = `js-m2j-start-${Date.now()}`;
            const endMark = `js-m2j-end-${Date.now()}`;
            performance.mark(startMark);

            try {
              json = await bitmarkParserGenerator.convert(markup, options);
            } catch (e) {
              jsonError = e as Error;
            }

            performance.mark(endMark);
            const convertTimeSecs =
              performance.measure('js-markupToJson', startMark, endMark).duration / 1000;

            bitmarkState.setJson(
              'js',
              markup,
              json as BitWrapperJson[] | undefined,
              jsonError,
              convertTimeSecs,
            );
          })(),
        );
      }

      // WASM parser
      if (wasmParse) {
        promises.push(
          (async () => {
            let json: BitWrapperJson[] | undefined;
            let jsonError: Error | undefined;

            const startMark = `wasm-m2j-start-${Date.now()}`;
            const endMark = `wasm-m2j-end-${Date.now()}`;
            performance.mark(startMark);

            try {
              const resultStr = wasmParse(markup);
              json = JSON.parse(resultStr) as BitWrapperJson[];
            } catch (e) {
              jsonError = e as Error;
            }

            performance.mark(endMark);
            const convertTimeSecs =
              performance.measure('wasm-markupToJson', startMark, endMark).duration / 1000;

            bitmarkState.setJson('wasm', markup, json, jsonError, convertTimeSecs);
          })(),
        );
      }

      // WASM parser (full output)
      if (wasmParse) {
        promises.push(
          (async () => {
            let json: BitWrapperJson[] | undefined;
            let jsonError: Error | undefined;

            const startMark = `wasmFull-m2j-start-${Date.now()}`;
            const endMark = `wasmFull-m2j-end-${Date.now()}`;
            performance.mark(startMark);

            try {
              const resultStr = wasmParse(markup);
              json = JSON.parse(resultStr) as BitWrapperJson[];
            } catch (e) {
              jsonError = e as Error;
            }

            performance.mark(endMark);
            const convertTimeSecs =
              performance.measure('wasmFull-markupToJson', startMark, endMark).duration / 1000;

            bitmarkState.setJson('wasmFull', markup, json, jsonError, convertTimeSecs);
          })(),
        );
      }

      await Promise.allSettled(promises);
    },
    [bitmarkParserGenerator, wasmParse],
  );

  // @zen-impl: PLAN-002-Step3 (dual jsonToMarkup)
  const jsonToMarkup = useCallback(
    async (json: string, options?: ConvertOptions) => {
      // Sync raw input to both slices immediately so tab switching shows current text
      bitmarkState.syncJsonInput(json);

      const promises: Promise<void>[] = [];

      // JS parser
      if (bitmarkParserGenerator) {
        promises.push(
          (async () => {
            let markup: unknown;
            let markupError: Error | undefined;

            const startMark = `js-j2m-start-${Date.now()}`;
            const endMark = `js-j2m-end-${Date.now()}`;
            performance.mark(startMark);

            try {
              markup = await bitmarkParserGenerator.convert(json, options);
              if (!StringUtils.isString(markup)) {
                throw new Error('Expected string');
              }
            } catch (e) {
              markupError = e as Error;
            }

            performance.mark(endMark);
            const convertTimeSecs =
              performance.measure('js-jsonToMarkup', startMark, endMark).duration / 1000;

            if (!markupError || markupError.message !== 'Expected string') {
              bitmarkState.setMarkup(
                'js',
                json,
                markup as string | undefined,
                markupError,
                convertTimeSecs,
              );
            }
          })(),
        );
      }

      // WASM parser — generate() not yet implemented
      if (wasmLoadSuccess) {
        promises.push(
          (async () => {
            const startMark = `wasm-j2m-start-${Date.now()}`;
            const endMark = `wasm-j2m-end-${Date.now()}`;
            performance.mark(startMark);

            const markupError = new Error('generate() not yet implemented');

            performance.mark(endMark);
            const convertTimeSecs =
              performance.measure('wasm-jsonToMarkup', startMark, endMark).duration / 1000;

            bitmarkState.setMarkup('wasm', json, undefined, markupError, convertTimeSecs);
          })(),
        );
      }

      // WASM parser (full output) — generate() not yet implemented
      if (wasmLoadSuccess) {
        promises.push(
          (async () => {
            const startMark = `wasmFull-j2m-start-${Date.now()}`;
            const endMark = `wasmFull-j2m-end-${Date.now()}`;
            performance.mark(startMark);

            const markupError = new Error('generate() not yet implemented');

            performance.mark(endMark);
            const convertTimeSecs =
              performance.measure('wasmFull-jsonToMarkup', startMark, endMark).duration / 1000;

            bitmarkState.setMarkup('wasmFull', json, undefined, markupError, convertTimeSecs);
          })(),
        );
      }

      await Promise.allSettled(promises);
    },
    [bitmarkParserGenerator, wasmLoadSuccess],
  );

  return {
    jsLoadSuccess,
    jsLoadError,
    wasmLoadSuccess,
    wasmLoadError,
    markupToJson,
    jsonToMarkup,
  };
};

export { useBitmarkConverter };
