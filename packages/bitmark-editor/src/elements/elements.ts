// @awa-component: PLAN-021-Elements
import type { Feature } from '../engine/types';
import { log } from '../log';
import type { Monaco } from '../monaco/types';
import {
  createBitmarkPane,
  createHtmlPane,
  createInfoPane,
  createJsonPane,
  createMappingsPane,
  createTextPane,
  createXmlPane,
} from '../panes/panes';
import { createEchoGuard } from '../session/echoGuard';
import { createBitmarkSession } from '../session/session';
import type { BitmarkPane, BitmarkSession, EngineSource, PaneType } from '../session/types';
import type { BitmarkTheme } from '../theme/applyTheme';
import { getDefaultEngine, loadDefaultMonaco } from './defaults';

/** Fired on a session element when its session exists, for its panes (bubbles). */
const SESSION_READY = 'bitmark-session-connected';
/** Fired on `document` when a session element's session is disposed (detail: the element). */
const SESSION_DISPOSED = 'bitmark-session-disposed';

export const ELEMENTS_CSS = `
bitmark-session,bitmark-editor{display:block}
bitmark-pane{display:block;min-height:0;min-width:0;height:100%}
bitmark-pane[inactive]{display:none}
bitmark-split{display:flex;gap:var(--bm-split-gap,4px);height:100%;min-height:0}
bitmark-split[direction="column"],bitmark-split[data-stacked]{flex-direction:column}
bitmark-split>*{flex:1 1 0;min-width:0;min-height:0}
bitmark-tabs{display:flex;flex-direction:column;height:100%;min-height:0}
bitmark-tabs>bitmark-pane{flex:1 1 auto}
.bm-tablist{display:flex;flex:0 0 auto;gap:2px;font:13px/1.6 system-ui,sans-serif}
.bm-tab{border:0;background:var(--bm-tab-bg,transparent);color:var(--bm-tab-fg,inherit);padding:2px 10px;cursor:pointer;border-bottom:2px solid transparent}
.bm-tab[aria-selected="true"]{border-bottom-color:var(--bm-tab-accent,#7dc13a);color:var(--bm-tab-active-fg,inherit)}
bitmark-session[data-state="ready"] [data-bitmark-static]{display:none}
bitmark-session:not([data-state="ready"]) bitmark-pane,bitmark-session:not([data-state="ready"]) bitmark-tabs,bitmark-session:not([data-state="ready"]) bitmark-split{display:none}
`;

const injectElementsCss = () => {
  if (document.querySelector('style[data-bitmark-elements]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-bitmark-elements', '');
  style.textContent = ELEMENTS_CSS;
  document.head.appendChild(style);
};

/** A coarse pointer and a narrow viewport (both: a tablet with a keyboard keeps the editor, D12). */
export const isNarrowTouch = (): boolean =>
  typeof matchMedia === 'function' &&
  matchMedia('(pointer: coarse) and (max-width: 700px)').matches;

/**
 * A property set on the element before it was defined is an own property
 * that hides the class's accessor: take it over (the custom elements
 * "upgrade" pattern). Hosts often set `engine` / `monaco` first.
 */
const upgradeProperties = (el: HTMLElement, names: string[]) => {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(el, name)) {
      const value = (el as unknown as Record<string, unknown>)[name];
      delete (el as unknown as Record<string, unknown>)[name];
      (el as unknown as Record<string, unknown>)[name] = value;
    }
  }
};

/** Run `fn` unless the element is reconnected first (a DOM move is not a removal). */
const afterDisconnect = (el: Element, fn: () => void) =>
  queueMicrotask(() => {
    if (!el.isConnected) fn();
  });

export type LazyMode = 'none' | 'idle' | 'click' | 'focus' | 'visible';
export type NarrowMode = 'edit' | 'readonly' | 'static';

/**
 * Define the elements (idempotent). Kept in a function so that importing
 * the module never touches `HTMLElement` during server rendering.
 */
