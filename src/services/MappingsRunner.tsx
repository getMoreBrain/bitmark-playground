// @awa-component: PLAN-014-MappingsRunner
import type { convert as convertFn } from '@gmb/bitmark-parser';
import { useEffect } from 'react';
import { subscribe } from 'valtio';

import { bitmarkState } from '../state/bitmarkState';
import { throwIfParserError, useBitmarkParser } from './BitmarkParser';

type ConvertOptions = NonNullable<Parameters<typeof convertFn>[1]>;
type OutputFormatOption = ConvertOptions['outputFormat'];

/**
 * The format each edited window is reported *into*.
 *
 * Everything that is not already bitmark reports its mapping INTO bitmark —
 * that is where the interesting losses show up (a foreign document being
 * imported). Bitmark itself has nowhere to import from, so it reports the
 * other way, into JSON.
 */
const reportTargetFor = (inputFormat: string): string =>
  inputFormat === 'bitmark' ? 'json' : 'bitmark';

const mappingReportOpts = (inputFormat: string): ConvertOptions => ({
  inputFormat,
  outputFormat: reportTargetFor(inputFormat) as OutputFormatOption,
  // Replaces the converted output with the human-readable mapping report.
  mappingReport: true,
});

/** Header line naming the direction the report describes. */
const reportHeader = (label: string, inputFormat: string): string =>
  `Last edited: ${label}  (${inputFormat} → ${reportTargetFor(inputFormat)})\n\n`;

let markSeq = 0;

// @awa-impl: PLAN-014-Step2 (mapping report for the last edited window)
const useMappingsRunner = (): void => {
  const { convert: wasmConvert, loadSuccess } = useBitmarkParser();

  useEffect(() => {
    if (!loadSuccess || !wasmConvert) return;

    let lastUpdates = -1;

    const run = (inputFormat: string, content: string, label: string) => {
      if (inputFormat === '' || content === '') {
        bitmarkState.setMappings('', undefined, undefined);
        return;
      }

      let report: string | undefined;
      let reportError: Error | undefined;

      const seq = ++markSeq;
      const startMark = `mappings-start-${seq}`;
      const endMark = `mappings-end-${seq}`;
      performance.mark(startMark);

      try {
        report =
          reportHeader(label, inputFormat) +
          throwIfParserError(wasmConvert(content, mappingReportOpts(inputFormat)));
      } catch (e) {
        reportError = e as Error;
      }

      performance.mark(endMark);
      const durationSec =
        performance.measure(`mappings-report-${seq}`, startMark, endMark).duration / 1000;

      bitmarkState.setMappings(report, reportError, durationSec);
    };

    const evaluate = () => {
      const { inputFormat, content, label, updates } = bitmarkState.lastEdit;
      // Re-run per recorded edit, not per value change: editing a window back to
      // a previous value is still an edit whose report should refresh.
      if (updates === lastUpdates) return;
      lastUpdates = updates;
      run(inputFormat, content, label);
    };

    evaluate();

    const unsubscribe = subscribe(bitmarkState.lastEdit, evaluate);

    return () => {
      unsubscribe();
    };
  }, [wasmConvert, loadSuccess]);
};

// Renderless component driving the Mappings report. Mount once inside
// `BitmarkParserProvider` so the hook can read its context.
const MappingsRunner = (): null => {
  useMappingsRunner();
  return null;
};

export { MappingsRunner, reportTargetFor, useMappingsRunner };
