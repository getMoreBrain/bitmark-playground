# PLAN-023: bitmark Editor Package — Steps

STATUS: in-progress
DIRECTION: lateral
TRACEABILITY: The steps of PLAN-022 (`PLAN-022-bitmark-editor-package.md`), which holds the context, the decisions (D1 to D12), the design notes, the risks and the open questions. Decision ids below refer to PLAN-022.

## Context

PLAN-022 grew past the plan size limit, so its steps and completion criteria
live here. Read PLAN-022 first; nothing here restates its decisions.

## Steps

### Phase 0 — Spikes (done, 2026-10-05)

The spikes live in `packages/bitmark-editor/spikes/` (throwaway; their own
`package.json`, run with `bun run build:bundled` and `npx playwright test`)
and `packages/bitmark-editor/playground-spike/` (served by the playground's
Vite dev server on port 4604). A minimal prototype core (`spikes/proto/core.ts`)
takes an injected Monaco and parser (D2, D8). All 9 browser checks pass.

- [x] Prototype core: a bitmark + JSON pair with highlighting, diagnostics,
  completion, hover, JSON schema, conversion both ways and bit-based scroll
  sync, with no runtime Monaco import. Its `/esm` build is 13 KB.
- [x] No-bundler static page, shaped like the docs site (D12), loading
  `/bundled` cross-origin from a "CDN" origin that serves immutable files
  with CORS, through a plain `<script type="module">`:
  - every service works, and the blob-URL workers start;
  - `lazy="idle"` works, and the static example shows until mount;
  - `narrow="static"` on a coarse pointer and narrow viewport loads nothing
    from the CDN;
  - a blocked CDN leaves the static example in place.
- [x] Monaco 0.46 AMD (`window.monaco` from assets, as in cosmic), injected:
  every service works, and the host's own JSON model gets no bitmark schema
  (D5).
- [x] `/bundled` beside a host Monaco: the guard warns, and the host's
  `MonacoEnvironment` is untouched (D8).
- [x] Angular 21 shaped like cosmic: NgModule bootstrap,
  `provideZoneChangeDetection`, Monaco 0.46 AMD from assets, and the parser
  bundled and initialised by the app (`bitmark-json`, `module_or_path`), then
  injected.
  - `ng build` (production) passes, with the core compiled in by the
    Angular builder.
  - Every service works.
  - While typing 21 characters, editors created outside the zone cause 0
    change-detection turns, against 122 inside (D10 confirmed).
- [x] The playground injects its own Monaco 0.52 ESM (its Vite `?worker`
  workers and contributions): one Monaco, and every service works.

#### Outcomes

- Worker strategy (`/bundled`): Monaco's workers are built as classic IIFE
  files beside the bundle. `MonacoEnvironment.getWorker` starts each one from
  a same-origin blob URL whose script is `importScripts(<url beside
  import.meta.url>)`. This works cross-origin with no bundler.
- CSS delivery (`/bundled`): esbuild extracts Monaco's CSS to `bundled.css`
  (with `codicon.ttf` beside it). The bundle links it itself, once, from
  `import.meta.url`; the host adds nothing.
- Build tool: esbuild (both builds). It handles Monaco's CSS imports and
  the font with no configuration.
- Sizes (prototype): `bundled.js` is 2.7 MB raw / 557 KB brotli.
  - A first visit downloads 1.37 MB brotli in all: the bundle, CSS, font,
    two workers, the parser, both wasm variants, and the schema.
  - Start-up over localhost with immutable caching: cold 181 ms, warm
    41–55 ms. A real CDN adds the download time to the cold visit only.
- JSON schema scoping (D5): `fileMatch` must be the scheme followed by a
  double-star glob (`bitmark-editor://` then two asterisks). A single `*`
  does not cross `/` in Monaco's matcher, so `bitmark-editor://*` silently
  matches nothing.
