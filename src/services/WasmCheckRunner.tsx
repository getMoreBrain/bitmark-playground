// @awa-component: PLAN-006-WasmCheckRunner
import { useEffect } from 'react';
import { subscribe } from 'valtio';

import { bitmarkState } from '../state/bitmarkState';
import { StringUtils } from '../utils/StringUtils';
import { useBitmarkParserGenerator } from './BitmarkParserGenerator';

// @awa-impl: PLAN-006-Step2 (round-trip wasm.jsonAsString through JS parser)
const useWasmCheckRunner = (): void => {
  const { bitmarkParserGenerator, loadSuccess } = useBitmarkParserGenerator();

  useEffect(() => {
    if (!loadSuccess || !bitmarkParserGenerator) return;

    let lastJson: string | null = null;
    let cancelled = false;

    const run = async (json: string) => {
      if (json === '') {
        bitmarkState.setWasmCheck('', undefined, undefined);
        return;
      }

      let markup: unknown;
      let markupError: Error | undefined;

      const startMark = `wasmCheck-j2m-start-${Date.now()}`;
      const endMark = `wasmCheck-j2m-end-${Date.now()}`;
      performance.mark(startMark);

      try {
        markup = await bitmarkParserGenerator.convert(json, {
          bitmarkOptions: {
            prettifyJson: true,
          },
        });
        if (!StringUtils.isString(markup)) {
          throw new Error('Expected string');
        }
      } catch (e) {
        markupError = e as Error;
      }

      performance.mark(endMark);
      const convertTimeSecs =
        performance.measure('wasmCheck-jsonToMarkup', startMark, endMark).duration / 1000;

      if (cancelled) return;

      bitmarkState.setWasmCheck(markup as string | undefined, markupError, convertTimeSecs);
    };

    const evaluate = () => {
      const json = bitmarkState.wasm.jsonAsString;
      if (json === lastJson) return;
      lastJson = json;
      void run(json);
    };

    // Run once with the current value (in case wasm.jsonAsString was set
    // before the parser became ready, or before this hook mounted).
    evaluate();

    const unsubscribe = subscribe(bitmarkState.wasm, evaluate);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [bitmarkParserGenerator, loadSuccess]);
};

// Renderless component that drives the WASM Check round-trip. Mount once
// inside `BitmarkParserGeneratorProvider` so the hook can read its context.
const WasmCheckRunner = (): null => {
  useWasmCheckRunner();
  return null;
};

export { useWasmCheckRunner, WasmCheckRunner };
