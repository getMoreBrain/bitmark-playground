# PLAN-021: bitmark Editor Package — Steps

STATUS: in-progress
DIRECTION: lateral
TRACEABILITY: The steps of PLAN-020 (`PLAN-020-bitmark-editor-package.md`), which holds the context, the decisions (D1 to D12), the design notes, the risks and the open questions. Decision ids below refer to PLAN-020.

## Context

PLAN-020 grew past the plan size limit, so its steps and completion criteria
live here. Read PLAN-020 first; nothing here restates its decisions.

## Steps

### Phase 0 — Spikes (do first; they decide D4's details)

- [ ] Angular spike in `packages/bitmark-editor/examples/angular`. Create a
  recent Angular CLI app (application builder) that loads a hand-built
  `/bundled` prototype (Monaco + JSON worker + one bitmark editor) as a
  custom element. Confirm that the workers, the CSS and the asset paths work
  in `ng serve` and `ng build`. Also check whether zone.js needs
  `runOutsideAngular` (and zoneless).
- [ ] No-bundler spike in `examples/static`, shaped like the docs site: a
  static page that loads the `/bundled` prototype from a CDN URL with a plain
  `<script type="module">` (D12). Confirm:
  - same-origin blob-URL workers start;
  - lazy load on intent works, and the static example shows until then;
  - the narrow-screen fallback works;
  - the token CSS variables map onto host `--syntax-*` variables;
  - measured start-up time for `lazy="idle"`, first visit (cold cache)
    against a later page (warm cache, pinned URLs);
  - `setTheme` follows a host theme toggle.
