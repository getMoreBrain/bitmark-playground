// @awa-component: PLAN-021-AngularWrapper
import { Component, computed, effect, ElementRef, inject, input, NgZone, OnDestroy, signal, untracked } from '@angular/core';
import {
  type BitmarkPane,
  createBitmarkPane,
  createHtmlPane,
  createInfoPane,
  createJsonPane,
  createMappingsPane,
  createTextPane,
  createXmlPane,
  type PaneOptions,
  type PaneType,
} from '@gmb/bitmark-editor';

import { BmSessionComponent } from './session.component';

/** One fixed node for every pane's Monaco widgets (as cosmic does). */
let overflowNode: HTMLElement | undefined;
const sharedOverflowNode = (): HTMLElement => {
  if (!overflowNode) {
    overflowNode = document.createElement('div');
    overflowNode.className = 'monaco-editor';
    overflowNode.id = 'bm-monaco-widgets';
    document.body.appendChild(overflowNode);
  }
  return overflowNode;
};

/**
 * `<bm-pane type="…">`: one pane of the enclosing `bm-session` (PLAN-020 D9,
 * D10). The host gives it a height. `readonly` and `scrollSync` switch at
 * runtime; a new `type`, `mode`, `mapping` or `label` makes a new pane.
 */
// @awa-impl: PLAN-021-Step13a (bm-pane)
@Component({
  selector: 'bm-pane',
  standalone: true,
  template: '',
  // Fills its box (a split or tab area); the host sizes the outermost one.
  host: {
    style: 'display: block; height: 100%; flex: 1 1 0; min-height: 0; min-width: 0',
    '[style.display]': 'isInactive() ? "none" : null',
  },
})
export class BmPaneComponent implements OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly sessionHost = inject(BmSessionComponent);

  readonly type = input<PaneType>('bitmark');
  readonly mode = input<'optimized' | 'full'>();
  readonly mapping = input<string>();
  readonly label = input<string>();
  readonly readonly = input(false);
  readonly scrollSync = input<boolean>();
  /** An inactive pane is not mounted. */
  readonly inactive = input(false);
  /** Set by an enclosing `bm-tabs` for every tab but the active one. */
  readonly hiddenByTabs = signal(false);
  readonly isInactive = computed(() => this.inactive() || this.hiddenByTabs());

  private pane: BitmarkPane | undefined;

  constructor() {
    // A new pane for a new session, type, mode, mapping, label or activity.
    effect((onCleanup) => {
      const session = this.sessionHost.session();
      const type = this.type();
      const mode = this.mode();
      const mapping = this.mapping();
      const label = this.label();
      if (!session || this.isInactive()) return;
      const options: PaneOptions = untracked(() => ({
        readOnly: this.readonly() || this.sessionHost.disabled(),
        scrollSync: this.scrollSync(),
        label,
        editorOptions: this.sessionHost.fixedOverflowWidgets
          ? { fixedOverflowWidgets: true, overflowWidgetsDomNode: sharedOverflowNode() }
          : undefined,
      }));
      const el = this.el.nativeElement as HTMLElement;
      const pane = this.zone.runOutsideAngular(() => {
        switch (type) {
          case 'bitmark':
            return createBitmarkPane(el, session, options);
          case 'json':
            return createJsonPane(el, session, { ...options, mode });
          case 'html':
            return createHtmlPane(el, session, options);
          case 'xml':
            return createXmlPane(el, session, { ...options, mapping: mapping ?? 'xml-niso-iec' });
          case 'text':
            return createTextPane(el, session, options);
          case 'info':
            return createInfoPane(el, session, options);
          default:
            return createMappingsPane(el, session, options);
        }
      });
      const blur = this.zone.runOutsideAngular(() => pane.textEditor.editor.onDidBlurEditorText(() => this.sessionHost.touched()));
      this.pane = pane;
      onCleanup(() => {
        blur.dispose();
        pane.dispose();
        if (this.pane === pane) this.pane = undefined;
      });
    });
    effect(() => {
      const readOnly = this.readonly() || this.sessionHost.disabled();
      untracked(() => this.pane?.setReadOnly(readOnly));
    });
    effect(() => {
      const on = this.scrollSync();
      if (on !== undefined) untracked(() => this.pane?.setScrollSync(on));
    });
  }

  /** The pane, once mounted. */
  get bitmarkPane(): BitmarkPane | undefined {
    return this.pane;
  }

  ngOnDestroy(): void {
    this.pane?.dispose();
    this.pane = undefined;
  }
}
