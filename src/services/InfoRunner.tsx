// @awa-component: PLAN-015-InfoRunner
import type { BitWrapperJson } from '@gmb/bitmark-parser-generator';
import { useEffect } from 'react';
import { subscribe } from 'valtio';

import { bitmarkState } from '../state/bitmarkState';
import { throwIfParserError, useBitmarkParser } from './BitmarkParser';

/**
 * Distinct bit names from the parser JSON output, in first-occurrence order.
 *
 * A document may repeat a bit type; the info output is per-type, so duplicates
 * would only repeat identical text.
 */
const bitNamesOf = (json: readonly BitWrapperJson[]): string[] => {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const wrapper of json) {
    const name = wrapper?.bit?.type;
    if (typeof name === 'string' && name !== '' && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
};

let infoSeq = 0;

// @awa-impl: PLAN-015-Step3 (per-bit info for the current WASM JSON)
const useInfoRunner = (): void => {
  const { info: wasmInfo, loadSuccess } = useBitmarkParser();

  useEffect(() => {
    if (!loadSuccess || !wasmInfo) return;

    let lastUpdates = -1;

    const run = (json: readonly BitWrapperJson[]) => {
      const names = bitNamesOf(json);
      if (names.length === 0) {
        bitmarkState.setInfo('', undefined, undefined);
        return;
      }

      const seq = ++infoSeq;
      const startMark = `info-start-${seq}`;
      const endMark = `info-end-${seq}`;
      performance.mark(startMark);

      // One failing bit reports inline; the others still show their info.
      const sections = names.map((bit) => {
        try {
          return throwIfParserError(wasmInfo({ infoType: 'bit', bit }));
        } catch (e) {
          return `[${bit}] info failed: ${(e as Error).message}`;
        }
      });

      performance.mark(endMark);
      const durationSec =
        performance.measure(`info-report-${seq}`, startMark, endMark).duration / 1000;

      bitmarkState.setInfo(sections.join('\n\n'), undefined, durationSec);
    };

    const evaluate = () => {
      const { json, jsonUpdates, jsonError } = bitmarkState.wasm;
      // Re-run per regeneration, not per value change (mirrors MappingsRunner).
      if (jsonUpdates === lastUpdates) return;
      lastUpdates = jsonUpdates;
      // A failed parse regenerates nothing — keep the last good output.
      if (jsonError) return;
      run(json);
    };

    evaluate();

    const unsubscribe = subscribe(bitmarkState.wasm, evaluate);

    return () => {
      unsubscribe();
    };
  }, [wasmInfo, loadSuccess]);
};

// Renderless component driving the Info tab. Mount once inside
// `BitmarkParserProvider` so the hook can read its context.
const InfoRunner = (): null => {
  useInfoRunner();
  return null;
};

export { bitNamesOf, InfoRunner, useInfoRunner };
