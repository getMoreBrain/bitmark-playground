# @gmb/bitmark-editor

bitmark and JSON editors on Monaco, with optional HTML, XML, Text, Info and
Mappings panes, for any framework.

> Pre-release: 0.1.0, not yet published. Design: PLAN-022 / PLAN-023 in the
> bitmark playground repo (`.awa/plans/`).

- **Session**: one bitmark document, the source of truth.
- **Panes**: Monaco editors you mount anywhere. Editing any pane updates all
  the others. Any pane can be read-only, and scroll linking is chosen per
  pane.
- **Parser**: injected by your app, or loaded by the package (jsDelivr, at a
  pinned version).
- **Monaco**: injected by your app (`/esm`), or bundled (`/bundled`).

| Entry | What it is |
|---|---|
| `@gmb/bitmark-editor` | The core: engine, session, panes, themes, scroll linking. No Monaco inside. |
| `@gmb/bitmark-editor/elements` | Custom elements over the core (defines them on import). |
| `@gmb/bitmark-editor/react` | React components: `<BitmarkSession>`, `<BitmarkPane>`. |
| `@gmb/bitmark-editor/bundled` | The elements with their own Monaco, for pages without one (CDN-ready). |
| `@gmb/bitmark-editor/worker` | The engine worker script (for `createBitmarkWorkerEngine`). |
| `@gmb/bitmark-editor-angular` | Angular components (a separate package). |

## Which build?

- **Your page already has Monaco** (ESM import, or an AMD `window.monaco`):
  use the core or `/elements` and pass your Monaco. One Monaco on the page.
  Monaco 0.46 up to the current release is supported.
- **It doesn't**: use `/bundled`, which brings Monaco 0.57. If the page
  *does* have Monaco, `/bundled` warns and leaves it alone.

## Quick start: a host with Monaco

```ts
import * as monaco from 'monaco-editor';
import { createBitmarkSession, createBitmarkPane, createJsonPane, createHtmlPane } from '@gmb/bitmark-editor';

const session = createBitmarkSession({
  monaco,                                   // your Monaco: its workers, its theme
  value: '[.article]\nHello **World**!',
  // engine omitted → the parser loads from jsDelivr at the pinned version
});
createBitmarkPane(document.getElementById('bitmark')!, session);
createJsonPane(document.getElementById('json')!, session);
createHtmlPane(document.getElementById('html')!, session, { readOnly: true });
session.on('change', ({ bitmark, source }) => save(bitmark));
```

Your Monaco needs the JSON language (for schema validation) and the suggest
and hover contributions (for completion and hover). If one is missing, that
feature is off and a warning is logged once; nothing crashes.

The bitmark editor:
- highlights, marks errors, and offers completion and hover from the parser;
- auto-closes `[` (the language declares the `[` `]` pair, as the VS Code
  extension does; a `bitmark` language your app registered keeps its own
  configuration);
- completes a bit type to its template (parser 7.9+): `[.art` + Enter
  inserts `[.article]` with the bit's usual tags and body as a snippet.

## Quick start: a static site (no bundler)

```html
<bitmark-session lazy="idle" narrow="static" theme="auto" value="[.article]&#10;Hello">
  <pre data-bitmark-static>[.article]&#10;Hello</pre>   <!-- shown until the editor is ready -->
  <bitmark-pane type="bitmark" style="height: 300px"></bitmark-pane>
  <bitmark-pane type="json" style="height: 300px"></bitmark-pane>
</bitmark-session>
<script type="module" src="https://cdn.jsdelivr.net/npm/@gmb/bitmark-editor@0.1.0/dist/bundled/bundled.js"></script>
```

- `lazy`: `idle` (after the page renders), `click`, `focus`, `visible`, or
  none. Monaco and the parser load only then. A `click` or `focus` session
  needs something to click: put static content inside it.
- `narrow`: `static` keeps the static content on a phone (a coarse pointer
  *and* a narrow viewport); `readonly` makes the panes read-only there;
  `edit` (the default) changes nothing.
