# Hand-off: the docs site switches to the package (PLAN-021 Step 18)

For a branch in the parser repo (`docs-site/`, Eleventy). Not started: it
is work in another repository, and it needs the package on jsDelivr (a
published prerelease).

## What to do

1. In `src/_includes/partials/bit-content.njk`, replace the CodeMirror
   mounts with:

   ```html
   <bitmark-session id="try-it" lazy="idle" narrow="static" debounce="300"
       theme="{{ initial theme }}" value="{{ example }}"
       engine-url="https://cdn.jsdelivr.net/npm/@gmb/bitmark-parser@<pinned>/dist/browser/bitmark-parser.min.js">
     <pre data-bitmark-static>…the validated example…</pre>
     <bitmark-pane type="bitmark" label="{{ i18n.bitmark }}"></bitmark-pane>
     <bitmark-pane type="json" label="JSON"></bitmark-pane>
   </bitmark-session>
   ```

   plus `<script type="module" src="https://cdn.jsdelivr.net/npm/@gmb/bitmark-editor@<pinned>/dist/bundled/bundled.js">`.
2. In `live-examples.js`:
   - Reset and Template set `session.value = …`.
   - The theme toggle calls `session.session?.setTheme('light' | 'dark')`.
   - Messages come from the site's i18n: `messages` on `createBitmarkSession`,
     or attributes once the element takes them. Today the element takes
     `label` per pane.
3. CSS: map the token variables onto the site's `--syntax-*` tokens, e.g.
   `bitmark-session { --bm-tok-bitType-color: var(--syntax-tag); }`. The
   host's variables win over the themes'.
4. The release workflow stamps the pinned parser and editor versions; no
   `@latest`.
5. Remove the CodeMirror vendor bundle, `pane-sync.js`, and the CodeMirror
   highlighting.

## Done when

- The docs site's `npm test` and e2e pass, updated for Monaco.
- Every bit page still shows the static example when the CDN is blocked.
- Phones keep the static example.

## Notes

`packages/bitmark-editor/examples/static/index.html` is this setup in
miniature, and its checks pass: idle load, the token mapping, the theme
toggle, Reset, narrow screens, a blocked CDN, cold and warm start-up.
