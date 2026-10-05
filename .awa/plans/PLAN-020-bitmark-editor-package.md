# PLAN-020: Extract the bitmark / JSON Editor into an npm Package

STATUS: in-progress
DIRECTION: lateral
TRACEABILITY: Reuses PLAN-016 (semantic-token highlighting), PLAN-017 (editor services, JSON schema), PLAN-018 (linked scrolling), PLAN-007 / PLAN-011 / PLAN-013 / PLAN-014 (HTML, Text, XML views). Changes the ARCHITECTURE.md rule "Parsers MUST be loaded from CDN at runtime, never bundled".

## Context

The playground's bitmark ↔ JSON editors are useful outside the playground:
in other web apps (cosmic, an Angular 21 app) and on the bitmark docs site
(the parser repo's `docs-site`, a static Eleventy site with no bundler).
Today they are tied to the playground in four ways:

- React (`react-monaco-editor`, hooks, context);
- global valtio state (`bitmarkState`, `uiState`);
- module-level singletons (the parser sources in `src/monaco-bitmark/*` and
  the panes in `src/scrollSync/scrollSync.ts`);
- Vite-only Monaco setup (`monaco-setup.ts`, `?worker` imports, the
  `monaco-editor` alias).

Most of the editor logic is already plain TypeScript on Monaco:

- highlighting, diagnostics, completion, hover and the JSON schema;
- linked scrolling;
- the change filter.

This plan extracts that logic into a framework-agnostic package,
`@gmb/bitmark-editor`. The package offers bitmark and JSON panes, with
HTML, XML and Text panes as options. The host places each pane wherever it
likes, and the playground consumes the package.

## Decisions (agreed)

- D1 — Scope: the WASM parser (`@gmb/bitmark-parser`) only.
  - Core panes: bitmark and JSON, with every current editor feature:
    - highlighting, diagnostics, completion and hover in the bitmark pane;
    - schema validation in the JSON pane;
    - linked scrolling by bit.
  - Optional panes: HTML, XML (any mapping id), Text, Info, Mappings. Each is
    a subpath export, tree-shaken when unused.
    - Info (read-only): `info({ infoType: 'bit', bit })` for each distinct
      bit type in the document, as the playground's `InfoRunner` does.
    - Mappings (read-only): the parser's mapping report
      (`mappingReport: true`) for the last edit, as the playground's
      `MappingsRunner` does. The session records, per edit, the source pane,
      its input format, its raw text and an edit counter; the report reruns
      per edit, not per value change. A host `setBitmark()` counts as a
      bitmark edit labelled "API". The header names the pane by its `label`
      option (default: its type, e.g. `XML (niso-iec)`).
    - Info and Mappings need the `full` variant and are not in scroll sync:
      their output is not one section per bit in document order.
  - Not in the package: bpg ("Original"), WASM Check and its LED, the bpg
    round trip, the diff panels, the lexer, settings persistence and URL
    parameters. These stay in the playground.
- D9 — No fixed layout. A session plus independent panes:
  - A session is one document (no DOM). Each pane is a Monaco editor the
    host mounts into any element it chooses. The host decides how many panes
    there are, of which types, in what combination (e.g. bitmark + JSON +
    HTML all visible, or JSON + HTML with no bitmark pane), and where they go.
  - Panes behave as in the playground: editing any pane updates all the
    others. The bitmark text is the session's source of truth. An edit in
    the JSON, HTML or XML pane converts to bitmark, then every other pane
    regenerates from it. The edited pane keeps the user's text verbatim, and
    on a conversion error the other panes keep their last good value.
  - Any pane can be marked read-only (`readOnly`, switchable at runtime).
    Text is always read-only, because there is no text → bitmark conversion.
  - Scroll sync is a per-session set of member panes. A pane joins or
    leaves at runtime (`pane.setScrollSync(on)`, or
    `session.setScrollSync([panes])`). Among the members, the pane the user
    scrolls leads and the others follow. Non-members scroll on their own.
  - A pane converts only while it exists; the `full` engine is needed only
    once an HTML, XML or Text pane exists.
  - Optional layouts are conveniences built on the same panes: tabs, a
    split, and a preset that reproduces the playground arrangement.
- D2 — Parser: injected or loaded. The host chooses one:
  - Inject: the host loads the parser itself and passes it in, either as
    the raw module or as an engine it already built. This covers a parser
    the host bundles, self-hosts, shares with other code, or pins.
  - Load: the package loads it, by default from jsdelivr at a version the
    package declares, or from a URL the host gives (self-hosting, strict CSP).
- D13 — The default parser version is one exact version, pinned in each
  editor release (e.g. editor 0.3.0 loads parser `7.9.0`). It is not
  `@latest`, and not a range.
  - Reproducible: an installed editor version always behaves the same, and
    matches the parser types it was compiled against (e.g.
    `SemanticTokenType` in the token palette).
  - Cacheable: exact versions are immutable on jsDelivr (the basis of D12's
    warm cache).
  - The JSON schema follows the same version (`schemaUrlFor`).
  - Bumping it is automated: a bot PR (Renovate / Dependabot on the parser
    dev dependency, or a small workflow) bumps the pinned default. CI runs
    the full unit and browser suite against the new parser; merging cuts a
    patch release.
  - Hosts can override it with `version` (including `'latest'`), `url`, or
    injection. The playground keeps `?v2=` / `?engine=local` by passing
    `url`.

  Either way the editor sees the same `BitmarkEngine` interface (see Design
  Notes). One engine can serve any number of editors on a page.
- D3 — Three layers in one package:
  1. Core: plain TypeScript. The engine, the Monaco integration, the session
     and the panes (D9).
  2. Custom elements: `<bitmark-session>`, `<bitmark-pane>`, and the optional
     layout elements. Light DOM, not shadow DOM: Monaco and the token
     stylesheet need document-level CSS. Static sites (the docs site), plain
     HTML and any framework without an adapter use these.
  3. Adapters:
     - `@gmb/bitmark-editor/react` (the playground uses it);
     - an Angular wrapper in v1 (D10).
- D10 — Angular wrapper in v1, because Angular is a definite target: cosmic
  (`getMoreBrain/cosmic`, `gmb.web`).
  - It is a separate package, `@gmb/bitmark-editor-angular`, in the same
    workspace (`packages/bitmark-editor-angular`). Angular components must be
    compiled by ng-packagr (partial Ivy), which the core's tsup / Vite build
    cannot do.
  - Peer dependencies: `@angular/core` from 21, and `@gmb/bitmark-editor`.
  - It is built on the core directly, not on the custom elements. It has its
    own selectors (`bm-session`, `bm-pane`, and the layout helpers), so it
    never collides with the custom element tags if both are on one page.
  - It uses standalone components with signal inputs and outputs:
    - `bm-session` takes `engine`, `monaco`, `value`, `scrollSync` and emits
      `change`, `ready`, `error`;
    - `bm-pane` takes `type`, `mode`, `mapping`, `readonly`, `scrollSync`.
  - `ControlValueAccessor` on `bm-session`, so a form binds the bitmark text
    (`formControlName`, `ngModel`).
  - It creates and runs Monaco outside the Angular zone
    (`NgZone.runOutsideAngular`), and re-enters the zone only to emit
    outputs. cosmic uses zone change detection
    (`provideZoneChangeDetection`); in a zoneless app the same code is a
    no-op.
  - `provideBitmarkEditor({ monaco, engine })` provides app-wide defaults, so
    each `bm-session` does not repeat them. `monaco` and `engine` can be
    values or async factories.
- D4 — Two builds:
  - `/bundled`: Monaco, the core and the custom element prebuilt. It ships as
    one ESM entry, one CSS file and prebuilt worker files, with an asset base
    path option. For hosts without Monaco, such as the docs site, so the host
    bundler (if there is one) never touches Monaco's ESM, its CSS imports or
    its workers. It is CDN-safe (D12): it loads straight from jsDelivr with
    no bundler.
  - `/esm`: no Monaco inside. The host injects its own Monaco instance (D8)
    and wires its own workers. This is for hosts that already have Monaco
    (any framework, Angular included) and for Vite / React hosts such as the
    playground.
- D8 — Monaco is injected or bundled, like the parser (D2). We cannot know
  whether a host already has Monaco.
  - The core never imports `monaco-editor` at runtime (`import type` only).
    It receives the namespace through `setupBitmarkMonaco({ monaco })`, and
    the attachers and providers take it from there.
  - A host with Monaco passes its instance to `/esm`. The package adds its
    language, providers and models to the host's registry, scoped by model
    URI (D5), so the page has one Monaco.
  - Capability checks on the injected Monaco, each degrading with a
    one-time console warning, never a crash:
    - no `monaco.languages.json`: the JSON pane runs without schema
      validation;
    - no suggest / hover contributions: no completion / hover.
  - The supported Monaco range starts at 0.46 (cosmic's version) and runs up
    to the current release; setup warns outside it. Both the AMD global build
    (0.46, as cosmic loads it) and the ESM build (current, as the playground
    loads it) are tested in CI. `/bundled` always ships the current Monaco.
  - Panes pass Monaco `editorOptions` through. The Angular wrapper defaults
    to `fixedOverflowWidgets` with one shared `overflowWidgetsDomNode` (as
    cosmic's own editor does), so widgets are not clipped inside scroll
    containers and dialogs.
  - A host without Monaco uses `/bundled`.
  - Guard: when `/bundled` finds `self.MonacoEnvironment` already set, it
    logs "this page already has Monaco; use `/esm` with `monaco`" and does
    not overwrite the host's worker setup. Two copies sharing one
    `MonacoEnvironment` cannot work reliably (the worker callback cannot tell
    which copy asks), so there is no attempt to share or auto-detect.
  - The custom element has an optional `monaco` property beside `engine`.
    The `/bundled` element sets it itself.
- D5 — No page-wide side effects beyond Monaco's own global registry:
  - the bitmark language and providers are registered once per Monaco
    instance;
  - per-editor state is per instance;
  - the JSON schema applies only to the package's own models (their URI
    scheme), never `fileMatch: ['*']`.
- D6 — Location: a bun workspace in this repo for now,
  `packages/bitmark-editor`, with the playground staying at the root. The
  package moves to its own repo later, so it is built to be lifted out
  unchanged:
  - it never imports from the playground's `src/`, and has no relative paths
    out of its own directory;
  - it has its own `package.json`, `tsconfig`, eslint, vitest config,
    README, CHANGELOG and LICENSE;
  - its examples live inside it (`packages/bitmark-editor/examples/*`);
  - it has its own CI workflow, filtered to its path, and its own version
    and tags (`bitmark-editor-v*`);
  - the playground depends on it as a normal package (`workspace:*` now, an
    npm range after the move).

- D12 — The bitmark docs site (parser repo, `docs-site`) switches its "Try it"
  editor from CodeMirror 6 to the package.
  - Today the docs site is static Eleventy output for GitHub Pages, with no
    bundler. It loads the parser from jsDelivr `@latest` and calls `init()`
    (the `full` variant). Its "Try it" editor has:
    - bitmark ⇄ JSON conversion with a 300 ms last-edit-wins debounce
      (`pane-sync.js`);
    - `semanticTokens` highlighting folded onto five `--syntax-*` CSS
      groups;
    - a system / light / dark toggle (`data-theme` on `<html>`);
    - progressive enhancement, Reset and Template buttons, six locales, and
      Playwright e2e tests.
  - It gains diagnostics, completion, hover and JSON schema validation.
  - The package must provide these for it (general features, not
    docs-specific):
    - Deferred load: `<bitmark-session lazy="idle|click|focus|visible">`.
      The host's static example shows until the panes mount, and a failed
      load leaves it in place (progressive enhancement, as today).
      - The docs site uses `idle` (`requestIdleCallback`), so the editor is
        ready soon after the page renders.
      - A multi-page site cannot keep an instance across navigations (every
        page load discards the JS heap), but nearly all the cost carries
        over: with version-pinned URLs, jsDelivr serves immutable files
        that the browser caches on disk, together with their compiled
        JS / wasm code. So every page after the first pays start-up CPU
        only, not the download.
      - The docs site therefore pins the parser and editor versions instead
        of `@latest`, stamped at build time by its release workflow.
    - Narrow screens: a `narrow` option (`edit` | `readonly` | `static`).
      It applies only when the pointer is coarse and the viewport is narrow
      (a tablet with a keyboard keeps the editor). The docs site uses
      `static`: caching fixes the download, not Monaco's poor touch
      editing.
    - CDN-safe `/bundled`: workers start from same-origin blob URLs, so the
      bundle loads straight from jsDelivr with no bundler. Vendoring it into
      the site's assets (as it vendors CodeMirror) also works.
    - A debounce option for conversion (`debounceMs`, default 0 = per edit,
      as in the playground; the docs site uses 300). It is one session-wide,
      last-edit-wins schedule, as in `pane-sync.js`.
    - Theme from the host: the site maps the token CSS variables (D11) onto
      its `--syntax-*` variables, and calls `session.setTheme()` from its
      toggle.
    - Localisable UI strings: a `messages` option for "Loading…", "needs the
      full parser", error prefixes, tab and pane labels, and ARIA labels.
      The site has six locales.
    - Error display: a per-pane error slot (an element or callback) besides
      the Monaco markers, as the site shows errors under each pane today.
  - Its Reset and Template buttons stay site-side, calling
    `session.setBitmark()`.

- D15 — A pane's content is never replaced with an error. Today the
  playground shows `…ErrorAsString ?? text` in an unfocused pane; that wipes
  the author's text and its undo history.
  - The edited (source) pane gets a Monaco marker at the error position
    when the parser gives one (JSON syntax errors do). Otherwise it gets a
    whole-document marker plus a one-line in-pane banner.
  - The other panes keep their last good content (D9) and are marked
    stale: an "out of date" banner, and a `.bm-stale` class the theme dims
    slightly.
  - The host gets the details through the `error` event and the per-pane
    error slot (D12).
  - The playground shows its raw `Error` dump outside the panes (from the
    `error` event). Its regression criterion becomes "no loss of
    information" rather than "no behaviour change" for error display.

- D16 — Smaller defaults:
  - Regenerating a pane uses a full-range `pushEditOperations`, not
    `setValue`. The pane's undo stack survives regeneration, the cursor is
    clamped, and scroll is preserved (then scroll sync adjusts it). A
    focused pane is still never overwritten.
  - Names:
    - packages `@gmb/bitmark-editor` and `@gmb/bitmark-editor-angular`;
    - elements `<bitmark-session>`, `<bitmark-pane>`, `<bitmark-tabs>`,
      `<bitmark-split>`, `<bitmark-editor>`;
    - Angular selectors `bm-*`;
    - CSS variables `--bm-*`.
  - License: ISC, as the playground and the parser.
  - Accessibility:
    - each pane gets an ARIA label from `messages`;
    - banners use `aria-live="polite"`;
    - tabs follow the WAI-ARIA tabs pattern.
  - API docs: TypeDoc for the public API, published beside the README.
  - Order: the Phase 0 spikes come first. A failed spike reopens the
    affected decision (D4, D8, D12) before Phase 1 starts.
  - Upstream parser asks (optional, not blocking), sent as one note to the
    parser repo:
    - export the active variant (D7);
    - publish the editor-service types;
    - include mapping ids in the published `OutputFormat` type.

## Design Notes

### Engine (D2)

- `BitmarkEngine` is what the editor needs. It is the functions the
  playground already uses:
  - `bitmarkToObjects`, `convert`, `convertWithDetails?`, `splitBits?`;
  - `semanticTokens`, `diagnostics?`, `complete?`, `resolve?`, `hover?`;
  - `info?`, `version()`.

  It also says which stage has loaded (`bitmark-json`, then `full`) and lets
  the editor subscribe to that change. The optional members are
  feature-detected as today: a missing export means the feature is off,
  never an error.
- D14 — The engine interface is async, and an optional worker engine ships
  in v1.
  - Measured (parser 7.7.0, `full`, `book.bitmark` repeated). One edit on
    the main thread costs about:

    | Document | Per edit |
    |---|---|
    | 22 KB | 25 ms |
    | 88 KB | 50 ms |
    | 351 KB | 190 ms |

    At 351 KB that splits as `bitmarkToObjects` 65 ms, the JSON text 83 ms,
    `semanticTokens` 24 ms, `diagnostics` 14 ms. This is before Monaco's own
    `setValue`. Typing stutters beyond about 100 KB, and real books are
    several MB.
  - Every `BitmarkEngine` method returns a promise. A main-thread engine
    (injected or loaded) wraps its synchronous calls. This is fixed in v1,
    because switching from sync to async later would break the API.
  - Results are applied only if they are still current: each request
    carries the model version, and stale results are dropped. Completion
    and hover use Monaco's promise-returning providers.
  - The worker engine is `loadBitmarkEngine({ worker: true })`, or
    `createBitmarkWorkerEngine(url)` for hosts that bundle the worker.
    - The worker runs the parser and builds the JSON text and bit starts.
      It posts back strings, so the main thread does only Monaco work.
    - Requests are coalesced, latest edit wins (this generalises D12's
      `debounceMs`). Highlighting and diagnostics run on a fast lane, so a
      long conversion never delays colouring.
    - It is a second wasm instance from the same pinned URL (D13), so it
      comes from cache. In `/bundled`, the worker starts from a blob URL,
      like Monaco's (D12).
  - Injection is unchanged (D7): an injected module runs on the main
    thread. A host that wants the worker lets the package load it, or
    passes `worker: true` with its own parser URL. It can choose per
    session (e.g. cosmic: injected for small documents, worker for books).
  - The default is the main thread. There is no automatic switch by size;
    the README gives the table above as guidance (use the worker beyond
    about 100 KB).
- D7 — The package never calls `init` on an injected module. The parser's
  `init` can be called again, and each call swaps the active variant; no
  export reports which variant is active. So a package-side `init` could
  silently downgrade a host that loaded `full`. Injection therefore means
  "already initialised; the host owns the lifecycle".
  - `createBitmarkEngine(module, { feature })` wraps a raw module. The host
    declares the variant it loaded (`full` | `browser-full` |
    `bitmark-json`); the default is `bitmark-json`, so the HTML, XML and Text panes stay
    disabled until told otherwise.
  - After calling `init` itself, the host calls `engine.setFeature(f)` to
    upgrade the engine, and those panes come alive.
- `loadBitmarkEngine({ url?, version?, feature? })` dynamically imports the
  module and runs the two-stage `init` itself (today's
  `BitmarkParserProvider` logic). This is the load path, where the package
  owns the module.
  - Stage 1 is `bitmark-json`.
  - Stage 2 is the `feature` option, default `full`. `full` carries the
    description strings that hover and completion documentation show;
    `browser-full` is smaller but has no descriptions.
  - The cache-buster and `?engine=local` / `?v2=` handling stay in the
    playground, which passes the result as `url`.
- The editor's `engine` option takes:
  - a `BitmarkEngine`, or a promise of one;
  - a raw module, which the editor wraps;
  - loader options, which the editor loads from.

  With no `engine`, the editor loads the default engine. Load results are
  cached per URL, so several editors share one engine.
- The JSON schema comes from a `schema` option: an object, a URL, or `false`.
  - With no `schema`, it is fetched from beside the engine URL, as today
    (`schemaUrlFor`).
  - For an injected module with no URL, it is fetched from the CDN at
    `version()`.
  - Failure is silent: the JSON editor then checks syntax only, as today.

### Core

- Monaco setup: `setupBitmarkMonaco({ monaco })` (D8) registers, on the
  given instance, the bitmark language, the token stylesheet, and the
  completion and hover providers.
  - It is idempotent per Monaco instance.
  - Workers and the suggest / hover contributions belong to whoever owns
    that Monaco: the host for `/esm`, the package for `/bundled`, which calls
    setup itself with its own workers.
- Per-instance sources. The providers registered once per Monaco look up
  the engine of the editor that asks, through a `WeakMap<ITextModel,
  instance>`. Today they read a module-level `source`. The highlighter and
  diagnostics already attach per editor; their module-level `source` becomes
  the engine passed to `attach…`.
- Scroll sync becomes an N-way group, one per session (D9):
  `createScrollSyncGroup()`.
  - It replaces today's two fixed slots (`bitmark` / `output`) with a
    member set.
  - It keeps today's rules, generalised:
    - the scrolled member leads, and every other member follows
      (leader → each, through the pairwise `mapScrollTop`);
    - echo suppression covers all followers;
    - after a content change, the focused member leads;
    - a member that joins, or has just mounted, follows the current leader.
  - Membership replaces `uiState.linkScroll`; removing every member is
    "off".
  - Bit starts per pane type, as in PLAN-018 D1:
    - bitmark panes are *split* (`splitBits`);
    - JSON, HTML, XML and Text panes are *pinned* (`bitMarkers`).
  - `bitMarkers`, `mapScrollTop`, `jsonText` and `convertWithBitStarts` move
    unchanged.
- Editor wrapper: `createTextEditor(element, options)` ports the
  `MonacoTextArea` behaviour to plain TypeScript:
  - the change filter;
  - no programmatic `setValue` while the editor has focus;
  - echo suppression;
  - auto-layout via `ResizeObserver`.
- Session (D9): `createBitmarkSession({ engine, monaco, value?, schema? })`.
  - State: the bitmark text (the source of truth), its version, the last
    edit's source pane, and errors. Small, with a subscribe API; no valtio.
  - Methods:
    - `getBitmark()` and `setBitmark(text)`;
    - `getJson({ mode })`, computed on demand and cached per bitmark
      version;
    - `setScrollSync(panes)`;
    - `panes()`;
    - `dispose()`, which disposes every pane.
  - Events: `change` (the bitmark text, its source pane, errors), `ready`
    (the engine stage reached), `error`.
- Panes: `createBitmarkPane(el, session, opts)`, `createJsonPane(…,
  { mode })`, `createHtmlPane`, `createXmlPane(…, { mapping })`,
  `createTextPane`, `createInfoPane`, `createMappingsPane`.
  - Common options: `readOnly`, `scrollSync` (joins the group, default
    `true`), and Monaco `editorOptions`.
  - Methods: `setReadOnly`, `setScrollSync`, `layout`, `dispose`.
  - `mode` is `optimized` (the default) or `full`. Two JSON panes with
    different modes can sit side by side, as the playground's WASM / WASM
    (full) tabs do.
  - The edit flow, generalising the playground's runners:
    1. A pane's user edit is converted to bitmark (identity for a bitmark
       pane; for JSON `convert` json → bitmark; for HTML or XML `convert`
       mapping → bitmark).
    2. On success the session's bitmark is set with the pane as the source.
    3. Every pane except the source regenerates: JSON through
       `bitmarkToObjects` and the bit-start JSON writer; HTML, XML and Text
       through `convertWithBitStarts`.
    4. On failure, the source pane shows its markers or error, and nothing
       else changes (last good value kept).

    This one "skip the source" rule replaces today's per-runner loop guards
    (`lastOriginalMarkup`, `lastWasmMarkup`). It also keeps today's
    behaviour that the edited pane is never overwritten (D9).
  - HTML, XML and Text panes wait for the `full` stage and show "Loading…"
    until then. If the declared feature is wrong, they show "needs the full
    parser".
  - A read-only pane still regenerates, and is not a source.

### Custom element and adapters

- `<bitmark-session id="doc">` holds the document and renders nothing.
  - attributes: `value`, `engine-url`, `engine-version`, `engine-feature`;
  - properties: `engine` and `monaco` (for injection), `value`, `session`
    (the core object);
  - events: `change`, `ready`, `error`.
- `<bitmark-pane type="bitmark|json|html|xml|text|info|mappings">` can go anywhere in the
  page.
  - It binds to its nearest `<bitmark-session>` ancestor, or to
    `session="doc"` by id from elsewhere in the DOM.
  - attributes: `mode`, `mapping`, `readonly`, `scroll-sync` (on by
    default, `scroll-sync="off"` to leave the group). All of them can be
    changed at runtime.
  - The host sizes it; it warns once if it is mounted with height 0.
- Optional layouts, conveniences only (D9):
  - `<bitmark-tabs>` is a tab strip over its child panes, mounting only the
    active one.
  - `<bitmark-split direction="row|column|auto">` places two children, with
    `auto` stacking through a container query.
  - `<bitmark-editor>` is a preset (session + split + bitmark pane + tabs
    over JSON / chosen panes) that reproduces the playground's arrangement
    in one tag.

  Each is styled through CSS custom properties.
- The elements are defined only when imported (no SSR side effects). Static
  sites import them from a `<script type="module">`; SSR frameworks import
  them client-only.
- React adapter: `<BitmarkSession>` and `<BitmarkPane>` components, plus
  hooks.
- The playground keeps its multi-parser tabs (Original / WASM / WASM full).
  The WASM tabs become package JSON panes (`optimized` / `full`). The
  Original (bpg) tabs stay playground-only. They connect through the
  session's `change` event and `setBitmark`, exactly as an external host
  would.

### Theme

- D11 — Dark, light, and configurable.
  - `theme: 'dark' | 'light' | 'auto' | CustomTheme` is set on the session,
    on `provideBitmarkEditor` and on `<bitmark-session>`.
    - `dark` is the current palette with `vs-dark`.
    - `light` is a new palette designed for contrast on white, with `vs`.
    - `auto` follows `prefers-color-scheme` and switches live.
    - `CustomTheme` is `{ base: 'dark' | 'light', monacoTheme?, tokens? }`:
      it overrides individual token styles, and `monacoTheme` names a theme
      the host registered with `defineTheme`.
  - Token colours are CSS custom properties (`--bm-tok-<type>`,
    `--bm-mod-<modifier>`) with the palette as defaults. They are scoped by a
    theme class on each pane (`.bm-theme-dark`, `.bm-theme-light`), so plain
    host CSS can restyle them. `TOKEN_STYLES` stays typed against the
    parser's `SemanticTokenType`, so a legend change still fails the build.
  - Monaco's theme is global per Monaco instance (`setTheme` restyles every
    editor on the page). So:
    - when the package owns Monaco (`/bundled`), it calls `setTheme`;
    - with an injected Monaco, it does not by default. The host's theme
      stays in charge and only the token palette follows `theme`;
      `applyMonacoTheme: true` opts in. cosmic (already on `vs-dark`) passes
      `theme: 'dark'`;
    - two sessions with different themes on one Monaco each get their own
      token colours, but share the last applied Monaco base theme. The
      README documents this Monaco limit.

