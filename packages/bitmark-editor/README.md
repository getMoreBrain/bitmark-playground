# @gmb/bitmark-editor

bitmark and JSON editors on Monaco, with optional HTML, XML, Text, Info and
Mappings panes, for any framework.

> Status: pre-release (0.1.0, unpublished). Built from
> [PLAN-020 / PLAN-021](../../.awa/plans/) in the bitmark playground repo.

## What it is

- A **session** holds one bitmark document. The bitmark text is the source
  of truth.
- **Panes** are Monaco editors you mount anywhere: bitmark, JSON, HTML, XML
  (any mapping id), Text, Info and Mappings. Editing any pane updates all the
  others; any pane can be read-only; scroll linking is chosen per pane.
- The **parser** (`@gmb/bitmark-parser`) is either injected by the host or
  loaded by the package (jsDelivr, at a pinned version).
- **Monaco** is either injected by the host (`/esm`) or bundled (`/bundled`).

## Quick start (host with Monaco)

```ts
import * as monaco from 'monaco-editor';
import { createBitmarkSession, createBitmarkPane, createJsonPane } from '@gmb/bitmark-editor';

const session = createBitmarkSession({
  monaco,
  value: '[.article]\nHello **World**!',
  // engine: omitted → the parser loads from jsDelivr at the pinned version.
});
createBitmarkPane(document.getElementById('bitmark')!, session);
createJsonPane(document.getElementById('json')!, session);
session.on('change', ({ bitmark }) => console.log(bitmark));
```

### Injecting your own parser

```ts
import * as parser from '@gmb/bitmark-parser/browser';
await parser.init({ feature: 'bitmark-json' });
createBitmarkSession({ monaco, engine: { module: parser, feature: 'bitmark-json' } });
// After your own init({ feature: 'full' }): session.engine?.setFeature('full')
```

The package never calls `init` on an injected module: a second `init` swaps
the parser's variant, which could downgrade the host (PLAN-020 D7).

## Development

```bash
bun run test        # vitest (jsdom), from this folder
bun run typecheck
bun run lint
```

The playground (repo root) uses this package from source through a path
alias. `spikes/` and `playground-spike/` hold the PLAN-021 Phase 0 and
Phase 1 browser checks (Playwright).
