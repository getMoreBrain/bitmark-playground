// The example app, shaped like cosmic (PLAN-020 D10, PLAN-021 Step 15a):
// NgModule bootstrap, zone change detection, Monaco 0.46 AMD from assets as
// `window.monaco`, the parser bundled and initialised by the app.
import { NgModule, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import {
  BmPaneComponent,
  BmSessionComponent,
  BmSplitComponent,
  BmTabsComponent,
  provideBitmarkEditor,
} from '@gmb/bitmark-editor-angular';
import * as parser from '@gmb/bitmark-parser/browser';
import type { Monaco, RawParserModule } from '@gmb/bitmark-editor';

import { App } from './app';

type Win = Window & {
  monaco?: Monaco;
  require?: { config(c: unknown): void; (deps: string[], cb: () => void): void };
};

/** Load the AMD Monaco from the app's assets, once (as ngx-monaco-editor-v2 does in cosmic). */
let monacoPromise: Promise<Monaco> | undefined;
export const loadAmdMonaco = (): Promise<Monaco> =>
  (monacoPromise ??= new Promise((resolve, reject) => {
    const w = window as Win;
    if (w.monaco) return resolve(w.monaco);
    const script = document.createElement('script');
    script.src = '/assets/monaco/min/vs/loader.js';
    script.onerror = reject;
    script.onload = () => {
      w.require!.config({ paths: { vs: '/assets/monaco/min/vs' } });
      w.require!(['vs/editor/editor.main'], () => resolve(w.monaco!));
    };
    document.body.appendChild(script);
  }));

/** The host initialises its own parser, as cosmic does (D7: the package never calls init). */
export const parserReady = parser.init({
  feature: 'bitmark-json',
  module_or_path: '/assets/bitmark-parser/bitmark_json_wasm_bg.wasm',
} as Parameters<typeof parser.init>[0]);

@NgModule({
  declarations: [App],
  imports: [BrowserModule, ReactiveFormsModule, BmSessionComponent, BmPaneComponent, BmTabsComponent, BmSplitComponent],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true, runCoalescing: true }),
    provideBitmarkEditor({
      monaco: async () => {
        await parserReady;
        return loadAmdMonaco();
      },
      engine: () => ({ module: parser as unknown as RawParserModule, feature: 'bitmark-json' }),
      theme: 'dark',
      // The schema the app serves itself, beside its wasm.
      schema: '/assets/bitmark-parser/bitmark.schema.json',
    }),
  ],
  bootstrap: [App],
})
export class AppModule {}
