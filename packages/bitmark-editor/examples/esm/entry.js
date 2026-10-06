// A host's build consuming /esm by package name, through package.json
// "exports" (PLAN-023 Step 11). Monaco, the parser and React are the host's.
import { createBitmarkSession, createJsonPane } from '@gmb/bitmark-editor';
import '@gmb/bitmark-editor/elements';
import { BitmarkSession } from '@gmb/bitmark-editor/react';

export { BitmarkSession, createBitmarkSession, createJsonPane };
