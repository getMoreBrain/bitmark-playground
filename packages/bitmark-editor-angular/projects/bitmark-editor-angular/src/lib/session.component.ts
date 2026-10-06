// @awa-component: PLAN-021-AngularWrapper
import {
  Component,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  NgZone,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  type BitmarkEngine,
  type BitmarkSession,
  type BitmarkTheme,
  createBitmarkSession,
  type EngineSource,
  type Monaco,
  type SessionChange,
  type SessionError,
} from '@gmb/bitmark-editor';

import { BITMARK_EDITOR_CONFIG } from './config';

/**
 * `<bm-session>`: one bitmark document (PLAN-020 D9, D10). Put `bm-pane`s
 * (and `bm-tabs` / `bm-split`) inside it. Works with forms:
 * `formControlName` / `ngModel` bind the bitmark text.
 *
 * Monaco and the session run outside the Angular zone, so typing causes no
 * change detection (0 against 122 turns per 21 keystrokes in PLAN-021
 * Phase 0); the outputs re-enter it.
 */
// @awa-impl: PLAN-021-Step13a (bm-session, ControlValueAccessor, zone handling)
@Component({
  selector: 'bm-session',
  standalone: true,
  template: '<ng-content />',
  host: { style: 'display: block' },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BmSessionComponent), multi: true }],
})
export class BmSessionComponent implements OnInit, OnDestroy, ControlValueAccessor {
  private readonly zone = inject(NgZone);
  private readonly config = inject(BITMARK_EDITOR_CONFIG, { optional: true }) ?? {};
  readonly host = inject(ElementRef<HTMLElement>);

  /** The document. A change from outside replaces it; edits come out through `change`. */
  readonly value = input<string>();
  readonly monaco = input<Monaco>();
  readonly engine = input<EngineSource>();
  readonly theme = input<BitmarkTheme>();
  readonly debounceMs = input<number>();
  /** The JSON schema: an object, a URL, or `false`. */
  readonly schema = input<unknown>();

  readonly change = output<SessionChange>();
  readonly error = output<SessionError>();
  readonly ready = output<BitmarkEngine>();

  /** The session, once Monaco is there (`bm-pane`s wait on it). */
  readonly session = signal<BitmarkSession | undefined>(undefined);
  /** Read-only from the form (`setDisabledState`). */
  readonly disabled = signal(false);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private pendingValue: string | undefined;
  private destroyed = false;

  constructor() {
    effect(() => {
      const value = this.value();
      const s = this.session();
      if (s && value !== undefined && value !== s.getBitmark()) this.zone.runOutsideAngular(() => s.setBitmark(value));
    });
    effect(() => {
      const theme = this.theme();
      const s = this.session();
      if (s && theme !== undefined) s.setTheme(theme);
    });
  }

  ngOnInit(): void {
    // A failure (no Monaco, a loader that rejects) goes to `error`, not to an
    // unhandled rejection.
    this.start().catch((e: unknown) => {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error('[bitmark-editor]', error);
      this.error.emit({ error, pane: undefined });
    });
  }

  private async start(): Promise<void> {
    const fromConfig = this.config.monaco;
    const monaco = this.monaco() ?? (typeof fromConfig === 'function' ? await fromConfig() : fromConfig);
    if (this.destroyed) return;
    if (!monaco) {
      throw new Error('bm-session: no Monaco. Pass [monaco], or provideBitmarkEditor({ monaco })');
    }
    const engineFromConfig = this.config.engine;
    const engine = this.engine() ?? (typeof engineFromConfig === 'function' ? engineFromConfig() : engineFromConfig);
    const session = this.zone.runOutsideAngular(() =>
      createBitmarkSession({
        monaco,
        engine,
        value: this.pendingValue ?? this.value() ?? '',
        theme: this.theme() ?? this.config.theme,
        messages: this.config.messages,
        debounceMs: this.debounceMs(),
        schema: this.schema() ?? this.config.schema,
      }),
    );
    session.on('change', (e) => {
      // A change with no source pane came from here (`writeValue`, the
      // `[value]` input): not an edit, so not echoed back to the form.
      if (!e.source) return;
      this.zone.run(() => {
        this.onChange(e.bitmark);
        this.change.emit(e);
      });
    });
    session.on('error', (e) => this.zone.run(() => this.error.emit(e)));
    session.on('ready', (e) => this.zone.run(() => this.ready.emit(e)));
    this.session.set(session);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.session()?.dispose();
    this.session.set(undefined);
  }

  /** Whether panes default to fixed overflow widgets (D10). */
  get fixedOverflowWidgets(): boolean {
    return this.config.fixedOverflowWidgets ?? true;
  }

  // ControlValueAccessor: the form value is the bitmark text.
  writeValue(value: string | null): void {
    const s = this.session();
    if (s) this.zone.runOutsideAngular(() => s.setBitmark(value ?? ''));
    else this.pendingValue = value ?? '';
  }
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }
  /** Called by panes when an editor loses focus. */
  touched(): void {
    this.zone.run(() => this.onTouched());
  }
}
