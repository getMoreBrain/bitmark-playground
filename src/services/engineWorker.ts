import { loadBitmarkEngine, serveBitmarkEngine } from '@gmb/bitmark-editor';

import { servePatches } from './bitmarkPatcher';
import { timedPort } from './parseTime';

/**
 * The parser worker: the package's own (`@gmb/bitmark-editor/worker`), its
 * results also carrying the parser's time (PLAN-030 D8), and answering the
 * diff calls too (PLAN-032 D8).
 */
serveBitmarkEngine(
  servePatches(timedPort(self as unknown as Parameters<typeof timedPort>[0])),
  (url, feature) => loadBitmarkEngine({ url, feature }),
);
