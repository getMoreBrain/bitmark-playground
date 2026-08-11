// @awa-component: PLAN-011-TextRunner
import { useEffect } from 'react';
import { subscribe } from 'valtio';

import { bitmarkState } from '../state/bitmarkState';
import { throwIfParserError, useBitmarkParser } from './BitmarkParser';

// @awa-impl: PLAN-011-Step2 (WASM optimized bitmark -> plain text)
const useTextRunner = (): void => {
  const { convert: wasmConvert, loadSuccess } = useBitmarkParser();

  useEffect(() => {
    if (!loadSuccess || !wasmConvert) return;

    let lastMarkup: string | null = null;

    const run = (markup: string) => {
      if (markup === '') {
        bitmarkState.setText('', undefined, undefined);
        return;
      }

      let text: string | undefined;
      let textError: Error | undefined;

      const startMark = `text-b2t-start-${Date.now()}`;
      const endMark = `text-b2t-end-${Date.now()}`;
      performance.mark(startMark);

      try {
        text = throwIfParserError(
          wasmConvert(markup, { inputFormat: 'bitmark', outputFormat: 'text' }),
        );
      } catch (e) {
        textError = e as Error;
      }

      performance.mark(endMark);
      const durationSec =
        performance.measure('text-bitmarkToText', startMark, endMark).duration / 1000;

      bitmarkState.setText(text, textError, durationSec);
    };

    const evaluate = () => {
      const markup = bitmarkState.wasm.markup;
      if (markup === lastMarkup) return;
      lastMarkup = markup;
      run(markup);
    };

    // Run once with the current value (parser may have become ready after the
    // first WASM markup was set, or this hook mounted later).
    evaluate();

    const unsubscribe = subscribe(bitmarkState.wasm, evaluate);

    return () => {
      unsubscribe();
    };
  }, [wasmConvert, loadSuccess]);
};

// Renderless component that drives the WASM-opt-bitmark -> text view. Mount once
// inside `BitmarkParserProvider` so the hook can read its context.
const TextRunner = (): null => {
  useTextRunner();
  return null;
};

export { TextRunner, useTextRunner };
