import type { IRange } from 'monaco-editor';
import {
  parseReplaceString,
  ReplacePattern,
} from 'monaco-editor/esm/vs/editor/contrib/find/browser/replacePattern.js';

import { regexError, SearchModel, SearchOptions, WORD_SEPARATORS } from './findAll';

/** One match and the text that replaces it. */
export interface Replacement {
  readonly range: IRange;
  readonly text: string;
}

/** The most matches Replace All changes in one go (as Monaco's own). */
const REPLACE_LIMIT = 1_073_741_824;

/**
 * Every match of `query` in `model` with its replacement (PLAN-034 D4). A
 * regex search's `replace` is Monaco's replace pattern (`$1`, `$&`, `\n`…);
 * otherwise it is literal. An invalid regex replaces nothing.
 */
export const replacements = (
  model: SearchModel,
  query: string,
  options: SearchOptions,
  replace: string,
): Replacement[] => {
  if (!query || regexError(query, options)) return [];
  const pattern = options.regex
    ? parseReplaceString(replace)
    : ReplacePattern.fromStaticValue(replace);
  return model
    .findMatches(
      query,
      false,
      options.regex,
      options.matchCase,
      options.wholeWord ? WORD_SEPARATORS : null,
      options.regex,
      REPLACE_LIMIT,
    )
    .map((m) => ({ range: m.range, text: pattern.buildReplaceString(m.matches) }));
};
