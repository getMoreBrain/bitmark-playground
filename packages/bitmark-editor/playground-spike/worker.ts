import book from '../../../test/fixtures/bitmark/book.bitmark?raw';
import { createBitmarkEngine, loadBitmarkModule } from '../../../src/lib/engine';
import { createBitmarkWorkerEngine } from '../../../src/lib/engine/worker/createBitmarkWorkerEngine';
import type { EnginePort } from '../../../src/lib/engine/worker/protocol';

const w = window as unknown as Record<string, unknown>;
const t: Record<string, unknown> = (w.__spike = {});
const URL_ = 'http://localhost:4602/parser/dist/browser/bitmark-parser.min.js';
const doc = Array(16).fill(book).join('\n\n'); // ~351 KB

/** Longest main-thread task while `work` runs (PerformanceObserver longtask). */
const longestTask = async (work: () => Promise<unknown>) => {
  const durations: number[] = [];
  const obs = new PerformanceObserver((l) => l.getEntries().forEach((e) => durations.push(e.duration)));
  obs.observe({ type: 'longtask', buffered: false });
  const start = performance.now();
  await work();
  const total = performance.now() - start;
  await new Promise((r) => setTimeout(r, 50));
  obs.disconnect();
  return { longest: Math.round(Math.max(0, ...durations)), total: Math.round(total) };
};

/** Ten edits in a row, each converted and highlighted, as typing does. */
const typing = (engine: { bitmarkToJsonText(s: string): Promise<unknown>; semanticTokens(s: string): Promise<unknown>; diagnostics(s: string): Promise<unknown> }) =>
  longestTask(async () => {
    for (let i = 0; i < 10; i++) {
      const text = `${doc}\n\nedit ${i}`;
      await Promise.all([engine.bitmarkToJsonText(text), engine.semanticTokens(text), engine.diagnostics(text)]);
    }
  });

void (async () => {
  try {
    const { module } = await loadBitmarkModule(URL_, { feature: 'full' });
    const main = createBitmarkEngine(module, { feature: 'full' });
    t.docKB = Math.round(doc.length / 1024);
    t.mainThread = await typing(main);
    const worker = await createBitmarkWorkerEngine({
      url: URL_,
      createPort: () =>
        new Worker(new URL('../../../src/lib/engine/worker/engineWorker.ts', import.meta.url), {
          type: 'module',
        }) as unknown as EnginePort,
    });
    t.workerVersion = worker.version;
    t.same = JSON.stringify(await worker.bitmarkToJsonText(doc)) === JSON.stringify(await main.bitmarkToJsonText(doc));
    t.worker = await typing(worker);
    const one = (name: string, f: (x: string) => Promise<unknown>) =>
      longestTask(async () => {
        for (let i = 0; i < 5; i++) await f(`${doc}\n\nedit ${i}`);
      }).then((r) => ((t as Record<string, unknown>)[`w_${name}`] = r));
    await one('jsonText', (x) => worker.bitmarkToJsonText(x));
    await one('tokens', (x) => worker.semanticTokens(x));
    await one('diagnostics', (x) => worker.diagnostics(x));
    const toks = (await main.semanticTokens(doc)) as { tokens: unknown[] };
    t.tokenCount = toks.tokens.length;
    worker.dispose();
    t.done = true;
  } catch (e) {
    t.error = String(e);
    console.error(e);
  }
})();
