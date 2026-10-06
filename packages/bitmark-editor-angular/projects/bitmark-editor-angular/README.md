# @gmb/bitmark-editor-angular

Angular components for [`@gmb/bitmark-editor`](../../../bitmark-editor/README.md)
(PLAN-022 D10): `bm-session`, `bm-pane`, `bm-tabs`, `bm-split`, with forms
support. Angular 21+.

```ts
// app.module.ts (or an app config's providers)
providers: [
  provideBitmarkEditor({
    monaco: () => loadYourMonaco(),            // the host's Monaco (e.g. window.monaco)
    engine: () => ({ module: parser, feature: 'bitmark-json' }), // the host's parser, already init()ed
    theme: 'dark',
  }),
],
```

```html
<bm-session [formControl]="content" (change)="onChange($event)" style="height: 320px">
  <bm-split>
    <bm-pane type="bitmark"></bm-pane>
    <bm-tabs>
      <bm-pane type="json"></bm-pane>
      <bm-pane type="html"></bm-pane>
    </bm-tabs>
  </bm-split>
</bm-session>
```

- `bm-session` inputs: `value`, `monaco`, `engine`, `theme`, `debounceMs`,
  `schema`; outputs: `change`, `ready`, `error`. As a form control, its
  value is the bitmark text; disabling the control makes the panes read-only.
- `bm-pane` inputs: `type` (`bitmark` | `json` | `html` | `xml` | `text` |
  `info` | `mappings`), `mode`, `mapping`, `label`, `readonly`,
  `scrollSync`, `inactive`. It fills its box: size the outermost one.
- Monaco and the session run outside the Angular zone; the outputs re-enter
  it, so change detection runs once per document change, not per Monaco
  event.
- Monaco's widgets go to one fixed overflow node by default
  (`fixedOverflowWidgets: false` in the config to turn that off).

The example app (`projects/example`) is shaped like cosmic: NgModule
bootstrap, zone change detection, Monaco 0.46 AMD from assets as
`window.monaco`, and the parser bundled and initialised by the app.
