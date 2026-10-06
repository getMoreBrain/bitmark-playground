/** One pane's scroll geometry: where each bit's top is, and how far it scrolls. */
export interface ScrollGeometry {
  /** Pixel top of each bit, in bit order. */
  readonly bitTops: readonly number[];
  /** The largest scroll top the pane accepts (0 when it cannot scroll). */
  readonly maxScrollTop: number;
}

/**
 * The knots of the mapping: `[0, bit tops…, maxScrollTop]`, using only the
 * first `pairs` bits, clamped to `[0, maxScrollTop]` and made non-decreasing,
 * so bits past the end of a short document collapse onto the end of the
 * scroll range instead of breaking the mapping.
 */
export const buildKnots = (geometry: ScrollGeometry, pairs: number): number[] => {
  const max = Math.max(0, geometry.maxScrollTop);
  const knots = [0];
  for (let i = 0; i < pairs; i++) {
    const top = Math.min(max, Math.max(0, geometry.bitTops[i] ?? 0));
    knots.push(Math.max(top, knots[knots.length - 1]!));
  }
  knots.push(max);
  return knots;
};

/**
 * Map a scroll top from one pane to the other, bit by bit: part-way through
 * bit *i* on one side is the same fraction of the way through bit *i* on the
 * other. Bits pair by position, up to the shorter list; with no bits on one
 * side the mapping is proportional.
 */
export const mapScrollTop = (
  src: ScrollGeometry,
  dst: ScrollGeometry,
  scrollTop: number,
): number => {
  const pairs = Math.min(src.bitTops.length, dst.bitTops.length);
  const s = buildKnots(src, pairs);
  const d = buildKnots(dst, pairs);
  const last = s.length - 1;
  if (scrollTop <= 0) return 0;
  if (scrollTop >= s[last]!) return d[last]!;

  // The last knot at or before `scrollTop`; the next one is past it, as the
  // knots never decrease and `scrollTop` is inside the range.
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (s[mid]! <= scrollTop) lo = mid;
    else hi = mid;
  }
  const t = (scrollTop - s[lo]!) / (s[lo + 1]! - s[lo]!);
  return d[lo]! + t * (d[lo + 1]! - d[lo]!);
};