## Steps

The steps, testing, documentation work and completion criteria are in
PLAN-021 (`PLAN-021-bitmark-editor-package-steps.md`), split out to keep
each plan within the size limit. Decision ids (D1 to D12) are defined here.

## Risks

- Monaco in the Angular application builder: CSS imported from Monaco's ESM,
  and its workers. Mitigation: the `/bundled` build (D4), proven in Phase 0
  before anything else is built.
- `/bundled` worker URLs: host bundlers (e.g. Vite pre-bundling) can break
  `new URL('./worker.js', import.meta.url)` inside a dependency. Mitigation:
  an explicit asset base option, with `optimizeDeps.exclude` documented.
  `/esm` is unaffected, because the host owns the workers (D8).
- Two Monaco copies when a host that already uses Monaco takes `/bundled`.
  Mitigation: inject the host's Monaco into `/esm` (D8); the `/bundled` guard
  warns and never overwrites the host's `MonacoEnvironment`.
- An injected Monaco that is outside the supported range, or missing
  contributions. Mitigation: the D8 capability checks degrade per feature
  with a warning; the README lists what the host's Monaco must include.
- Monaco is a global registry: `languages.register` and the JSON defaults are
  page-wide even with per-instance sources. Mitigation: model-URI scoping
  (D5); per-instance lookup through the model map.
