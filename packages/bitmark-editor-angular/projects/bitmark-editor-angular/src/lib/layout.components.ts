import { Component, computed, contentChildren, effect, input, model, untracked } from '@angular/core';

import { BmPaneComponent } from './pane.component';

/**
 * `<bm-tabs>`: a tab strip over its `bm-pane` children; only the active one
 * is mounted (PLAN-022 D9). WAI-ARIA tabs keys (D16).
 */
@Component({
  selector: 'bm-tabs',
  standalone: true,
  host: { style: 'display: flex; flex-direction: column; height: 100%; min-height: 0' },
  template: `
    <div role="tablist" class="bm-tablist" style="display: flex; gap: 2px; flex: 0 0 auto">
      @for (label of labels(); track $index) {
        <button
          type="button"
          role="tab"
          class="bm-tab"
          [attr.aria-selected]="$index === active()"
          [tabIndex]="$index === active() ? 0 : -1"
          (click)="active.set($index)"
          (keydown)="key($event, $index)"
        >
          {{ label }}
        </button>
      }
    </div>
    <div style="flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column"><ng-content /></div>
  `,
})
export class BmTabsComponent {
  readonly active = model(0);
  /** Tab labels; default: each pane's `label` or its type. */
  readonly tabLabels = input<string[]>();
  private readonly panes = contentChildren(BmPaneComponent);
  readonly labels = computed(
    () => this.tabLabels() ?? this.panes().map((p) => p.label() ?? (p.type() === 'xml' ? `XML (${p.mapping() ?? 'xml-niso-iec'})` : p.type().toUpperCase())),
  );

  constructor() {
    effect(() => {
      const active = this.active();
      const panes = this.panes();
      untracked(() => panes.forEach((p, i) => p.hiddenByTabs.set(i !== active)));
    });
  }

  key(e: KeyboardEvent, i: number): void {
    const n = this.labels().length;
    const next =
      e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    this.active.set(next);
  }
}

/** `<bm-split direction="row|column">`: children side by side or stacked (PLAN-022 D9). */
@Component({
  selector: 'bm-split',
  standalone: true,
  template: '<ng-content />',
  host: {
    style: 'display: flex; gap: 4px; height: 100%; min-height: 0',
    '[style.flex-direction]': 'direction()',
  },
})
export class BmSplitComponent {
  readonly direction = input<'row' | 'column'>('row');
}
