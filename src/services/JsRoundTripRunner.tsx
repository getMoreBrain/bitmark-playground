// @awa-component: PLAN-012-JsRoundTripRunner
import type { BitWrapperJson } from '@gmb/bitmark-parser-generator';
import { useEffect } from 'react';
import { subscribe } from 'valtio';

import { bitmarkState } from '../state/bitmarkState';
import { StringUtils } from '../utils/StringUtils';
import { JS_JSON_TO_MARKUP_OPTIONS, JS_MARKUP_TO_JSON_OPTIONS } from './BitmarkConverter';
import { useBitmarkParserGenerator } from './BitmarkParserGenerator';

// @awa-impl: PLAN-012-Step2 (round-trip js.jsonAsString through bpg: json -> bitmark -> json)
const useJsRoundTripRunner = (): void => {
  const { bitmarkParserGenerator, loadSuccess } = useBitmarkParserGenerator();

  useEffect(() => {
    if (!loadSuccess || !bitmarkParserGenerator) return;

    let lastJson: string | null = null;
    let cancelled = false;
    // Monotonic run id: a slower earlier round trip must not overwrite a later one.
    let runId = 0;
    let latestRunId = 0;

    const run = async (json: string) => {
      if (json === '') {
        bitmarkState.setJsRoundTrip('', [], undefined, undefined);
        return;
      }

      const thisRun = ++runId;

      let roundTripped: BitWrapperJson[] | undefined;
      let error: Error | undefined;

      const startMark = `jsRoundTrip-start-${thisRun}`;
      const endMark = `jsRoundTrip-end-${thisRun}`;
      performance.mark(startMark);

      try {
        const markup = await bitmarkParserGenerator.convert(json, JS_JSON_TO_MARKUP_OPTIONS);
        if (!StringUtils.isString(markup)) {
          throw new Error('Expected string');
        }
        roundTripped = (await bitmarkParserGenerator.convert(
          markup as string,
          JS_MARKUP_TO_JSON_OPTIONS,
        )) as BitWrapperJson[] | undefined;
      } catch (e) {
        error = e as Error;
      }

      performance.mark(endMark);
      const durationSec =
        performance.measure(`jsRoundTrip-${thisRun}`, startMark, endMark).duration / 1000;

      if (cancelled || thisRun < latestRunId) return;
      latestRunId = thisRun;

      bitmarkState.setJsRoundTrip(json, roundTripped, error, durationSec);
    };

    const evaluate = () => {
      const json = bitmarkState.js.jsonAsString;
      if (json === lastJson) return;
      lastJson = json;
      void run(json);
    };

    // Run once with the current value (in case js.jsonAsString was set before the
    // parser became ready, or before this hook mounted).
    evaluate();

    const unsubscribe = subscribe(bitmarkState.js, evaluate);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [bitmarkParserGenerator, loadSuccess]);
};

// Renderless component that maintains the WASM Check LED reference JSON. Mount
// once inside `BitmarkParserGeneratorProvider` so the hook can read its context.
const JsRoundTripRunner = (): null => {
  useJsRoundTripRunner();
  return null;
};

export { JsRoundTripRunner, useJsRoundTripRunner };
