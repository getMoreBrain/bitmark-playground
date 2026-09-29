import { describe, expect, it } from 'vitest';

import { createChangeFilter } from './MonacoTextArea';

describe('createChangeFilter', () => {
  it('passes a changed value once, then drops repeats of it', () => {
    const filter = createChangeFilter('a');
    expect(filter.changed('ab')).toBe(true);
    // One input applied as many edits: every event reads the same final text.
    expect(filter.changed('ab')).toBe(false);
    expect(filter.changed('ab')).toBe(false);
    expect(filter.changed('abc')).toBe(true);
  });

  it('drops the initial value, and passes a return to an earlier one', () => {
    const filter = createChangeFilter('a');
    expect(filter.changed('a')).toBe(false);
    expect(filter.changed('ab')).toBe(true);
    expect(filter.changed('a')).toBe(true);
  });

  it('counts a programmatic change as held, not reported', () => {
    const filter = createChangeFilter('a');
    filter.set('generated');
    expect(filter.changed('generated')).toBe(false);
    expect(filter.changed('a')).toBe(true);
  });
});
