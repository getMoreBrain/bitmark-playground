// @awa-component: PLAN-023-Engine
import type { ConvertOptions, Feature } from '@gmb/bitmark-parser';

import { jsonWithBitStarts } from '../json/jsonText';
import { BitmarkEngine, BitmarkEngineError, RawParserModule } from './types';

// The string-based API (`convert`, `info`) reports failures by returning an
// `error: …`-prefixed string rather than throwing.
const PARSER_ERROR_PREFIX = 'error:';

/** `out` unchanged, or a `BitmarkEngineError` thrown when it is a parser error string. */
export const throwIfParserError = (out: string): string => {
  if (out.startsWith(PARSER_ERROR_PREFIX)) {
    throw new BitmarkEngineError(out.slice(PARSER_ERROR_PREFIX.length).trim());
  }
  return out;
};

/**
 * Where a bit span starts in the output: `outputStart` from parser 7.9
 * (which added `inputStart`), `start` before it.
 */
export const spanOutputStart = (span: { outputStart?: number; start?: number }): number =>
  (span.outputStart ?? span.start)!;

/** The offsets, or `undefined` when the parser gave none (one older than PLAN-223). */
const offsets = (values: readonly unknown[] | undefined): number[] | undefined =>
  values?.every((v) => typeof v === 'number') ? (values as number[]) : undefined;

/** Positions in UTF-16, the editors' own units. */
const UTF16 = { positionEncoding: 'utf-16' } as const;

/** Run `fn` as a promise: a synchronous throw becomes a rejection. */
const call = <T>(fn: () => T): Promise<T> => {
  try {
    return Promise.resolve(fn());
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new BitmarkEngineError(String(e)));
  }
};

export interface CreateBitmarkEngineOptions {
  /**
   * The variant the host already loaded (PLAN-022 D7). The package never
   * calls `init` on a module it was given: a second `init` swaps the
   * variant, which could silently downgrade the host. Default:
   * `bitmark-json`, so the markup panes stay off until told otherwise.
   */
  feature?: Feature;
}

/**
 * An engine over a parser module that runs on the main thread. The module's
 * synchronous calls are wrapped as promises (PLAN-022 D14).
 */
// @awa-impl: PLAN-023-Step1 (main-thread engine over a raw module)
export const createBitmarkEngine = (
  module: RawParserModule,
  options: CreateBitmarkEngineOptions = {},
): BitmarkEngine => {
  let feature: Feature = options.feature ?? 'bitmark-json';
  const listeners = new Set<(feature: Feature) => void>();

  const engine: BitmarkEngine = {
    version: module.version(),
    get feature() {
      return feature;
    },
    capabilities: {
      bitPositions: !!module.convertWithDetails && !!module.splitBits,
      diagnostics: !!module.diagnostics,
      complete: !!module.complete,
      resolve: !!module.resolve,
      hover: !!module.hover,
      info: !!module.info,
    },
    get markupFormats() {
      return feature !== 'bitmark-json';
    },
    setFeature(next) {
      if (next === feature) return;
      feature = next;
      for (const listener of listeners) listener(next);
    },
    onFeatureChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    bitmarkToObjects: (input, opts) => call(() => module.bitmarkToObjects(input, opts)),
    bitmarkToJsonText: (input, opts) =>
      call(() => jsonWithBitStarts(module.bitmarkToObjects(input, { mode: opts?.mode }))),
    convert: (input, opts) => call(() => throwIfParserError(module.convert(input, opts))),
    convertWithBitStarts: (input, opts: ConvertOptions) =>
      call(() => {
        // An engine without `convertWithDetails` still converts; it just
        // gives no positions (PLAN-018 D2).
        if (!module.convertWithDetails) {
          return {
            output: throwIfParserError(module.convert(input, opts)),
            bitStarts: undefined,
            inputStarts: undefined,
          };
        }
        const { output, bitSpans } = module.convertWithDetails(input, { ...opts, bitSpans: true });
        return {
          output: throwIfParserError(output),
          bitStarts: bitSpans?.spans.map(spanOutputStart),
          inputStarts: offsets(bitSpans?.spans.map((span) => span.inputStart)),
        };
      }),
    semanticTokens: (input) =>
      call(() => module.semanticTokens(input, { ...UTF16, tokensLayout: 'absolute' })),
    splitBits: (input) => call(() => module.splitBits?.(input)),
    diagnostics: (input) => call(() => module.diagnostics?.(input, UTF16)),
    complete: (input, position, opts) =>
      call(() => module.complete?.(input, position, { ...UTF16, ...opts })),
    resolve: (input, position, item, opts) =>
      call(() => module.resolve?.(input, position, item, { ...UTF16, ...opts })),
    hover: (input, position) => call(() => module.hover?.(input, position, UTF16)),
    info: (opts) => call(() => (module.info ? throwIfParserError(module.info(opts)) : undefined)),
    dispose: () => listeners.clear(),
  };
  return engine;
};
