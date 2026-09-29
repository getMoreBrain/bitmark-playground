import { describe, expect, it } from 'vitest';

import { buildKnots, mapScrollTop, ScrollGeometry } from './mapScrollTop';

const geo = (bitTops: number[], maxScrollTop: number): ScrollGeometry => ({
  bitTops,
  maxScrollTop,
});

describe('mapScrollTop', () => {
  const src = geo([0, 100, 400, 500], 900);
  const dst = geo([0, 300, 350, 1000], 1500);

  // @awa-test: PLAN-018-Step5 (the end knots map to each other)
  it('maps the ends of the scroll range to each other', () => {
    expect(mapScrollTop(src, dst, 0)).toBe(0);
    expect(mapScrollTop(src, dst, 900)).toBe(1500);
    expect(mapScrollTop(src, dst, 5000)).toBe(1500);
  });

  // @awa-test: PLAN-018-Step5 (bit i's top maps to bit i's top)
  it("maps bit i's top to bit i's top", () => {
    src.bitTops.forEach((top, i) => {
      expect(mapScrollTop(src, dst, top)).toBe(dst.bitTops[i]);
    });
  });

  // @awa-test: PLAN-018-Step5 (the same fraction through the same bit)
  it('maps part-way through a bit to the same fraction of that bit', () => {
    expect(mapScrollTop(src, dst, 50)).toBe(150);
    expect(mapScrollTop(src, dst, 450)).toBe(675);
  });

  // @awa-test: PLAN-018-Step5 (monotonic)
  it('is monotonic', () => {
    let previous = -1;
    for (let top = 0; top <= 900; top += 7) {
      const mapped = mapScrollTop(src, dst, top);
      expect(mapped).toBeGreaterThanOrEqual(previous);
      previous = mapped;
    }
  });

  // @awa-test: PLAN-018-Step5 (proportional with no positions)
  it('is proportional when one side has no bits', () => {
    expect(mapScrollTop(geo([], 1000), dst, 250)).toBe(375);
    expect(mapScrollTop(src, geo([], 300), 450)).toBe(150);
  });

  // @awa-test: PLAN-018-Step5 (extra bits ignored)
  it('pairs only the first min(n, m) bits', () => {
    const short = geo([0, 200], 600);
    expect(mapScrollTop(short, dst, 200)).toBe(300);
    // Past the last pair, the rest of the range maps linearly to the rest.
    expect(mapScrollTop(short, dst, 400)).toBe(900);
  });

  // @awa-test: PLAN-018-Step5 (collapsed knots do not break it)
  it('handles zero-width bits and bits past the end', () => {
    const collapsed = geo([0, 100, 100, 100, 2000], 500);
    const other = geo([0, 100, 200, 300, 400], 500);
    expect(buildKnots(collapsed, 5)).toEqual([0, 0, 100, 100, 100, 500, 500]);
    for (let top = 0; top <= 500; top += 25) {
      expect(Number.isFinite(mapScrollTop(collapsed, other, top))).toBe(true);
      expect(Number.isFinite(mapScrollTop(other, collapsed, top))).toBe(true);
    }
  });

  it('never scrolls a pane that cannot scroll', () => {
    expect(mapScrollTop(src, geo([0, 10], 0), 450)).toBe(0);
    expect(mapScrollTop(geo([0, 10], 0), dst, 0)).toBe(0);
  });
});
