import { Component, NgZone, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import type { Monaco } from '@gmb/bitmark-editor';

import { loadAmdMonaco } from './app-module';

type Win = Window & { __example?: Record<string, unknown> };

@Component({
  selector: 'app-root',
  standalone: false,
  template: `
    <h3>bitmark in Angular (zone, Monaco 0.46 AMD, injected parser)</h3>
    <bm-session [formControl]="content" (ready)="onReady()" (change)="changes = changes + 1" style="height: 320px">
      <bm-split>
        <bm-pane type="bitmark" label="bitmark"></bm-pane>
        <bm-tabs>
          <bm-pane type="json" label="JSON"></bm-pane>
          <bm-pane type="text" label="Text"></bm-pane>
        </bm-tabs>
      </bm-split>
    </bm-session>
    <p>Form value length: <span id="form-length">{{ content.value?.length ?? 0 }}</span>; changes: <span id="changes">{{ changes }}</span></p>
    <h3>The host's own JSON editor (must get no bitmark schema)</h3>
    <div id="host-json" style="height: 120px; border: 1px solid #444"></div>
  `,
})
export class App {
  private readonly zone = inject(NgZone);
  readonly content = new FormControl('[.article]\nHello **World**!\n\n[.cloze]\nThe capital of France is [_Paris].');
  changes = 0;

  constructor() {
    const w = window as Win;
    w.__example = { ticks: 0 };
    this.zone.onMicrotaskEmpty.subscribe(() => (w.__example!['ticks'] = (w.__example!['ticks'] as number) + 1));
    w.__example['form'] = this.content;
  }

  async onReady(): Promise<void> {
    const monaco: Monaco = await loadAmdMonaco();
    const hostModel = monaco.editor.createModel('[{"bit": {"type": 42}}]', 'json', monaco.Uri.parse('inmemory://host/config.json'));
    this.zone.runOutsideAngular(() => monaco.editor.create(document.getElementById('host-json')!, { model: hostModel }));
    (window as Win).__example!['ready'] = true;
    (window as Win).__example!['monaco'] = monaco;
  }
}