- [ ] Angular + host Monaco spike: an Angular app that already bundles
  Monaco its own way injects that instance into the `/esm` prototype. Check:
  - one Monaco on the page;
  - the bitmark language works, and so do completion and hover (if the
    host's Monaco has the contributions);
  - the host's own JSON editors get no bitmark schema.
- [ ] Monaco 0.46 AMD spike: the bitmark pane on an injected
  `window.monaco` 0.46 (the AMD build loaded from assets, as in cosmic).
  Check that highlighting, diagnostics, completion, hover, the JSON schema
  and scroll sync all work.
- [ ] Vite / `/esm` spike: the playground injects its own Monaco (with its
  existing workers).
- [ ] `/bundled` beside a host Monaco: the guard warns and leaves the host's
  `MonacoEnvironment` untouched.
- [ ] Record the outcomes in this plan (worker strategy, CSS delivery,
  asset base path).

### Phase 1 — Core extraction, in place

Keep the playground green after every step. The code moves to `src/lib/` first
and to the package in Phase 2.

- [ ] Step 1 — Engine: the async `BitmarkEngine` (D14),
  `createBitmarkEngine` (main thread, sync calls wrapped), and
  `loadBitmarkEngine` (two-stage init, stage subscription, per-URL cache).
  `BitmarkParserProvider` becomes a thin React wrapper over it. `engineUrl`
  stays in the playground.
- [ ] Step 1a — Worker engine (D14): the worker script, and
  `loadBitmarkEngine({ worker: true })` / `createBitmarkWorkerEngine(url)`:
  - the parser and the JSON text with bit starts built in the worker;
  - latest-wins coalescing, and a fast lane for tokens and diagnostics;
  - model-version tags, and stale results dropped.
- [ ] Step 2 — Per-instance sources in `src/monaco-bitmark/*`. The attachers
  take the engine. The completion and hover providers find the engine
  through the model map. The `set…Source` globals and `SemanticTokensRunner`
  / `EditorServicesRunner` go away, or become playground shims.
- [ ] Step 3 — Scope the JSON schema to the package's model URI scheme
  (`bitmarkJsonSchema.ts`). Add the `schema` option.
- [ ] Step 4 — `setupBitmarkMonaco({ monaco })` replaces the bitmark part of
  `monaco-setup.ts` (D8):
  - every core file switches from `import * as monaco` to `import type`
    plus the injected instance;
  - capability checks and the version-range warning.

  The playground keeps its own worker setup and contribution imports, and
  passes in its Monaco.
- [ ] Step 5 — `createScrollSyncGroup`: from two slots to an N-member group
  with runtime join and leave (D9). Remove `scrollSync`'s dependency on
  `uiState`; the playground's "Link scrolling" toggle sets the membership.
- [ ] Step 5a — Theme (D11):
  - token colours become CSS custom properties under the pane theme classes;
  - a light palette;
  - `auto` (`prefers-color-scheme`, live);
  - `CustomTheme`;
  - `setTheme` only when the package owns Monaco, or with `applyMonacoTheme`.
- [ ] Step 6 — `createTextEditor`. Port the `MonacoTextArea` /
  `MonacoEditorAutoResize` behaviour; the React components become thin
  wrappers over it.
  Regeneration uses a full-range `pushEditOperations`, which keeps undo,
  clamps the cursor and preserves scroll (D16).
- [ ] Step 7 — `createBitmarkSession`: state, the edit flow with the
  "skip the source" rule, errors with the last good value kept, events.
  Error display (D15): markers on the source pane, the stale state on the
  others, and the `error` event.
- [ ] Step 8 — Panes: bitmark, JSON (`mode`), HTML, XML (`mapping`) and Text,
  with `readOnly` and `scrollSync` options and setters. Ported from
  `BitmarkMarkupTextBox`, `BitmarkJsonTextBox`, the runners and the panels.

### Phase 2 — The package

- [ ] Step 9 — Bun workspace: `packages/bitmark-editor` with its own
  `package.json`. Exports: `.`, `./panes/*`, `./elements`, `./react`,
  `./bundled`, `./bundled/style.css`. Move `src/lib` there; the playground
  depends on it via `workspace:*`.
- [ ] Step 10 — Dependencies:
  - `monaco-editor`: a dev dependency (types, and the `/bundled` build); an
    optional peer with the supported range, for `/esm`;
  - `@gmb/bitmark-parser` as an optional peer (injection, types) and a dev
    dependency;
  - React as an optional peer (`./react` only);
  - no lodash (a local debounce), no valtio, no theme-ui.
- [ ] Step 11 — Builds:
  - `/esm` (tsup or Vite library mode; `d.ts` files);
  - `/bundled` per the Phase 0 outcome (Monaco + core + element, CSS file,
    worker files, asset base option).

  Size budget: report the `/bundled` sizes in the README.
- [ ] Step 12 — Custom elements:
  - `<bitmark-session>` and `<bitmark-pane>`: binding by ancestor or id,
    attributes, properties and events, a pane that appears before its
    session (late binding), `dispose` on disconnect, and re-attach on
    reconnect;
  - then the optional `<bitmark-tabs>`, `<bitmark-split>` and the
    `<bitmark-editor>` preset.
- [ ] Step 13 — React adapter `./react`.
- [ ] Step 13a — Angular wrapper `@gmb/bitmark-editor-angular` (D10):
  - ng-packagr build;
  - `bm-session` / `bm-pane` and the layout helpers;
  - `ControlValueAccessor`;
  - zone handling;
  - `provideBitmarkEditor`.

### Phase 3 — Consumers

- [ ] Step 14 — The playground runs on the package:
  - the bitmark editor, the WASM JSON tabs, the HTML, XML and Text tabs, and
    the bottom Info and Mappings panels are package panes on one session;
  - bpg (Original), the diff, WASM Check and the lexer stay in the
    playground, connected through the session's events;
  - remove the code that moved.
- [ ] Step 15 — Promote the spikes to maintained examples in
  `packages/bitmark-editor/examples/`: `static` (no bundler, CDN
  `/bundled`, shaped like the docs site) and `angular`. Each
  shows both engine paths (D2): one page loads the engine, one injects it.
  Build them in CI.
- [ ] Step 15a — The Angular example is shaped like cosmic (D10):
  - Angular 21, NgModule bootstrap, `provideZoneChangeDetection`;
  - Monaco 0.46 AMD copied to assets and read as `window.monaco`;
  - `@gmb/bitmark-parser/browser` bundled and initialised by the app with
    `bitmark-json` and `module_or_path`, then injected;
  - a `ControlValueAccessor` form binding.

  It is the reproducible CI test for cosmic's setup, which cosmic itself
  cannot provide (it has no test runner).
- [ ] Step 15b — Package features for D12:
  - `lazy`, `narrow`, `debounceMs`, `messages`, the per-pane error slot;
  - CDN-safe workers in `/bundled`.
- [ ] Step 16 — Publish config, for both packages (`@gmb/bitmark-editor`,
  `@gmb/bitmark-editor-angular`):
  - `files`, `sideEffects` (the CSS and the element entries only), `exports`
    conditions, `publishConfig`;
  - a GitHub Actions publish job beside the Pages deploy;
  - prerelease version `0.1.0`.
  - the pinned default parser version (D13) as a single constant, with a
    bot PR that bumps it and runs the full suite.
- [ ] Step 17 — cosmic proof of concept, on a branch in `getMoreBrain/cosmic`.
  It is the last step, after the `0.x` prerelease (Step 16); a local
  `npm pack` tarball is enough before that.
  - One `bm-session` with bitmark and JSON panes on one screen, behind a
    feature flag, injecting cosmic's own Monaco and parser.
  - Done when `npm run build:cosmic` passes and the editor works in the
    browser (highlighting, diagnostics, completion, hover, conversion both
    ways, scroll sync), with cosmic's existing Monaco editors unaffected.
  - Where the editor goes in cosmic's UI is product work for a separate plan.
- [ ] Step 18 — Docs site switch (D12), on a branch in the parser repo
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
- [ ] Playground regression: the PLAN-018 browser checks still pass.

### Documentation

- [ ] TypeDoc for the public API of both packages, published beside the
  README (D16).
- [ ] The upstream note to the parser repo (D16).

- [ ] Package README: install, the two builds, the two engine paths (D2),
  sessions, panes, the optional layouts, options and events; host recipes for Angular, static sites
  (no bundler, CDN or vendored), Vite / React and SSR frameworks
  (client-only import); CSP notes (wasm, workers, CDN).
- [ ] ARCHITECTURE.md:
  - a package layer;
  - the workspace in the directory structure;
  - the parser-loading rule amended to "loaded at runtime from the CDN, a
    host URL, or injected by the host — never bundled by the playground";
  - a change-log line.
- [ ] Playground README: a pointer to the package.

## Completion Criteria

- [ ] `@gmb/bitmark-editor` builds `/esm` and `/bundled`, with type
  declarations.
- [ ] The static and Angular examples build in CI and pass the
  browser checks, each with both a loaded and an injected engine.
- [ ] The playground runs on the package with no loss of information (its
  error dump moves outside the panes, D15); its lint,
  `tsc` and tests pass.
- [ ] Panes are placed freely by the host; any combination works, edits
  propagate to all the others, and read-only and scroll-sync membership are
  per pane.
- [ ] Two sessions work independently on one page.
- [ ] The cosmic proof of concept (Step 17) builds and works in the
  browser.
- [ ] The docs site runs its "Try it" editor on the package (Step 18).
- [ ] The package README documents both engine paths and the host recipes.
- [ ] `awa check` passes.
