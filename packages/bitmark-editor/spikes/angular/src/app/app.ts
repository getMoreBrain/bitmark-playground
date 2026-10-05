// PLAN-020 Phase 0: Angular 21 shaped like cosmic (D10). NgModule bootstrap,
// zone change detection, Monaco 0.46 AMD loaded from assets as
// `window.monaco` (as ngx-monaco-editor-v2 does), and the parser bundled and
// initialised by the app with `bitmark-json`, then injected (D7, D8).
import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import * as parser from '@gmb/bitmark-parser/browser';

import { createPair, type Engine, type Monaco, setJsonSchema } from '../../../proto/core';

type Win = Window & {
  monaco?: Monaco;
  require?: { config(c: unknown): void; (deps: string[], cb: () => void): void };
  __spike?: Record<string, unknown>;
  __pair?: unknown;
  __monaco?: Monaco;
  __ticks?: number;
};
const win = window as Win;

/** Load the AMD Monaco from the app's assets, once (what ngx-monaco-editor-v2 does). */
const loadAmdMonaco = (): Promise<Monaco> =>
  new Promise((resolve, reject) => {
    if (win.monaco) return resolve(win.monaco);
    const script = document.createElement('script');
    script.src = '/assets/monaco/min/vs/loader.js';
    script.onerror = reject;
    script.onload = () => {
      win.require!.config({ paths: { vs: '/assets/monaco/min/vs' } });
      win.require!(['vs/editor/editor.main'], () => resolve(win.monaco!));
    };
    document.body.appendChild(script);
  });

@Component({
  selector: 'app-root',
  standalone: false,
  template: `
    <h3>bitmark pair in Angular ({{ mode }} the zone)</h3>
    <div style="display: flex; gap: 8px">
      <div #bitmark data-pane="bitmark" style="flex: 1; height: 300px; border: 1px solid #444"></div>
      <div #json data-pane="json" style="flex: 1; height: 300px; border: 1px solid #444"></div>
    </div>
  `,
})
export class App implements AfterViewInit, OnDestroy {
  @ViewChild('bitmark') bitmark!: ElementRef<HTMLElement>;
  @ViewChild('json') json!: ElementRef<HTMLElement>;
  /** `?zone=inside` creates the editors inside the zone, for comparison. */
  readonly mode = new URLSearchParams(location.search).get('zone') === 'inside' ? 'inside' : 'outside';
  private pair?: { dispose(): void };

  constructor(private zone: NgZone) {
    // Count zone turns that end in change detection.
    win.__ticks = 0;
    zone.onMicrotaskEmpty.subscribe(() => win.__ticks!++);
  }

  async ngAfterViewInit(): Promise<void> {
    const t = (win.__spike = { start: performance.now() } as Record<string, unknown>);
    try {
      const monaco = await loadAmdMonaco();
      // The host initialises its own parser (cosmic does exactly this).
      await parser.init({
        feature: 'bitmark-json',
        module_or_path: '/assets/bitmark-parser/bitmark_json_wasm_bg.wasm',
      } as Parameters<typeof parser.init>[0]);
      const schema = await fetch('/assets/bitmark-parser/bitmark.schema.json').then((r) => r.json());
      t['schemaApplied'] = setJsonSchema(monaco, schema);
      const mount = () =>
        createPair({
          monaco,
          engine: parser as unknown as Engine,
          bitmarkElement: this.bitmark.nativeElement,
          jsonElement: this.json.nativeElement,
          value: '[.article]\nHello **World**!\n\n[.cloze]\nThe capital of France is [_Paris].',
        });
      // Native async/await resumes outside the zone, so `inside` must re-enter it.
      const pair = this.mode === 'inside' ? this.zone.run(mount) : this.zone.runOutsideAngular(mount);
      this.pair = pair;
      win.__pair = pair;
      win.__monaco = monaco;
      t['mounted'] = performance.now();
    } catch (e) {
      t['error'] = String(e);
      console.error(e);
    }
  }

  ngOnDestroy(): void {
    this.pair?.dispose();
  }
}
