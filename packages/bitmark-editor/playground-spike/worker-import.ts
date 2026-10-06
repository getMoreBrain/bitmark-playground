// The README recipe for the worker engine under Vite (`?worker` on the package's export).
import EngineWorker from '@gmb/bitmark-editor/worker?worker';

import { createBitmarkWorkerEngine, type EnginePort } from '../src';

const w = window as unknown as Record<string, unknown>;
void (async () => {
  try {
    const engine = await createBitmarkWorkerEngine({
      url: 'http://localhost:4612/parser/dist/browser/bitmark-parser.min.js',
      createPort: () => new EngineWorker() as unknown as EnginePort,
    });
    w.__result = (await engine.bitmarkToJsonText('[.article]\nVia ?worker')).text;
  } catch (e) {
    w.__result = `error: ${e}`;
  }
})();
