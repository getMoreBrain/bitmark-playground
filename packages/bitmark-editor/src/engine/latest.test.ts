import { describe, expect, it } from 'vitest';

import { createLatestRunner, SUPERSEDED } from './latest';

/** A run whose completion the test controls. */
const controlled = () => {
  const runs: { arg: number; finish(v?: string): void; fail(e: Error): void }[] = [];
  const run = (arg: number) =>
    new Promise<string>((resolve, reject) =>
      runs.push({ arg, finish: (v) => resolve(v ?? `r${arg}`), fail: reject }),
    );
  return { runs, run };
};

describe('createLatestRunner (PLAN-022 D14)', () => {
  // @awa-test: PLAN-023-Step1a (one in flight; only the newest waits)
  it('runs one at a time, and only the newest of a burst runs next', async () => {
    const { runs, run } = controlled();
    const latest = createLatestRunner(run);
    const a = latest(1);
    const b = latest(2);
    const c = latest(3);
    expect(runs.map((r) => r.arg)).toEqual([1]);
    await expect(b).resolves.toBe(SUPERSEDED);
    runs[0]!.finish();
    await expect(a).resolves.toBe('r1');
    await Promise.resolve();
    expect(runs.map((r) => r.arg)).toEqual([1, 3]);
    runs[1]!.finish();
    await expect(c).resolves.toBe('r3');
  });

  // @awa-test: PLAN-023-Step1a (a failure does not block the queue)
  it('starts the waiting run even when the one in flight fails', async () => {
    const { runs, run } = controlled();
    const latest = createLatestRunner(run);
    const a = latest(1);
    const b = latest(2);
    runs[0]!.fail(new Error('x'));
    await expect(a).rejects.toThrow('x');
    await Promise.resolve();
    runs[1]!.finish();
    await expect(b).resolves.toBe('r2');
  });

  // @awa-test: PLAN-023-Step1a (property: bursts never run more than first + last)
  it.each([1, 2, 5, 20])('a burst of %i calls runs at most twice', async (n) => {
    const { runs, run } = controlled();
    const latest = createLatestRunner(run);
    const results = Array.from({ length: n }, (_, i) => latest(i));
    runs[0]!.finish();
    await Promise.resolve();
    await Promise.resolve();
    runs[1]?.finish();
    const settled = await Promise.all(results);
    expect(runs.length).toBe(Math.min(n, 2));
    expect(settled.filter((s) => s !== SUPERSEDED)).toHaveLength(Math.min(n, 2));
    expect(settled[n - 1]).toBe(`r${n - 1}`);
  });
});