// @awa-impl: PLAN-021-Step12 (the custom elements)
export const defineBitmarkElements = (): void => {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  if (customElements.get('bitmark-session')) return;

  /** `<bitmark-session>`: one document; renders nothing itself. */
  class BitmarkSessionElement extends HTMLElement {
    static observedAttributes = ['value', 'theme'];
    #session: BitmarkSession | undefined;
    #starting = false;
    /** +1 per start and per removal: a start that is no longer current gives up (no second session). */
    #generation = 0;
    #monaco: Monaco | undefined;
    #engine: EngineSource | undefined;
    #pendingValue: string | undefined;
    #cleanups: (() => void)[] = [];
    /** The session's recent reports: a `value` attribute among them is an echo. */
    #echo = createEchoGuard();
    /** True when narrow screens get read-only panes (D12). */
    forceReadOnly = false;

    get session(): BitmarkSession | undefined {
      return this.#session;
    }
    get monaco(): Monaco | undefined {
      return this.#monaco;
    }
    set monaco(m: Monaco | undefined) {
      this.#monaco = m;
    }
    get engine(): EngineSource | undefined {
      return this.#engine;
    }
    set engine(e: EngineSource | undefined) {
      this.#engine = e;
    }
    get value(): string {
      return this.#session?.getBitmark() ?? this.#pendingValue ?? this.getAttribute('value') ?? '';
    }
    set value(v: string) {
      if (this.#session) this.#session.setBitmark(v);
      else this.#pendingValue = v;
    }
    /** The document as JSON text. */
    getJson(options?: { mode?: 'optimized' | 'full' }): Promise<string> | undefined {
      return this.#session?.getJson(options);
    }

    connectedCallback() {
      injectElementsCss();
      upgradeProperties(this, ['monaco', 'engine', 'value']);
      if (this.#session || this.#starting) return;
      const narrow = (this.getAttribute('narrow') ?? 'edit') as NarrowMode;
      if (narrow !== 'edit' && isNarrowTouch()) {
        if (narrow === 'static') {
          this.dataset.state = 'static';
          return;
        }
        this.forceReadOnly = true;
      }
      this.#waitFor((this.getAttribute('lazy') ?? 'none') as LazyMode);
    }

    disconnectedCallback() {
      afterDisconnect(this, () => {
        this.#generation++;
        for (const c of this.#cleanups.splice(0)) c();
        const had = !!this.#session;
        this.#session?.dispose();
        this.#session = undefined;
        this.#starting = false;
        delete this.dataset.state;
        // Panes bound to this session by id (elsewhere in the page) forget it.
        if (had) document.dispatchEvent(new CustomEvent(SESSION_DISPOSED, { detail: this }));
      });
    }

    attributeChangedCallback(name: string, _old: string | null, value: string | null) {
      if (!this.#session) return;
      if (
        name === 'value' &&
        value !== null &&
        !this.#echo.isEcho(value) &&
        value !== this.#session.getBitmark()
      )
        this.#session.setBitmark(value);
      if (name === 'theme' && value) this.#session.setTheme(value as BitmarkTheme);
    }

    /** Start now, whatever `lazy` says. */
    start(): Promise<void> {
      return this.#start();
    }

    #waitFor(lazy: LazyMode) {
      const go = () => void this.#start();
      if (lazy === 'none') return go();
      this.dataset.state = 'waiting';
      if (lazy === 'idle') {
        const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: object) => number })
          .requestIdleCallback;
        if (ric) ric(go, { timeout: 2000 });
        else setTimeout(go, 1);
      } else if (lazy === 'click' || lazy === 'focus') {
        const type = lazy === 'click' ? 'click' : 'focusin';
        const once = () => {
          this.removeEventListener(type, once);
          go();
        };
        this.addEventListener(type, once);
        this.#cleanups.push(() => this.removeEventListener(type, once));
      } else if (lazy === 'visible') {
        if (typeof IntersectionObserver === 'undefined') return go();
        const io = new IntersectionObserver((entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io.disconnect();
            go();
          }
        });
        io.observe(this);
        this.#cleanups.push(() => io.disconnect());
      }
    }

    async #start() {
      if (this.#session || this.#starting) return;
      this.#starting = true;
      const generation = ++this.#generation;
      const current = () => generation === this.#generation && this.isConnected && !this.#session;
      this.dataset.state = 'loading';
      try {
        const monaco = this.#monaco ?? (await loadDefaultMonaco());
        if (!current()) return;
        if (!monaco) {
          throw new Error(
            'no Monaco: set the element’s `monaco` property, or import @gmb/bitmark-editor/bundled',
          );
        }
        const session = createBitmarkSession({
          monaco,
          engine: this.#engineSource(),
          value: this.#pendingValue ?? this.getAttribute('value') ?? '',
          debounceMs: Number(this.getAttribute('debounce') ?? 0) || 0,
          theme: (this.getAttribute('theme') as BitmarkTheme | null) ?? undefined,
          applyMonacoTheme: this.hasAttribute('apply-monaco-theme'),
          schema:
            this.getAttribute('schema') === 'off'
              ? false
              : (this.getAttribute('schema') ?? undefined),
        });
        this.#session = session;
        this.#cleanups.push(
          session.on('change', (e) => {
            this.#echo.remember(e.bitmark);
            this.dispatchEvent(new CustomEvent('change', { detail: e, bubbles: true }));
          }),
          session.on('error', (e) =>
            this.dispatchEvent(new CustomEvent('error', { detail: e, bubbles: true })),
          ),
          session.on('ready', (e) =>
            this.dispatchEvent(new CustomEvent('ready', { detail: e, bubbles: true })),
          ),
        );
        this.dataset.state = 'ready';
        this.dispatchEvent(new CustomEvent(SESSION_READY, { bubbles: true }));
      } catch (e) {
        if (generation !== this.#generation) return;
        this.#starting = false;
        // Progressive enhancement: the static content stays (D12).
        delete this.dataset.state;
        log.error(e);
        this.dispatchEvent(
          new CustomEvent('error', { detail: { error: e, pane: undefined }, bubbles: true }),
        );
      }
    }

    #engineSource(): EngineSource | undefined {
      if (this.#engine) return this.#engine;
      const url = this.getAttribute('engine-url') ?? undefined;
      const version = this.getAttribute('engine-version') ?? undefined;
      const feature = (this.getAttribute('engine-feature') as Feature | null) ?? undefined;
      if (url || version || feature) return { url, version, feature };
      return getDefaultEngine();
    }
  }

  /** `<bitmark-pane type="…">`: one pane of the nearest (or named) session. */
  class BitmarkPaneElement extends HTMLElement {
    static observedAttributes = [
      'type',
      'mode',
      'mapping',
      'label',
      'readonly',
      'scroll-sync',
      'inactive',
      'session',
    ];
    #pane: BitmarkPane | undefined;
    #sessionEl: BitmarkSessionElement | undefined;
    #listening = false;
    #onReady = (e: Event) => {
      const target = e.target as BitmarkSessionElement;
      if (this.#findSession() === target) this.#mount();
    };
    /** The session went away (and disposed this pane): mount again when it restarts. */
    #onDisposed = (e: Event) => {
      if ((e as CustomEvent).detail !== this.#sessionEl) return;
      this.#pane = undefined;
      this.#sessionEl = undefined;
    };

    get pane(): BitmarkPane | undefined {
      return this.#pane;
    }

    connectedCallback() {
      injectElementsCss();
      this.#mount();
      if (!this.#listening) {
        // Late binding: the session may start (or appear) after this pane.
        document.addEventListener(SESSION_READY, this.#onReady);
        document.addEventListener(SESSION_DISPOSED, this.#onDisposed);
        this.#listening = true;
      }
    }

    disconnectedCallback() {
      afterDisconnect(this, () => {
        document.removeEventListener(SESSION_READY, this.#onReady);
        document.removeEventListener(SESSION_DISPOSED, this.#onDisposed);
        this.#listening = false;
        this.#unmount();
      });
    }

    attributeChangedCallback(name: string, old: string | null, value: string | null) {
      if (old === value || !this.isConnected) return;
      if (name === 'readonly') {
        this.#pane?.setReadOnly(value !== null || !!this.#sessionEl?.forceReadOnly);
      } else if (name === 'scroll-sync') {
        this.#pane?.setScrollSync(value !== 'off');
      } else {
        // type, mode, mapping, label, inactive, session: a different pane.
        this.#unmount();
        this.#mount();
      }
    }

    #findSession(): BitmarkSessionElement | undefined {
      const id = this.getAttribute('session');
      const el = id ? document.getElementById(id) : this.closest('bitmark-session');
      return el instanceof BitmarkSessionElement ? el : undefined;
    }

    #mount() {
      if (this.#pane || this.hasAttribute('inactive')) return;
      const sessionEl = this.#findSession();
      const session = sessionEl?.session;
      if (!sessionEl || !session) return;
      this.#sessionEl = sessionEl;
      const type = (this.getAttribute('type') ?? 'bitmark') as PaneType;
      const options = {
        readOnly: this.hasAttribute('readonly') || sessionEl.forceReadOnly,
        scrollSync:
          this.getAttribute('scroll-sync') === null
            ? undefined
            : this.getAttribute('scroll-sync') !== 'off',
        label: this.getAttribute('label') ?? undefined,
      };
      const create = {
        bitmark: () => createBitmarkPane(this, session, options),
        json: () =>
          createJsonPane(this, session, {
            ...options,
            mode: (this.getAttribute('mode') ?? undefined) as 'optimized' | 'full' | undefined,
          }),
        html: () => createHtmlPane(this, session, options),
        xml: () =>
          createXmlPane(this, session, {
            ...options,
            mapping: this.getAttribute('mapping') ?? 'xml-niso-iec',
          }),
        text: () => createTextPane(this, session, options),
        info: () => createInfoPane(this, session, options),
        mappings: () => createMappingsPane(this, session, options),
      }[type];
      if (!create) {
        log.warn(`unknown pane type "${type}"`);
        return;
      }
      this.#pane = create();
      // The host sizes the pane (D9): say so once if it has no height.
      globalThis.requestAnimationFrame?.(() => {
        if (
          this.#pane &&
          this.isConnected &&
          this.clientHeight === 0 &&
          !this.hasAttribute('inactive')
        ) {
          log.warnOnce(
            'pane-height-0',
            'a <bitmark-pane> has no height: give it (or its container) one',
          );
        }
      });
    }

    #unmount() {
      this.#pane?.dispose();
      this.#pane = undefined;
    }
  }

  /** `<bitmark-tabs>`: a tab strip over its child panes; only the active one is mounted. */
  class BitmarkTabsElement extends HTMLElement {
    static observedAttributes = ['active'];
    #list = document.createElement('div');
    #observer: MutationObserver | undefined;

    get panes(): BitmarkPaneElement[] {
      return [...this.children].filter(
        (c): c is BitmarkPaneElement => c instanceof BitmarkPaneElement,
      );
    }
    get active(): number {
      return Math.min(
        Math.max(0, Number(this.getAttribute('active') ?? 0) || 0),
        Math.max(0, this.panes.length - 1),
      );
    }
    set active(i: number) {
      this.setAttribute('active', String(i));
    }

    connectedCallback() {
      injectElementsCss();
      this.#list.className = 'bm-tablist';
      this.#list.setAttribute('role', 'tablist');
      if (this.#list.parentNode !== this) this.prepend(this.#list);
      this.#observer ??= new MutationObserver(() => this.#render());
      this.#observer.observe(this, { childList: true });
      this.#render();
    }

    disconnectedCallback() {
      this.#observer?.disconnect();
    }

    attributeChangedCallback() {
      this.#render();
    }

    #label(pane: Element): string {
      const type = (pane.getAttribute('type') ?? 'bitmark') as PaneType;
      const session = pane.closest('bitmark-session') as BitmarkSessionElement | null;
      const labels = session?.session?.messages.labels;
      const mapping = pane.getAttribute('mapping');
      return (
        pane.getAttribute('label') ??
        (labels?.[type] ?? type) + (type === 'xml' && mapping ? ` (${mapping})` : '')
      );
    }

    #render() {
      const panes = this.panes;
      const active = this.active;
      this.#list.replaceChildren(
        ...panes.map((pane, i) => {
          const tab = document.createElement('button');
          tab.type = 'button';
          tab.className = 'bm-tab';
          tab.setAttribute('role', 'tab');
          tab.setAttribute('aria-selected', String(i === active));
          tab.tabIndex = i === active ? 0 : -1;
          tab.textContent = this.#label(pane);
          tab.addEventListener('click', () => this.#select(i));
          tab.addEventListener('keydown', (e) => this.#key(e, i));
          return tab;
        }),
      );
      panes.forEach((pane, i) => {
        pane.setAttribute('role', 'tabpanel');
        if (i === active) pane.removeAttribute('inactive');
        else pane.setAttribute('inactive', '');
      });
    }

    #select(i: number) {
      if (i === this.active) return;
      this.active = i;
      this.dispatchEvent(new CustomEvent('tab-change', { detail: { index: i }, bubbles: true }));
    }

    // WAI-ARIA tabs: arrows move between tabs, Home / End to the ends (D16).
    #key(e: KeyboardEvent, i: number) {
      const n = this.panes.length;
      const next =
        e.key === 'ArrowRight'
          ? (i + 1) % n
          : e.key === 'ArrowLeft'
            ? (i - 1 + n) % n
            : e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? n - 1
                : -1;
      if (next < 0) return;
      e.preventDefault();
      this.#select(next);
      (this.#list.children[next] as HTMLElement | undefined)?.focus();
    }
  }

  /** `<bitmark-split direction="row|column|auto">`: two (or more) children side by side or stacked. */
  class BitmarkSplitElement extends HTMLElement {
    #ro: ResizeObserver | undefined;
    connectedCallback() {
      injectElementsCss();
      if (
        (this.getAttribute('direction') ?? 'auto') !== 'auto' ||
        typeof ResizeObserver === 'undefined'
      )
        return;
      this.#ro = new ResizeObserver(() => {
        const below = Number(this.getAttribute('stack-below') ?? 700);
        this.toggleAttribute('data-stacked', this.clientWidth > 0 && this.clientWidth < below);
      });
      this.#ro.observe(this);
    }
    disconnectedCallback() {
      this.#ro?.disconnect();
    }
  }

  /**
   * `<bitmark-editor>`: the playground arrangement in one tag — a session,
   * the bitmark pane beside tabs over the chosen panes (default `json`).
   * `panes="json,html,xml:xml-niso-iec,text"`.
   */
  class BitmarkEditorElement extends HTMLElement {
    static FORWARDED = [
      'value',
      'engine-url',
      'engine-version',
      'engine-feature',
      'theme',
      'lazy',
      'narrow',
      'debounce',
      'schema',
      'apply-monaco-theme',
    ];
    static observedAttributes = [...BitmarkEditorElement.FORWARDED, 'panes'];
    #session: BitmarkSessionElement | undefined;
    #tabs: HTMLElement | undefined;
    /** Properties set before the parts exist; handed over when they are built. */
    #props: { monaco?: Monaco; engine?: EngineSource; value?: string } = {};

    get sessionElement(): BitmarkSessionElement | undefined {
      return this.#session;
    }
    get monaco(): Monaco | undefined {
      return this.#session?.monaco ?? this.#props.monaco;
    }
    set monaco(m: Monaco | undefined) {
      if (this.#session) this.#session.monaco = m;
      else this.#props.monaco = m;
    }
    get engine(): EngineSource | undefined {
      return this.#session?.engine ?? this.#props.engine;
    }
    set engine(e: EngineSource | undefined) {
      if (this.#session) this.#session.engine = e;
      else this.#props.engine = e;
    }
    get value(): string {
      return this.#session?.value ?? this.#props.value ?? this.getAttribute('value') ?? '';
    }
    set value(v: string) {
      if (this.#session) this.#session.value = v;
      else this.#props.value = v;
    }

    connectedCallback() {
      injectElementsCss();
      upgradeProperties(this, ['monaco', 'engine', 'value']);
      // Defined before the page finished parsing: wait for the children (the
      // static content) to exist before taking them in.
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.isConnected && this.#build(), {
          once: true,
        });
      } else {
        this.#build();
      }
    }

    attributeChangedCallback(name: string, old: string | null, value: string | null) {
      if (old === value || !this.#session) return;
      if (name === 'panes') {
        this.#fillTabs();
        return;
      }
      if (value === null) this.#session.removeAttribute(name);
      else this.#session.setAttribute(name, value);
    }

    #fillTabs() {
      const tabs = this.#tabs!;
      tabs.querySelectorAll(':scope > bitmark-pane').forEach((p) => p.remove());
      for (const spec of (this.getAttribute('panes') ?? 'json')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)) {
        const [type, arg] = spec.split(':');
        const pane = document.createElement('bitmark-pane');
        pane.setAttribute('type', type!);
        if (type === 'xml') pane.setAttribute('mapping', arg ?? 'xml-niso-iec');
        if (type === 'json' && arg) pane.setAttribute('mode', arg);
        tabs.append(pane);
      }
    }

    #build(): void {
      if (this.#session) return;
      const session = document.createElement('bitmark-session') as BitmarkSessionElement;
      for (const name of BitmarkEditorElement.FORWARDED) {
        const v = this.getAttribute(name);
        if (v !== null) session.setAttribute(name, v);
      }
      if (this.#props.monaco) session.monaco = this.#props.monaco;
      if (this.#props.engine) session.engine = this.#props.engine;
      if (this.#props.value !== undefined) session.value = this.#props.value;
      session.style.height = '100%';
      const split = document.createElement('bitmark-split');
      const bitmark = document.createElement('bitmark-pane');
      bitmark.setAttribute('type', 'bitmark');
      this.#tabs = document.createElement('bitmark-tabs');
      split.append(bitmark, this.#tabs);
      // Static content the host put inside stays as the pre-load view (D12).
      for (const child of [...this.children]) {
        child.setAttribute('data-bitmark-static', '');
        session.append(child);
      }
      session.append(split);
      this.#session = session;
      this.#fillTabs();
      this.append(session);
    }
  }

  customElements.define('bitmark-session', BitmarkSessionElement);
  customElements.define('bitmark-pane', BitmarkPaneElement);
  customElements.define('bitmark-tabs', BitmarkTabsElement);
  customElements.define('bitmark-split', BitmarkSplitElement);
  customElements.define('bitmark-editor', BitmarkEditorElement);
};

/** The element types, for hosts that want them (after `defineBitmarkElements`). */
export interface BitmarkSessionElementApi extends HTMLElement {
  readonly session: BitmarkSession | undefined;
  monaco: Monaco | undefined;
  engine: EngineSource | undefined;
  value: string;
  getJson(options?: { mode?: 'optimized' | 'full' }): Promise<string> | undefined;
  start(): Promise<void>;
}
export interface BitmarkPaneElementApi extends HTMLElement {
  readonly pane: BitmarkPane | undefined;
}