- If the CDN can't be reached, the static content stays.
- Pin the versions in the URLs (as above). jsDelivr then serves the files
  as immutable, and every page after the first loads them from the browser
  cache.
- If your build tool moves `bundled.js` away from its siblings, call
  `setBitmarkAssetBase('<url of the dist/bundled folder>')` before the first
  session starts.

## The parser: injected or loaded

```ts
// Loaded by the package (two stages: bitmark-json, then full in the background):
createBitmarkSession({ monaco });                              // pinned version on jsDelivr
createBitmarkSession({ monaco, engine: { version: '7.9.0' } });
createBitmarkSession({ monaco, engine: { url: '/assets/bitmark-parser.min.js' } });

// Injected: your app loads and initialises the parser itself.
import * as parser from '@gmb/bitmark-parser/browser';
await parser.init({ feature: 'bitmark-json' });
const session = createBitmarkSession({ monaco, engine: { module: parser, feature: 'bitmark-json' } });
// Later, after your own init({ feature: 'full' }):
session.engine?.setFeature('full');
```

The package never calls `init` on an injected module, because a second
`init` would swap your parser's variant. The HTML, XML, Text, Info and
Mappings panes need the `full` (or `browser-full`) variant. Until then they
show "This view needs the full bitmark parser."

### Large documents: the worker engine

A 351 KB document costs about 190 ms of main-thread work per keystroke. Past
about 100 KB, run the parser in workers:

```ts
import { createBitmarkWorkerEngine } from '@gmb/bitmark-editor';
import EngineWorker from '@gmb/bitmark-editor/worker?worker'; // Vite (checked)

const engine = await createBitmarkWorkerEngine({ createPort: () => new EngineWorker() });
createBitmarkSession({ monaco, engine });
// Other bundlers: start `@gmb/bitmark-editor/worker` (dist/esm/engineWorker.js) as a
// module worker however your bundler emits worker files.
// /bundled: createBundledWorkerEngine({ url? })
```

It uses two workers: a fast lane for highlighting, diagnostics, completion
and hover, and one for conversions.

## Panes

| Pane | Function | Element `type` | Edits flow back | Scroll linked |
|---|---|---|---|---|
| bitmark | `createBitmarkPane` | `bitmark` | it *is* the document | yes |
| JSON | `createJsonPane` (`mode: 'optimized' \| 'full'`) | `json` (`mode`) | yes | yes |
| HTML | `createHtmlPane` | `html` | yes | yes |
| XML | `createXmlPane` (`mapping`) | `xml` (`mapping`) | yes | yes |
| Text | `createTextPane` | `text` | read-only | yes |
| Info | `createInfoPane` | `info` | read-only | no |
| Mappings | `createMappingsPane` | `mappings` | read-only | no |

Pane options: `readOnly`, `scrollSync`, `label`, `editorOptions` (passed to
Monaco), `errorSlot` (an element or a callback that also receives the
pane's error message), and `onRender` (called with `{ durationMs }` after
each conversion the pane shows). At runtime: `pane.setReadOnly()`,
`pane.setScrollSync()`, `session.setScrollSync([panes])`.

Scrolling stays linked by bit in a pane you typed or pasted into too: the
conversion reports where each bit is in your text (parser 7.8+).

On an error, the edited pane keeps your text, shows the error and gets a
marker. The other panes keep their last good content and are marked
stale. A pane's content is never replaced by an error.

## Session options

`createBitmarkSession({ monaco, engine?, value?, debounceMs?, theme?,
applyMonacoTheme?, schema?, messages?, scrollGroup? })`

- `debounceMs`: wait for a pause in typing before converting (default 0).
- `theme`: `'dark'` (default), `'light'`, `'auto'` (follows the OS), or
  `{ base, monacoTheme?, tokens? }`. Monaco's own theme is page-wide, so it
  is set only with `applyMonacoTheme: true` (`/bundled` sets it itself).
- `schema`: the JSON schema object, its URL, or `false`. The default comes
  from beside the engine, or from the CDN at the engine's version. It
  applies only to the package's own models, never to your JSON editors.
