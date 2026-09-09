// @awa-test: PLAN-017-Step2 (parser hover -> Monaco hover)
import { describe, expect, it } from 'vitest';

import { BitmarkHover } from './bitmarkEditorTypes';
import { toMonacoHover } from './bitmarkHover';

const hover: BitmarkHover = {
  range: { start: { line: 1, character: 0 }, end: { line: 1, character: 7 } },
  contents: { kind: 'markdown', value: '**`[@id]`** — in `[.article]`' },
  data: { kind: 'tag' },
};

describe('toMonacoHover', () => {
  it('shifts the 0-based LSP range to Monaco’s 1-based one', () => {
    expect(toMonacoHover(hover).range).toEqual({
      startLineNumber: 2,
      startColumn: 1,
      endLineNumber: 2,
      endColumn: 8,
    });
  });

  it('passes the parser’s Markdown through, untrusted', () => {
    const contents = toMonacoHover(hover).contents;
    expect(contents).toHaveLength(1);
    expect(contents[0]).toEqual({ value: '**`[@id]`** — in `[.article]`', isTrusted: false });
  });
});
