import type { ConvertOptions } from '@gmb/bitmark-parser';

/**
 * The `inlineStyle` value a parser needs, when its default is not the one
 * wanted: parser 8 writes toggle tags by default and takes `'legacy'` for
 * classic marks; parser 7 writes classic marks by default and takes
 * `'toggle'` for toggle tags.
 */
export type InlineStyleOption = 'toggle' | 'legacy';

/** The first major version that writes toggle tags by default. */
const TOGGLE_DEFAULT_MAJOR = 8;

/** The parser's major version, or `undefined` when unreadable. */
const majorVersion = (version: string): number | undefined => {
  const major = Number.parseInt(version.replace(/^v/, ''), 10);
  return Number.isNaN(major) ? undefined : major;
};

/**
 * The `inlineStyle` option for the parser at `version`, or `undefined` to
 * leave it out (PLAN-035 D2). An unreadable version is taken as before 8.
 */
export const inlineStyleOption = (
  version: string,
  toggleTags: boolean,
): InlineStyleOption | undefined => {
  const toggleByDefault = (majorVersion(version) ?? 0) >= TOGGLE_DEFAULT_MAJOR;
  if (toggleByDefault) return toggleTags ? undefined : 'legacy';
  return toggleTags ? 'toggle' : undefined;
};

/**
 * `{ inlineStyle }` to spread into the parser's options, or nothing. The
 * dev dependency (parser 7) does not type `'legacy'` (parser 8).
 */
export const inlineStyleOptions = (
  style: InlineStyleOption | undefined,
): Pick<ConvertOptions, 'inlineStyle'> =>
  style === undefined ? {} : { inlineStyle: style as ConvertOptions['inlineStyle'] };