- Monaco deep imports (`esm/vs/...`) change between versions. Mitigation:
  a pinned peer range, and the `/bundled` build fixes the version.
- Async ordering bugs (D14): a slow result landing after a newer edit.
  Mitigation: model-version tags on every request, drop anything stale, and
  property tests with out-of-order resolution.
- Worker memory: a second wasm instance per page. Mitigation: one worker per
  engine (shared by every session that uses that engine), and it is opt-in.
- A host declares the wrong `feature` for an injected module. A view then
  fails with `UnsupportedFeatureError`. Mitigation: catch it and show "needs
  the full parser" in the view, not an error dump.
- A host calls `init` again later and downgrades the variant under the
  editor. Mitigation: document that `setFeature` must follow every host
  `init`.
- CSP: wasm (`'wasm-unsafe-eval'`), worker sources, the CDN origin.
  Mitigation: document them; host-URL and injection paths for strict CSP.
- The playground's multi-parser tabs (Original / WASM / full) must keep
  working on lower-level pieces. Mitigation: Phase 1 refactors in place,
  behind the existing tests, before anything moves.

## Dependencies

- `@gmb/bitmark-parser` 7.7.0+ (the editor services, `convertWithDetails`,
  `splitBits` with `start`), as the playground uses today.
- PLAN-018 Step 9 (the parser release carrying PLAN-221) is not a blocker:
  the package feature-detects, as the playground does.

