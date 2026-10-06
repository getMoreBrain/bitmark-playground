# Hand-off: cosmic proof of concept (PLAN-023 Step 17)

For a branch in `getMoreBrain/cosmic` (`gmb.web`). Done on branch
`feat/bitmark-editor-poc` (PLAN-023 Step 17); this brief is kept for the
real integration.

## What to do

1. Install the packages. Use the prerelease from npm, or local tarballs:
   `npm pack` in `packages/bitmark-editor`, and in
   `packages/bitmark-editor-angular/dist/bitmark-editor-angular`.
   - `@gmb/bitmark-editor`
   - `@gmb/bitmark-editor-angular`
2. In the app's providers:

   ```ts
   provideBitmarkEditor({
     monaco: () => waitForWindowMonaco(),   // ngx-monaco-editor-v2 loads it from /assets/monaco/min
     engine: () => ({ module: rustParserModule, feature: 'bitmark-json' }),
     theme: 'dark',
     schema: '/assets/bitmark-parser/bitmark.schema.json',  // add this file to the angular.json asset glob
   })
   ```

   `rustParserModule` is the `@gmb/bitmark-parser/browser` module that
   `BitmarkConvertorService` already initialises (it calls `init` with
   `bitmark-json` and the wasm from assets). Share that one module, so the
   page has one wasm instance.
3. On one screen, behind a feature flag:

   ```html
   <bm-session [formControl]="content" style="height: 400px">
     <bm-split><bm-pane type="bitmark"></bm-pane><bm-pane type="json"></bm-pane></bm-split>
   </bm-session>
   ```

## Done when

- `npm run build:cosmic` passes.
- In the browser: highlighting, diagnostics, completion, hover, conversion
  both ways, and scroll sync work. cosmic's existing Monaco editors (the
  reader's code editor) are unaffected, with the same theme and no new
  JSON markers.

## Notes

- Monaco's theme is page-wide. Set `vs-dark` (as cosmic's reader does) with
  the package's `theme: 'dark'`; on Monaco's default `vs` the dark token
  colours are unreadable.
- cosmic's CI deletes the lockfile and reinstalls: a local tarball must be
  committed in the repo (`file:vendor/…`).
- Re-vendoring: bump the version, or cosmic's production `npm ci` fails on
  the lockfile's integrity hash.
- A route guard on a flag must wait for `FeatureFlagService.ready`: the
  first navigation runs before DevCycle answers.

- `packages/bitmark-editor-angular/projects/example` reproduces this setup,
  and its e2e passes: Angular 21 with zones, Monaco 0.46 AMD, the injected
  parser. Copy from it.
- HTML, XML and Text panes need the `full` (or `browser-full`) variant.
  cosmic ships only the `bitmark-json` wasm today; to use them, add the
  wasm file and call `init({ feature: 'browser-full' })`, then
  `session.engine.setFeature('browser-full')`.
- Large books: pass a worker engine (README, "The worker engine").
