// Monaco internals the playground reuses; they ship without type declarations.

declare module 'monaco-editor/esm/vs/editor/contrib/find/browser/replacePattern.js' {
  /** Monaco's replace string, built per match (as its find widget's Replace). */
  export class ReplacePattern {
    static fromStaticValue(value: string): ReplacePattern;
    buildReplaceString(matches: string[] | null, preserveCase?: boolean): string;
  }
  /** Parses `$1`, `$&`, `\n`, `\t`, `\u`… in a regex search's replace string. */
  export function parseReplaceString(replaceString: string): ReplacePattern;
}