## Open Questions

- [x] Parser loading? — Both: injected by the host, or loaded by the
  package (D2).
- [x] Package location? — This repo's workspace first, then its own repo
  (D6); not the parser monorepo.
- [x] Parser (upstream, optional; in the D16 note): publish the editor-service types, so
  `bitmarkEditorTypes.ts` can be deleted.
- [x] Is `init` idempotent, and can the active variant be read? — `init`
  can be called again and swaps the variant atomically; nothing reports the
  active variant. → D7: never `init` an injected module; the host declares
  its feature. Stage 2 on the load path defaults to `full`.
- [x] Parser (upstream, optional; in the D16 note): export the active variant (e.g.
  `activeFeature()`), so `feature` could be detected rather than declared.
- [x] Info and Mappings? — Both are optional read-only panes, not in scroll
  sync (D1).
- [x] Theme? — Dark, light, `auto` and custom, with token CSS variables;
  an injected Monaco's theme is left alone unless asked (D11).
- [x] Angular wrapper in v1? — Yes: `@gmb/bitmark-editor-angular` (D10).
  cosmic is the first Angular host. Findings from its repo (`gmb.web`):
  - Angular 21.2, NgModule bootstrap, `provideZoneChangeDetection` (zone.js
    0.15), `@angular/build`;
  - it already has Monaco: 0.46.0 through `ngx-monaco-editor-v2`. This is the
    AMD build copied to `/assets/monaco/min`, read as a global
    `window.monaco`, with `vs-dark` and `fixedOverflowWidgets` +
    `overflowWidgetsDomNode` used in its editor;
  - it bundles `@gmb/bitmark-parser` ^7.9.0 itself (`/browser` entry) and
    calls `init({ feature: 'bitmark-json', module_or_path:
    '/assets/bitmark-parser/bitmark_json_wasm_bg.wasm' })`, behind a feature
    flag;
  - it has no test runner (verified by build and browser only).

  So cosmic is the "inject both" case (D2, D7, D8): it passes its own parser
  module (`feature: 'bitmark-json'`) and its own `window.monaco`.
