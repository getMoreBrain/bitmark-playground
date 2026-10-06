import type * as Parser from '@gmb/bitmark-parser';
import type {
  BitEntry,
  BitSlice,
  CompletionItem,
  CompletionList,
  ConvertOptions,
  Diagnostics,
  Feature,
  Hover,
  InfoOptions,
  OutputMode,
  ParseOptions,
  Position,
  SemanticTokens,
} from '@gmb/bitmark-parser';

export type { Feature };

/**
 * A raw `@gmb/bitmark-parser` module (or a compatible object). The editor
 * services and bit positions are optional: an older parser without them
 * leaves those features off, never an error.
 */
export interface RawParserModule {
  init?: typeof Parser.init;
  version: typeof Parser.version;
  bitmarkToObjects: typeof Parser.bitmarkToObjects;
  convert: typeof Parser.convert;
  semanticTokens: typeof Parser.semanticTokens;
  convertWithDetails?: typeof Parser.convertWithDetails;
  splitBits?: typeof Parser.splitBits;
  diagnostics?: typeof Parser.diagnostics;
  complete?: typeof Parser.complete;
  resolve?: typeof Parser.resolve;
  hover?: typeof Parser.hover;
  info?: typeof Parser.info;
}

/** JSON text written one bit at a time, with where each bit starts (UTF-16). */
export interface JsonText {
  text: string;
  bitStarts: number[];
}

/** Converted output, with where each bit starts in it when the parser says. */
export interface OutputWithBitStarts {
  output: string;
  /** Where each bit starts in the output. */
  bitStarts: number[] | undefined;
  /**
   * Where each bit starts in the input (parser PLAN-223, 7.8+), for the pane
   * the user typed it in (main's PLAN-020). `undefined` from an older parser.
   */
  inputStarts: number[] | undefined;
}

/** What the parser can do; fixed per module, independent of the variant. */
export interface EngineCapabilities {
  readonly bitPositions: boolean;
  readonly diagnostics: boolean;
  readonly complete: boolean;
  readonly resolve: boolean;
  readonly hover: boolean;
  readonly info: boolean;
}

/** Options for `complete` and `resolve`. */
export interface CompletionOptions {
  /** The character that opened the list (LSP); omit when invoked explicitly. */
  triggerCharacter?: string;
  /**
   * A bit-type item inserts the bit's template as a snippet
   * (`name]⏎[@id:…]…`) instead of the name alone (parser 7.9+; an older
   * parser ignores it).
   */
  bitTemplate?: boolean;
}

/**
 * The parser, as the editor uses it (PLAN-022 D2, D7, D14).
 *
 * Every call returns a promise, so a worker engine and a main-thread engine
 * share one interface. A call the parser cannot answer resolves `undefined`
 * (an older parser without that export); a parser error rejects with
 * `BitmarkEngineError`.
 */
export interface BitmarkEngine {
  readonly version: string;
  /** The wasm variant in use: `bitmark-json` has no markup formats or descriptions. */
  readonly feature: Feature;
  readonly capabilities: EngineCapabilities;
  /** The markup formats (HTML, XML, text, mapping report) are available. */
  readonly markupFormats: boolean;
  /** Declare the variant now loaded. The host calls this after its own `init` (D7). */
  setFeature(feature: Feature): void;
  /** Called with the new variant whenever it changes. Returns an unsubscribe. */
  onFeatureChange(listener: (feature: Feature) => void): () => void;

  bitmarkToObjects(input: string, options?: ParseOptions): Promise<BitEntry[]>;
  /** bitmark → the JSON text the JSON pane shows, with bit starts (PLAN-018 D1). */
  bitmarkToJsonText(input: string, options?: { mode?: OutputMode }): Promise<JsonText>;
  convert(input: string, options: ConvertOptions): Promise<string>;
  /** `convert`, plus where each bit starts in the output (PLAN-018 D1). */
  convertWithBitStarts(input: string, options: ConvertOptions): Promise<OutputWithBitStarts>;
  semanticTokens(input: string): Promise<SemanticTokens>;
  splitBits(input: string): Promise<BitSlice[] | undefined>;
  diagnostics(input: string): Promise<Diagnostics | undefined>;
  complete(
    input: string,
    position: Position,
    options?: CompletionOptions,
  ): Promise<CompletionList | undefined>;
  /** Pass the same options as the `complete` call that offered `item`. */
  resolve(
    input: string,
    position: Position,
    item: CompletionItem,
    options?: CompletionOptions,
  ): Promise<CompletionItem | undefined>;
  hover(input: string, position: Position): Promise<Hover | null | undefined>;
  info(options: InfoOptions): Promise<string | undefined>;
  /** Release what the engine holds (a worker engine terminates its workers). */
  dispose(): void;
}

/** A parser call that failed: the parser's own message. */
export class BitmarkEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BitmarkEngineError';
  }
}
