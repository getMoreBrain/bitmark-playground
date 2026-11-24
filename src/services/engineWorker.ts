import { loadBitmarkEngine, serveBitmarkEngine } from '@gmb/bitmark-editor';

import { servePatches } from './bitmarkPatcher';

/**
 * The parser worker: the package's own (`@gmb/bitmark-editor/worker`), also
 * answering the diff calls (PLAN-032 D8). The package's engine times the
 * parser's calls itself and keeps the documents (PLAN-036 D4).
 */
serveBitmarkEngine(
  servePatches(self as unknown as Parameters<typeof servePatches>[0]),
  (url, feature) => loadBitmarkEngine({ url, feature }),
);