- [x] Layout? — None fixed. A session and independent panes the host places
  anywhere; optional layout helpers (D9).
- [x] Editable panes? — Every pane is editable and updates the others, as in
  the playground; any pane can be marked read-only; Text is always
  read-only (D9).
- [x] Scroll sync? — A per-pane membership set, switchable at runtime (D9).
- [x] Which Angular version must the example target? — Angular 21, shaped
  like cosmic (Step 15a).
- [x] The docs site (not Astro): switch from CodeMirror to the package? —
  Yes (D12), with lazy load, the narrow-screen option, CDN-safe workers,
  `messages` and a debounce option.
- [x] Docs site load trigger and narrow screens? — `lazy="idle"` with
  pinned, cacheable URLs; `narrow="static"` (D12).
- [x] Default parser version on the load path? — An exact version pinned per
  editor release, bumped by an automated PR (D13).
- [x] Parser work off the main thread? — An async engine interface now, and an
  opt-in worker engine in v1 (D14).
- [x] Error display? — Markers and a stale state; never error text in place of
  pane content (D15).
- [x] Remaining defaults (regeneration, names, license, a11y, API docs, order,
  upstream asks)? — Agreed as listed (D16).
- [x] Is cosmic integration in scope? — A proof of concept on a cosmic branch
  as the last step (Step 17); the real cosmic feature is a separate plan.

## References

- Architecture: .awa/specs/ARCHITECTURE.md
- Code moving to the core:
  - src/monaco-bitmark/*
  - src/scrollSync/*
  - src/components/monaco/MonacoTextArea.tsx
  - src/components/monaco/MonacoEditorAutoResize.tsx
  - src/monaco-setup.ts
- Code reworked:
  - src/services/BitmarkParser.tsx (engine)
  - src/services/BitmarkConverter.tsx (session edit flow)
  - src/services/{TableHtmlRunner,XmlRunner,TextRunner,InfoRunner,MappingsRunner}.tsx and
    src/components/bitmark/{TableHtmlPanel,XmlPanel,TextPanel}.tsx (optional panes)
  - src/state/bitmarkState.ts (per-instance state)
- Code staying in the playground:
  - src/services/{BitmarkParserGenerator,JsRoundTripRunner,WasmCheckRunner,settingsStorage,settingsPersistence}.ts(x)
  - src/components/bitmark/{DiffPanel,WasmCheckPanel}.tsx
  - src/components/generic/*
- Plans: PLAN-016, PLAN-017, PLAN-018 (the features carried over)
