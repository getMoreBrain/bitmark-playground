import type {
  convert as convertFn,
  convertWithDetails as convertWithDetailsFn,
} from '@gmb/bitmark-parser';

import { throwIfParserError } from '../services/BitmarkParser';

type ConvertOptions = NonNullable<Parameters<typeof convertFn>[1]>;

/** The offsets, or undefined when the engine gave none (PLAN-018 D2). */
const offsets = (values: readonly unknown[] | undefined): number[] | undefined =>
  values?.every((v) => typeof v === 'number') ? (values as number[]) : undefined;

/**
 * Convert, and say where each bit starts in the output and in the input
 * (UTF-16 offsets, the parser's default encoding): the starts of the parser's
 * bit spans (parser PLAN-221, PLAN-223). `bitStarts` are for the pane that
 * shows the output; `inputStarts` for the pane the input came from, when the
 * user edited it (PLAN-020). An engine without `convertWithDetails` still
 * converts; it just gives no positions (PLAN-018 D2), nor does one older
 * than parser PLAN-223, whose spans have `start` / `end` instead. Throws on a
 * parser error, as `throwIfParserError` does.
 */
export const convertWithBitStarts = (
  convert: typeof convertFn,
  convertWithDetails: typeof convertWithDetailsFn | undefined,
  input: string,
  options: ConvertOptions,
): {
  output: string;
  bitStarts: number[] | undefined;
  inputStarts: number[] | undefined;
} => {
  if (!convertWithDetails) {
    return {
      output: throwIfParserError(convert(input, options)),
      bitStarts: undefined,
      inputStarts: undefined,
    };
  }
  const { output, bitSpans } = convertWithDetails(input, { ...options, bitSpans: true });
  return {
    output: throwIfParserError(output),
    bitStarts: offsets(bitSpans?.spans.map((span) => span.outputStart)),
    inputStarts: offsets(bitSpans?.spans.map((span) => span.inputStart)),
  };
};