- `messages`: every UI string, including the pane labels.
- `scrollGroup`: an existing scroll group for the panes to join, so that
  editors of your own scroll with them (`createScrollSyncGroup()`).
- `session.setBitmark(text, origin?)`: sets the document from your code.
  `origin` (`{ inputFormat, content, label }`) names the edit for the
  Mappings pane; `false` means it is not an edit (a document switch).
- Events: `session.on('change' | 'error' | 'ready', …)`. The elements
  dispatch the same as DOM events.

### Theming with CSS

Token colours are CSS variables, and yours win over the themes':

```css
.my-docs bitmark-session {
  --bm-tok-bitType-color: var(--syntax-tag);
  --bm-mod-comment-color: gray;
}
```

The names are `--bm-tok-<type>-color` (also `-weight`, `-style`,
`-decoration`) and `--bm-mod-<modifier>-color`. There are also
`--bm-banner-bg`, `--bm-banner-fg`, `--bm-stale-opacity`, `--bm-tab-*` and
`--bm-split-gap`.

## Elements

- `<bitmark-session>`
  - attributes: `value`, `engine-url`, `engine-version`, `engine-feature`,
    `theme`, `lazy`, `narrow`, `debounce`, `schema` (a URL or `off`),
    `apply-monaco-theme`;
  - properties: `monaco`, `engine`, `messages` (UI strings, e.g. from your
    site's i18n; read when the session starts), `value`, `session`,
    `getJson()`, `start()`;
  - events: `change`, `ready`, `error`.
- `<bitmark-pane>`: `type`, `mode`, `mapping`, `label`, `readonly`,
  `scroll-sync="off"`, `session="<id>"` (when it isn't inside its session).
- `<bitmark-tabs>`: tabs over its child panes; only the active one is
  mounted.
- `<bitmark-split direction="row|column|auto">`
- `<bitmark-editor panes="json,html,xml:xml-niso-iec">`: the playground
  arrangement in one tag.

Importing `/elements` in server-side rendering is harmless: the elements are
defined only in a browser.

## React

```tsx
import { BitmarkSession, BitmarkPane } from '@gmb/bitmark-editor/react';

<BitmarkSession monaco={monaco} value={doc} onChange={(e) => setDoc(e.bitmark)}>
  <BitmarkPane type="bitmark" style={{ height: 300 }} />
  <BitmarkPane type="json" readOnly style={{ height: 300 }} />
</BitmarkSession>
```

A controlled `value` that lags behind (your state is still one of the last
few documents the session reported) is treated as an echo and ignored, so it
never undoes typing. The same goes for Angular's `[value]` and the element's
`value` attribute. To set the document back to one of those values on
purpose, call `session.setBitmark()`.

## Angular

See `@gmb/bitmark-editor-angular`: `bm-session` (a form control),
`bm-pane`, `bm-tabs`, `bm-split`, and `provideBitmarkEditor`.

## Content Security Policy

- `script-src` needs the CDN origin (or self-hosting), plus
  `'wasm-unsafe-eval'` for the parser's wasm.
- `worker-src blob:` is needed for `/bundled`'s workers.
- `connect-src` needs the CDN origin (wasm and schema fetches).

Self-host `dist/bundled` and the parser's `dist/browser` to keep everything
same-origin.

## Sizes (`/bundled`, brotli)

| File | Size | Loaded |
|---|---|---|
| `bundled.js` | 13 KB | on import |
| `monaco.js` + `monaco.css` + `codicon.ttf` | 808 + 22 + 66 KB | when the first session starts |
| `editor.worker.js`, `json.worker.js` | 74, 104 KB | on first use |
| parser + `bitmark-json` wasm (+ `full`) | 13 + 222 (+ 346) KB | when the first session starts |

## Development

```bash
bun run test        # vitest (jsdom), in this folder
bun run typecheck
bun run lint
bun run build       # dist/esm, dist/types, dist/bundled
cd examples && bun install && bun run test   # browser checks (Playwright)
```

The playground (at the repo root) uses this package from source through a
path alias. `spikes/` and `playground-spike/` hold the PLAN-023 Phase 0 and
Phase 1 browser checks.
