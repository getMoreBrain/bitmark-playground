import type { editor, IRange } from 'monaco-editor';

/** How a query matches (PLAN-024 D5): Monaco's own find options. */
export interface SearchOptions {
  readonly matchCase: boolean;
  readonly wholeWord: boolean;
  readonly regex: boolean;
}

/** The most matches counted (and highlighted) per pane. */
export const MATCH_CAP = 10_000;

/** Monaco's default `wordSeparators`, which whole-word matching needs. */
export const WORD_SEPARATORS = '`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?';

/** What `findAll` needs from a Monaco model. */
export type SearchModel = Pick<editor.ITextModel, 'findMatches' | 'getValue' | 'getValueInRange'>;

export type FindResult =
  | { readonly ok: true; readonly ranges: readonly IRange[]; readonly capped: boolean }
  | { readonly ok: false; readonly error: string };

const NO_MATCHES: FindResult = { ok: true, ranges: [], capped: false };

/**
 * The error an invalid regex query gives, or undefined. Compiled as Monaco
 * compiles it (`u` included): a pattern only valid without `u`, such as
 * `\-`, would otherwise find nothing with no error shown.
 */
export const regexError = (query: string, options: SearchOptions): string | undefined => {
  if (!options.regex) return undefined;
  try {
    new RegExp(query, 'gmu');
    return undefined;
  } catch (e) {
    return (e as Error).message;
  }
};

/** Every match of `query` in `model`, up to `cap`; an invalid regex is an error, never a throw. */
export const findAll = (
  model: SearchModel,
  query: string,
  options: SearchOptions,
  cap = MATCH_CAP,
): FindResult => {
  if (!query) return NO_MATCHES;
  const error = regexError(query, options);
  if (error) return { ok: false, error };
  const matches = model.findMatches(
    query,
    false,
    options.regex,
    options.matchCase,
    options.wholeWord ? WORD_SEPARATORS : null,
    false,
    cap + 1,
  );
  const capped = matches.length > cap;
  return {
    ok: true,
    ranges: (capped ? matches.slice(0, cap) : matches).map((m) => m.range),
    capped,
  };
};