- Duplicate Monaco in a workspace: code inside a folder with its own
  `node_modules/monaco-editor` resolves that copy. Through Vite's dependency
  pre-bundle, the page then has two Monacos, and `languages.json` sits on
  the wrong one.
  - So in the workspace, `monaco-editor` must be only a peer dependency of
    the package (with a dev copy that the host's resolution never reaches),
    and the core must never import it at runtime (D8 confirmed).
  - Phase 2 Step 10 must verify this with the playground.
- The root playground now scopes Vitest to the `*.test.ts(x)` files under `src/`, and
  eslint ignores the spike folders. Otherwise the root runs pick up the
  Playwright specs and the throwaway code.

#### Not covered by Phase 0 (moved on)

- [x] `/bundled` consumed through a host bundler: `setBitmarkAssetBase`
  points the relocated loader at its Monaco, CSS and workers (tested in
  `examples/static/relocated.html`, Step 11).
- [x] Token CSS variables and `setTheme` (D11): built in Phase 1 Step 5a
  (`applyBitmarkTheme`, unit-tested). The host `--syntax-*` mapping itself
  is the docs site's own CSS (Step 18).
- [ ] Zoneless Angular: not tried (cosmic is zone-based). Phase 2 Step 13a.
- [x] The current Monaco release is 0.57.0. `/bundled` now ships 0.57 (D4),
  and the static examples run on it. Monaco 0.55+ moved the JSON API to a
  top-level `monaco.json` (`languages.json` is only a deprecation stub) and
  its module paths to `monaco-editor/<path>` through "exports".
  - The package handles both JSON locations (`jsonDefaultsOf`): before
    this, the schema binding would have silently done nothing on 0.57.
  - Covered points: 0.46 AMD (the Angular example), 0.52 ESM (the
    playground), 0.57 (`/bundled`, the static examples).
  - Monaco 0.57 is larger: `monaco.js` is 808 KB brotli (556 KB on 0.52),
    and start-up was 298 ms cold / 86 ms warm on localhost.
- [ ] Start-up over a throttled network (cold visit): measure in Phase 3
  with the real CDN.

### Phase 1 — Core extraction, in place

Keep the playground green after every step. The code moves to `src/lib/` first
and to the package in Phase 2.

- [x] Step 1 — Engine: the async `BitmarkEngine` (D14),
  `createBitmarkEngine` (main thread, sync calls wrapped), and
  `loadBitmarkEngine` (two-stage init, stage subscription, per-URL cache).
  `BitmarkParserProvider` becomes a thin React wrapper over it. `engineUrl`
  stays in the playground.
- [x] Step 1a — Worker engine (D14): the worker script (`engineWorker`),
  `serveBitmarkEngine`, and `createBitmarkWorkerEngine({ createPort })`:
  - the parser and the JSON text with bit starts are built in the worker;
  - a fast lane for tokens, diagnostics, completion, hover and splits;
  - latest-wins coalescing per caller (`createLatestRunner`);
  - model-version tags (stale results dropped) are applied by the callers
    in Steps 2–8.

  Measured in Chromium on 351 KB, ten edits each converted, tokenised and
  validated:
  - on the main thread, the longest blocking task is about 1.1 s;
  - with the worker engine, a single result never makes a long task, and
    a burst of three large results occasionally does (100–150 ms, likely
    GC).

  The `{ worker: true }` shorthand on `loadBitmarkEngine` waits for the
  package build (Step 11), which decides how the worker script is shipped.
- [x] Step 2 — Per-instance sources in `src/monaco-bitmark/*`. The attachers
  take the engine. The completion and hover providers find the engine
  through the model map. The `set…Source` globals and `SemanticTokensRunner`
  / `EditorServicesRunner` go away, or become playground shims.
- [x] Step 3 — Scope the JSON schema to the package's model URI scheme
  (`bitmarkJsonSchema.ts`). Add the `schema` option.
- [x] Step 4 — `setupBitmarkMonaco({ monaco })` replaces the bitmark part of
  `monaco-setup.ts` (D8):
  - every core file switches from `import * as monaco` to `import type`
    plus the injected instance;
  - capability checks and the version-range warning.

  The playground keeps its own worker setup and contribution imports, and
  passes in its Monaco.
  Done: `src/lib/monaco` (setup, model-bound providers, async highlighter and
  diagnostics with stale results dropped, `attachBitmarkEditor` with
  `setEngine`, the scoped schema). `src/monaco-bitmark`,
  `SemanticTokensRunner` and the module-level sources are gone. The
  playground attaches through `useBitmarkEditorServices` and keeps
  `fileMatch: ['*']`, since all its JSON models are bitmark JSON.
  - The parser's published types already carry the editor-service shapes
    and mapping-id output formats, so `bitmarkEditorTypes.ts` went too.
    That leaves one D16 upstream ask: the active-variant export.
  - The version-range warning is replaced by capability checks: Monaco has
    no runtime version on its ESM API, so the package detects the APIs and
    contributions instead.
- [x] Step 5 — `createScrollSyncGroup`: from two slots to an N-member group
  with runtime join and leave (D9). Remove `scrollSync`'s dependency on
  `uiState`; the playground's "Link scrolling" toggle sets the membership.
- [x] Step 5a — Theme (D11):
  - token colours become CSS custom properties under the pane theme classes;
  - a light palette;
  - `auto` (`prefers-color-scheme`, live);
  - `CustomTheme`;
  - `setTheme` only when the package owns Monaco, or with `applyMonacoTheme`.
- [x] Step 6 — `createTextEditor`. Port the `MonacoTextArea` /
  `MonacoEditorAutoResize` behaviour.
  - Regeneration uses a full-range `pushEditOperations`, which keeps undo,
    clamps the cursor and preserves scroll (D16).
  - Done: `src/lib/editor` (`createTextEditor`, `createChangeFilter`,
    `replaceAllKeepingUndo`, model URIs under the package scheme), and
    automatic layout through Monaco's own `automaticLayout`.
  - `MonacoTextArea` uses the lib's change filter and undo-keeping replace.
    Rebuilding it on `createTextEditor` (dropping `react-monaco-editor`)
    moves to Step 14, where the playground's components are replaced
    anyway.
- [x] Step 7 — `createBitmarkSession`: state, the edit flow with the
  "skip the source" rule, errors with the last good value kept, events.
  Error display (D15): markers on the source pane, the stale state on the
  others, and the `error` event.
- [x] Step 8 — Panes: bitmark, JSON (`mode`), HTML, XML (`mapping`) and Text,
  with `readOnly` and `scrollSync` options and setters. Ported from
  `BitmarkMarkupTextBox`, `BitmarkJsonTextBox`, the runners and the panels.

### Phase 2 — The package

- [x] Step 9 — Bun workspace: `packages/bitmark-editor` with its own
  `package.json`. Exports: `.`, `./panes/*`, `./elements`, `./react`,
  `./bundled`, `./bundled/style.css`. Move `src/lib` there; the playground
  depends on it via `workspace:*`.
- [x] Step 10 — Dependencies:
  - `monaco-editor`: a dev dependency (types, and the `/bundled` build); an
    optional peer with the supported range, for `/esm`;
  - `@gmb/bitmark-parser` as an optional peer (injection, types) and a dev
    dependency;
  - React as an optional peer (`./react` only);
  - no lodash (a local debounce), no valtio, no theme-ui.

  Done (Steps 9–10): `packages/bitmark-editor` with its own `package.json`,
  `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs` (carrying the
  framework-free and Monaco-by-injection guard), README, CHANGELOG and
  LICENSE, and its own copy of the book fixture.
  - The playground depends on it as `workspace:*` and resolves it from
    source (a `paths` entry and a Vite alias), so development needs no
    build step.
  - The root lint and Vitest leave the package to its own configs.
  - The package's dev copies of `monaco-editor` and `@gmb/bitmark-parser`
    are never reached at runtime, because the source only imports their
    types (the lint guard enforces this).
- [x] Step 11 — Builds:
  - `/esm` (tsup or Vite library mode; `d.ts` files);
  - `/bundled` per the Phase 0 outcome (Monaco + core + element, CSS file,
    worker files, asset base option).

  Size budget: report the `/bundled` sizes in the README.

  Done: `scripts/build.mjs` (esbuild).
  - `dist/esm`: entries for the core, `elements`, `react` and
    `engineWorker`, with shared chunks; Monaco, the parser and React stay
    external.
  - `dist/types`: from `tsc`.
  - `dist/bundled`: `bundled.js` (the elements and core, 13 KB brotli),
    `monaco.js` + `monaco.css` (556 + 14 KB brotli, loaded when a session
    starts), the classic worker files behind blob URLs, the module
    `engineWorker.js`, and `setBitmarkAssetBase`.
  - Checked: `examples/esm` bundles the package by name through "exports"
    with no Monaco inside; `examples/static` runs it from a cross-origin
    CDN, including a relocated `bundled.js` (asset base) and the bundled
    worker engine.
- [x] Step 12 — Custom elements:
  - `<bitmark-session>` and `<bitmark-pane>`: binding by ancestor or id,
    attributes, properties and events, a pane that appears before its
    session (late binding), `dispose` on disconnect, and re-attach on
    reconnect;
  - then the optional `<bitmark-tabs>`, `<bitmark-split>` and the
    `<bitmark-editor>` preset.
- [x] Step 13 — React adapter `./react`.
- [x] Step 13a — Angular wrapper `@gmb/bitmark-editor-angular` (D10):
  - ng-packagr build;
  - `bm-session` / `bm-pane` and the layout helpers;
  - `ControlValueAccessor`;
  - zone handling;
  - `provideBitmarkEditor`.

### Phase 3 — Consumers

- [x] Step 14 — The playground runs on the package:
  - the bitmark editor, the WASM JSON tabs, the HTML, XML and Text tabs, and
    the bottom Info and Mappings panels are package panes on one session;
  - bpg (Original), the diff, WASM Check and the lexer stay in the
    playground, connected through the session's events;
  - remove the code that moved.
  - Done (`src/session/PlaygroundSession.tsx`):
    - Session panes: WASM JSON, WASM (full) JSON, HTML, Text, both XML
      tabs, and the bottom-left Info and Mappings tabs. Removed: the
      TableHtml, Text, XML, Info and Mappings runners, panels and state
      slices, and `convertWithBitStarts`.
    - Kept in the playground: the bitmark editor too. Its tabs (Original,
      WASM, WASM full) each hold a parser's own bitmark, which a single
      session document can't. The session's document is the active tab's
      bitmark.
    - Playground → session: an edit calls `setBitmark(doc, origin)`, with the
      origin for the mapping report; a left-tab switch calls
      `setBitmark(doc, false)`.
    - Session → playground: a pane edit runs the playground's own pipeline
      (`jsonToMarkup` or `markupToJson`), so the other parser tabs, WASM
      Check, the LED and the lexer stay current.
    - Package additions: the `scrollGroup` session option (the panes join the
      playground's group), the `origin` argument to `setBitmark`, and the
      pane `onRender` timing (the tab bar durations).
    - One React and one Monaco in the dev server: `resolve.dedupe`, with
      `tsconfig` paths for type checking.
    - Errors show in the pane's banner, and the last good content stays
      (D15). This replaces the old in-pane error dump.
    - The right-hand session panes all stay mounted (the inactive ones
      hidden), so each tab's duration stays current, as with the runners.
    - Changed on purpose: HTML, Text, XML, Info and Mappings follow the shown
      left tab's bitmark (before: HTML from Original, the others from WASM),
      and HTML and XML edits go into the shown tab. Invalid JSON typed in a
      session pane stays in that pane (marked); the playground keeps the last
      valid JSON.
    - Review fixes: a left-tab switch just after a pane edit, the converted
      pane text (not newer typing) sent to the pipeline, and a parser load
      failure shown in the panes. Each new check was mutation-checked.
    - Checked: `spikes/tests/playground-session.spec.mjs`, and the PLAN-018
      smoke checks (scroll linking by bit). Playground `tsc`, tests (167)
      and lint pass (lint's only errors are the existing ones in the
      `.claude/` and `CLAUDE.md` markdown). The package's typecheck, lint and
      tests (175) pass.
- [x] Step 14a — Main's later work, merged and moved into the package
  (main's PLAN-020 and PLAN-021):
  - bit templates: completion asks for `bitTemplate`, and a template
    replaces the `]` auto-closed after the cursor (`replacedSuffixLength`);
  - the `[` `]` bracket pair on the language the package registers;
  - typed text links its scrolling by bit: a pane edit's conversion returns
    where each bit is in the typed text (`OutputWithBitStarts.inputStarts`),
    pinned in that pane. The playground's Original JSON tab keeps main's own
    code for it (`src/scrollSync/convertWithBitStarts.ts`).
  - This branch's plans were renumbered from PLAN-020/021 to PLAN-022/023,
    since main's own PLAN-020/021 were already pushed.
  - Checked: `spikes/tests/bit-templates.spec.mjs`,
    `spikes/tests/typed-scroll.spec.mjs` (mutation-checked).
- [x] Step 15 — Promote the spikes to maintained examples in
  `packages/bitmark-editor/examples/`: `static` (no bundler, CDN
  `/bundled`, shaped like the docs site) and `angular`. Each
  shows both engine paths (D2): one page loads the engine, one injects it.
  Build them in CI.
  - Done: `examples/static` (`index.html` loads the engine, `inject.html`
    injects it, `relocated.html` moves the assets) and `examples/esm`; the
    Angular example lives in the Angular workspace
    (`packages/bitmark-editor-angular/projects/example`, both paths). CI
    builds and checks both.
- [x] Step 15a — The Angular example is shaped like cosmic (D10):
  - Angular 21, NgModule bootstrap, `provideZoneChangeDetection`;
  - Monaco 0.46 AMD copied to assets and read as `window.monaco`;
  - `@gmb/bitmark-parser/browser` bundled and initialised by the app with
    `bitmark-json` and `module_or_path`, then injected;
  - a `ControlValueAccessor` form binding.

  It is the reproducible CI test for cosmic's setup, which cosmic itself
  cannot provide (it has no test runner).

  Done (Steps 13a, 15a): `packages/bitmark-editor-angular`, one Angular CLI
  workspace holding the library and the `example` app. The example lives
  with the wrapper rather than in the core's `examples/`, so the two lift
  out together with one Angular toolchain.
  - Its Playwright check (`e2e/`) passes on Monaco 0.46 AMD with the
    injected parser: services, tabs, the form value, the host's JSON model
    untouched, and 16 zone turns for 15 keystrokes (15 document changes).
  - Found and fixed in the browser: `bm-pane` needed a filling layout
    (`height: 100%; flex: 1 1 0`), as the custom element has; and tabs
    drive a writable `hiddenByTabs` signal (signal inputs are read-only).
- [x] Step 15b — Package features for D12 (`lazy`, `narrow`, `debounceMs`,
  `messages`, the error slot, CDN-safe workers):
  - `lazy`, `narrow`, `debounceMs`, `messages`, the per-pane error slot;
  - CDN-safe workers in `/bundled`.
- [x] Step 16 — Publish config, for both packages (`@gmb/bitmark-editor`,
  `@gmb/bitmark-editor-angular`):
  - `files`, `sideEffects` (the CSS and the element entries only), `exports`
    conditions, `publishConfig`;
  - a GitHub Actions publish job beside the Pages deploy;
  - prerelease version `0.1.0`.
  - the pinned default parser version (D13) as a single constant, with a
    bot PR that bumps it and runs the full suite.

  Done (nothing published):
  - `.github/workflows/bitmark-editor.yml` runs lint, typecheck, tests,
    the build and the static and `/esm` examples for the core. It then
    builds the Angular library and example and runs the Angular e2e. It
    publishes both packages only for a `bitmark-editor-v*` tag, with the
    `NPM_TOKEN` secret.
  - `bitmark-editor-parser-bump.yml` runs weekly, using
    `scripts/bump-parser.mjs`, and opens the D13 bump PR. Run locally, it
    finds 7.9.0 newer than the pinned 7.7.0.
  - `npm pack --dry-run`: `@gmb/bitmark-editor` is 1.6 MB packed, 70
    files. Monaco's third-party source maps (~20 MB) are not shipped; the
    package's own are. `@gmb/bitmark-editor-angular` is 13 kB.
  - The workflow YAML parses (js-yaml), but it has not run on GitHub
    yet.
- [x] Step 17 — cosmic proof of concept, on a branch in `getMoreBrain/cosmic`.
  It is the last step, after the `0.x` prerelease (Step 16); a local
  `npm pack` tarball is enough before that.
  - One `bm-session` with bitmark and JSON panes on one screen, behind a
    feature flag, injecting cosmic's own Monaco and parser.
  - Done when `npm run build:cosmic` passes and the editor works in the
    browser (highlighting, diagnostics, completion, hover, conversion both
    ways, scroll sync), with cosmic's existing Monaco editors unaffected.
  - Where the editor goes in cosmic's UI is product work for a separate plan.
  - Done: cosmic branch `feat/bitmark-editor-poc` (gmb.web): `/editor-poc`,
    matched only with flag `bitmark-editor-poc`; the 0.1.0 tarballs vendored
    in `gmb.web/vendor/` (cosmic's CI reinstalls from scratch, so a path
    outside the repo fails); the parser module from
    `BitmarkConvertorService.rustParserModule()` (one shared init); Monaco
    from ngx-monaco-editor-v2's AMD assets, loaded once; the parser's schema
    as an asset. `build:cosmic` passes (initial bundle +0.16 kB, the editor is
    lazy). Checked in headless Chromium on the production build: every
    service, conversion both ways, the form control, scroll sync by bit; a
    host JSON model gets no bitmark markers; the flag gate. Not exercised: a
    logged-in reader beside the editor (no account).
  - Found: Monaco's theme is page-wide (D11), and the package's default
    `theme: 'dark'` on a host left on Monaco's default `vs` makes bold text
    unreadable. cosmic sets `vs-dark`, as its reader does. Follow-up for the
    package: warn, or pick the token theme from the host's Monaco theme.
- [x] Step 18 — Docs site switch (D12), on a branch in the parser repo
  (`docs-site`), after the `0.x` prerelease:
  - `live-examples.js` mounts a `<bitmark-session lazy="idle"
    narrow="static">` with bitmark and JSON panes from the version-pinned
    CDN `/bundled`;
  - the docs workflow stamps the pinned parser and editor versions (no more
    `@latest`);
  - the token variables map onto `--syntax-*`, the theme toggle calls
    `setTheme`, and `messages` come from the site's i18n;
  - Reset and Template call `setBitmark`;
  - the CodeMirror vendor bundle, `pane-sync.js` and the CodeMirror
    highlighting are removed.

  Done when the docs site's own `npm test` and e2e pass (updated for Monaco)
  and every bit page still degrades to the static example when the CDN is
  blocked. The parser repo has its own plan process, so this step is a
  hand-off brief there, not an in-repo plan.
  - Done: parser repo branch `docs-site/bitmark-editor`, its PLAN-227. Not
    yet on npm, so the package is vendored in `docs-site/vendor/` and its
    `/bundled` build self-hosted under `assets/bitmark-editor/<version>/`
    (the CDN URL once published); the parser is pinned to the documented
    version (built from `packages/bitmark-parser`, no workflow step). The
    editor appears on the session's `ready`, so a blocked parser CDN, a
    blocked bundle, no JS and phones all keep the static example (e2e for
    each). Theme toggle, i18n strings and `--syntax-*` colours carry over.
    The docs site's `npm test` (55 unit + 115 static) and production e2e
    (46) pass.
  - Package changes it needed: `<bitmark-session>` takes `messages`; and
    `/bundled` now really applies the session's theme to its own Monaco
    (the README said so, the code did not: the panes stayed light on the
    dark site). `setMonacoLoader(loader, { own: true })`. Also from its
    review: `setBitmark` drops an edit still waiting out the debounce (a
    Reset within 300 ms of typing was overwritten by the typed text); and a
    theme first given after the start still sets that Monaco's theme (after
    the docs site's vendored 0.1.0, which sets its theme before the start).

### Testing

- [ ] The existing unit tests move with their code and still pass
  (`monaco-bitmark`, `scrollSync`, `MonacoTextArea`, the runners).
- [ ] Engine:
  - an injected engine is used as is, with no network calls;
  - a raw module is initialised in two stages;
  - `loadBitmarkEngine` caches per URL;
  - missing optional exports switch features off without errors;
  - a load failure reaches the `error` event.
- [ ] Async engine and worker (D14):
  - with promises that resolve out of order, only the latest result is
    applied (property test);
  - the worker engine gives the same output as the main-thread engine on
    the fixtures;
  - coalescing drops intermediate edits;
  - tokens and diagnostics are not delayed behind a long conversion;
  - one worker is shared per engine.
- [ ] Performance check in the browser: on a 351 KB document, typing in the
  bitmark pane stays responsive with the worker engine (main-thread long
  tasks under 50 ms per keystroke). Record the numbers.
- [ ] Multiple sessions: two sessions on one page, each with its own engine
  version (fakes), highlight, complete and scroll-link independently.
- [ ] Schema scoping: a host JSON model with a different URI gets no bitmark
  schema markers.
- [ ] Session and panes:
  - an edit in any editable pane updates every other pane, and never the
    source pane;
  - an error keeps the last good value elsewhere and marks those panes
    stale, and the next good edit clears it;
  - a pane's content is never replaced with error text, and undo history
    survives a failed conversion (D15);
  - no echo loop;
  - a read-only pane regenerates but cannot be edited, and the setting
    toggles at runtime;
  - Text is always read-only;
  - two JSON panes in different modes stay consistent;
  - a pane converts only while it exists;
  - `dispose` removes all listeners and models.
- [ ] Scroll group:
  - with three or more members, the scrolled one leads and all the others
    follow;
  - a non-member is untouched;
  - joining and leaving at runtime work, and a joiner follows the leader;
  - an empty group does nothing;
  - the PLAN-018 coordinator tests still pass, generalised.
- [ ] D12 features:
  - `lazy` loads nothing before its trigger (`idle`, `click`, `focus`,
    `visible`), and a failed load leaves the static example;
  - `narrow` applies only on a coarse pointer and a narrow viewport;
  - `debounceMs` is last-edit-wins across panes (the `pane-sync.js` cases);
  - `messages` override every UI string;
  - the error slot receives errors.
- [ ] Theme:
  - the generated CSS covers every token type and modifier in both palettes;
  - `auto` follows a `prefers-color-scheme` change;
  - an injected Monaco's theme is not touched unless `applyMonacoTheme` is
    set;
  - a `CustomTheme` token override wins.
- [ ] Optional panes wait for `full`; a wrong declared feature shows "needs
  the full parser".
- [ ] Custom elements (jsdom + Monaco mock):
  - binding by ancestor and by id, including late binding;
  - attributes and properties map to options and toggle at runtime;
  - the events fire;
  - disconnect disposes.
- [ ] Browser (Playwright, which is already installed by the devcontainer via
  mise). Run against the static and Angular examples:
  - typing converts;
  - highlighting, markers, completion and hover appear;
  - JSON schema markers appear;
  - linked scrolling works across three visible panes (bitmark, JSON,
    HTML), and a pane switched out of sync scrolls alone;
  - an edit in the HTML pane updates the bitmark and JSON panes;
  - no console errors.
- [x] Playground regression: the PLAN-018 browser checks still pass.

### Documentation

- [x] TypeDoc for the public API (D16): `bun run docs` in the core package
  (`docs/api`, not committed). The Angular wrapper's API is small and is
  documented in its README.
  - Publishing the docs beside the README (e.g. on Pages) waits for the
    first release.
- [x] The upstream note to the parser repo (D16): written,
  `packages/bitmark-editor/docs/upstream-parser-note.md`, not sent. Two of
  the three asks are already met by parser 7.7.0+.

- [x] Package README: install, the two builds, the two engine paths (D2),
  sessions, panes, the optional layouts, options and events; host recipes for Angular, static sites
  (no bundler, CDN or vendored), Vite / React and SSR frameworks
  (client-only import); CSP notes (wasm, workers, CDN).
- [x] ARCHITECTURE.md (also corrected the stale CRA / react-app-rewired build
  description and the removed `src/monaco-bitmark`):
  - a package layer;
  - the workspace in the directory structure;
  - the parser-loading rule amended to "loaded at runtime from the CDN, a
    host URL, or injected by the host — never bundled by the playground";
  - a change-log line.
- [x] Playground README: a pointer to the package.
- [x] Hand-off briefs for the other repos: `docs/handoff-cosmic.md`
  (Step 17) and `docs/handoff-docs-site.md` (Step 18).

### Parser 7.9.0 and publishing (2026-10-06)

- The default parser is 7.9.0 (D13), and the playground's dev dependency
  is too.
- Parser 7.8.0 renamed a bit span's `start` to `outputStart` (and added
  `inputStart`; parser PLAN-223). This branch went from 7.7.0 to 7.9.0, so
  it first met the rename there. Both the package and the playground read `outputStart`,
  falling back to `start`. Before the fix, the live playground (which loads
  `@latest`) had no bit positions for HTML, XML and Text, so their scroll
  linking was proportional. A real-parser test now asserts numeric starts.
- No publishing from this repo (decided): the publish job is removed; the
  packages are published once they have their own repository (D6).

### Double-check (2026-10-06)

Two independent code reviews, then the full matrix again.
- First review: 10 findings, all fixed. The worst: a slow conversion could
  overwrite a newer edit (now an edit sequence); the schema binding replaced
  the host's JSON options (now merged); a dead worker hung its calls.
- Second review, of those fixes and the rest: 5 findings, all fixed. A
  focused pane's catch-up could replace the user's own text on blur; a
  lagging controlled `value` could roll back typing (now `createEchoGuard`);
  a single worker error killed a lane; the bump PR got no CI (now a
  `BITMARK_EDITOR_BOT_TOKEN` secret); the bump could leave the peer range.
- Every fix has a regression test, mutation-checked: each was removed in
  turn and its test failed. Three tests were found not to catch their bug
  this way and were corrected.
- Also found while checking: the playground's `tsc` broke when the
  package's dev Monaco moved to 0.57. The playground now compiles the package
  against its own Monaco, and the package CI checks the playground too.

## Completion Criteria

- [x] `@gmb/bitmark-editor` builds `/esm` and `/bundled`, with type
  declarations.
- [x] The static and Angular examples build in CI and pass the
  browser checks, each with both a loaded and an injected engine.
- [x] The playground runs on the package with no loss of information (its
  error dump moves outside the panes, D15); its lint,
  `tsc` and tests pass.
- [x] Panes are placed freely by the host; any combination works, edits
  propagate to all the others, and read-only and scroll-sync membership are
  per pane.
- [x] Two sessions work independently on one page.
- [x] The cosmic proof of concept (Step 17) builds and works in the
  browser.
- [x] The docs site runs its "Try it" editor on the package (Step 18).
- [x] The package README documents both engine paths and the host recipes.
- [ ] `awa check` passes.
