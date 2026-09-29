// @awa-component: PLAN-018-ConvertWithBitStarts
import type {
  convert as convertFn,
  convertWithDetails as convertWithDetailsFn,
} from '@gmb/bitmark-parser';

import { throwIfParserError } from '../services/BitmarkParser';

type ConvertOptions = NonNullable<Parameters<typeof convertFn>[1]>;

/**
 * Convert, and say where each bit starts in the output (UTF-16 offsets, the
 * parser's default encoding): the starts of the parser's bit spans (parser
 * PLAN-221). An engine without `convertWithDetails` still converts; it just
 * gives no positions (PLAN-018 D2). Throws on a parser error, as
 * `throwIfParserError` does.
 */
// @awa-impl: PLAN-018-Step3 (conversions record each bit's start)
export const convertWithBitStarts = (
  convert: typeof convertFn,
  convertWithDetails: typeof convertWithDetailsFn | undefined,
  input: string,
  options: ConvertOptions,
): { output: string; bitStarts: number[] | undefined } => {
  if (!convertWithDetails) {
    return { output: throwIfParserError(convert(input, options)), bitStarts: undefined };
  }
  const { output, bitSpans } = convertWithDetails(input, { ...options, bitSpans: true });
  return {
    output: throwIfParserError(output),
    bitStarts: bitSpans?.spans.map((span) => span.start),
  };
};
