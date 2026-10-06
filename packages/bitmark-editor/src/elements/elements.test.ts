import * as parser from '@gmb/bitmark-parser';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createBitmarkEngine } from '../engine/createBitmarkEngine';
import type { BitmarkEngine, RawParserModule } from '../engine/types';
import { createFakeMonaco, FakeModel } from '../testing/fakeMonaco';
import { setMonacoLoader } from './defaults';
import { BitmarkPaneElementApi, BitmarkSessionElementApi, defineBitmarkElements } from './elements';

let engine: BitmarkEngine;
beforeAll(async () => {
  await parser.init({ feature: 'full' });
  engine = createBitmarkEngine(parser as unknown as RawParserModule, { feature: 'full' });
  defineBitmarkElements();
});

afterEach(() => {
  document.body.replaceChildren();
});

const DOC = '[.article]\nHello **World**!';

/** A session element with the fake Monaco and the real engine, from HTML. */
const mount = (html: string, sessionSelector = 'bitmark-session') => {
  const fake = createFakeMonaco();
  const host = document.createElement('div');
  host.innerHTML = html;
  for (const s of host.querySelectorAll<BitmarkSessionElementApi>(sessionSelector)) {
    s.monaco = fake.monaco;
    s.engine = engine;
  }
  document.body.append(host);
  return { fake, host };
};
const paneText = (el: Element | null) =>
  (el as BitmarkPaneElementApi).pane?.textEditor.getValue() ?? '';
const type = (el: Element | null, value: string) =>
  ((el as BitmarkPaneElementApi).pane!.textEditor.model as FakeModel).setText(value);

describe('<bitmark-session> and <bitmark-pane> (PLAN-020 D3, D9)', () => {
  // @awa-test: PLAN-021-Step12 (panes bind to their nearest session and mount)
  it('mounts panes inside their session and keeps them in sync', async () => {
    const { host } = mount(`<bitmark-session value="${DOC}" schema="off">
      <bitmark-pane type="bitmark"></bitmark-pane><bitmark-pane type="json"></bitmark-pane></bitmark-session>`);
    const [bitmark, json] = host.querySelectorAll('bitmark-pane');
    await vi.waitFor(() => expect(paneText(json!)).toContain('World'));
    expect(paneText(bitmark!)).toBe(DOC);
    const changes = vi.fn();
    host.querySelector('bitmark-session')!.addEventListener('change', changes);
    type(bitmark!, '[.article]\nTyped');
    await vi.waitFor(() => expect(paneText(json!)).toContain('Typed'));
    expect(changes).toHaveBeenCalled();
    expect((host.querySelector('bitmark-session') as BitmarkSessionElementApi).value).toBe(
      '[.article]\nTyped',
    );
  });

  // @awa-test: PLAN-021-Step12 (binding by id, and late binding)
  it('binds a pane elsewhere in the page by session id, even before the session starts', async () => {
    const { host } = mount(`<bitmark-pane type="json" session="doc"></bitmark-pane>
      <div><bitmark-session id="doc" value="${DOC}" schema="off" lazy="click"></bitmark-session></div>`);
    const pane = host.querySelector('bitmark-pane')!;
    expect((pane as BitmarkPaneElementApi).pane).toBeUndefined();
    (host.querySelector('bitmark-session') as HTMLElement).click();
    await vi.waitFor(() => expect(paneText(pane)).toContain('World'));
  });

  // @awa-test: PLAN-021-Step12 (attributes map to options and toggle at runtime)
  it('switches readonly and scroll-sync at runtime, and remounts on a type change', async () => {
    const { host } = mount(`<bitmark-session value="${DOC}" schema="off">
      <bitmark-pane type="bitmark"></bitmark-pane><bitmark-pane type="json" readonly scroll-sync="off"></bitmark-pane></bitmark-session>`);
    const json = host.querySelectorAll('bitmark-pane')[1] as BitmarkPaneElementApi;
    await vi.waitFor(() => expect(paneText(json)).toContain('World'));
    expect(json.pane!.readOnly).toBe(true);
    expect(json.pane!.scrollSync).toBe(false);
    json.removeAttribute('readonly');
    json.setAttribute('scroll-sync', 'on');
    expect(json.pane!.readOnly).toBe(false);
    expect(json.pane!.scrollSync).toBe(true);
    json.setAttribute('type', 'text');
    await vi.waitFor(() => expect(json.pane!.type).toBe('text'));
    await vi.waitFor(() => expect(paneText(json)).toContain('Hello World!'));
  });

  // @awa-test: PLAN-021-Step12 (disconnect disposes; a DOM move does not)
  it('disposes on removal, but survives a move in the DOM', async () => {
    const { host } = mount(
      `<bitmark-session value="${DOC}" schema="off"><bitmark-pane type="json"></bitmark-pane></bitmark-session>`,
    );
    const session = host.querySelector('bitmark-session') as BitmarkSessionElementApi;
    const pane = host.querySelector('bitmark-pane') as BitmarkPaneElementApi;
    await vi.waitFor(() => expect(paneText(pane)).toContain('World'));
    const before = pane.pane;
    const other = document.createElement('div');
    document.body.append(other);
    other.append(session);
    await Promise.resolve();
    expect(pane.pane).toBe(before);
    session.remove();
    await Promise.resolve();
    await Promise.resolve();
    expect(session.session).toBeUndefined();
    expect(pane.pane).toBeUndefined();
  });

  // @awa-test: PLAN-021-Step12 (the events fire: ready, change, error)
  it('fires ready, change and error', async () => {
    const { host } = mount(`<bitmark-session value="${DOC}" schema="off">
      <bitmark-pane type="bitmark"></bitmark-pane><bitmark-pane type="json"></bitmark-pane></bitmark-session>`);
    const session = host.querySelector('bitmark-session')!;
    const ready = vi.fn();
    const error = vi.fn();
    session.addEventListener('ready', ready);
    session.addEventListener('error', error);
    const json = host.querySelectorAll('bitmark-pane')[1]!;
    await vi.waitFor(() => expect(ready).toHaveBeenCalled());
    await vi.waitFor(() => expect(paneText(json)).toContain('World'));
    type(json, '{oops');
    await vi.waitFor(() => expect(error).toHaveBeenCalled());
  });

  // @awa-test: PLAN-021-Step15b (lazy: nothing before the trigger; static content until mount)
  it('loads nothing before its lazy trigger, and shows the static content until then', async () => {
    const loader = vi.fn(async () => createFakeMonaco().monaco);
    setMonacoLoader(loader);
    const host = document.createElement('div');
    host.innerHTML = `<bitmark-session lazy="click" value="${DOC}" schema="off">
      <pre data-bitmark-static>static</pre><bitmark-pane type="json"></bitmark-pane></bitmark-session>`;
    const session = host.querySelector('bitmark-session') as BitmarkSessionElementApi;
    session.engine = engine;
    document.body.append(host);
    await new Promise((r) => setTimeout(r, 10));
    expect(loader).not.toHaveBeenCalled();
    expect(session.dataset.state).toBe('waiting');
    session.click();
    await vi.waitFor(() => expect(session.dataset.state).toBe('ready'));
    expect(loader).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(paneText(host.querySelector('bitmark-pane'))).toContain('World'));
  });

  // @awa-test: PLAN-021-Step15b (no Monaco: an error, and the static content stays)
  it('reports a missing Monaco and stays static', async () => {
    setMonacoLoader(undefined as never);
    const host = document.createElement('div');
    host.innerHTML = `<bitmark-session schema="off"><pre data-bitmark-static>static</pre></bitmark-session>`;
    const session = host.querySelector('bitmark-session')!;
    const error = vi.fn();
    session.addEventListener('error', error);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    document.body.append(host);
    await vi.waitFor(() => expect(error).toHaveBeenCalled());
    expect((session as HTMLElement).dataset.state).toBeUndefined();
    vi.restoreAllMocks();
  });

  // @awa-test: PLAN-021-Step15b (narrow="static" on a coarse pointer and narrow viewport)
  it('stays static on a narrow touch screen with narrow="static", and goes read-only with "readonly"', async () => {
    // jsdom has no matchMedia: a coarse pointer and a narrow viewport.
    const original = window.matchMedia;
    window.matchMedia = vi.fn(() => ({ matches: true }) as MediaQueryList);
    const a = mount(
      `<bitmark-session narrow="static" value="${DOC}" schema="off"><bitmark-pane type="json"></bitmark-pane></bitmark-session>`,
    );
    await new Promise((r) => setTimeout(r, 10));
    expect((a.host.querySelector('bitmark-session') as HTMLElement).dataset.state).toBe('static');
    expect((a.host.querySelector('bitmark-pane') as BitmarkPaneElementApi).pane).toBeUndefined();
    const b = mount(
      `<bitmark-session narrow="readonly" value="${DOC}" schema="off"><bitmark-pane type="json"></bitmark-pane></bitmark-session>`,
    );
    const pane = b.host.querySelector('bitmark-pane') as BitmarkPaneElementApi;
    await vi.waitFor(() => expect(pane.pane).toBeDefined());
    expect(pane.pane!.readOnly).toBe(true);
    window.matchMedia = original;
  });
});

describe('<bitmark-tabs>, <bitmark-split> and <bitmark-editor>', () => {
  // @awa-test: PLAN-021-Step12 (tabs mount only the active pane; WAI-ARIA keys)
  it('mounts only the active tab, switches on click and arrow keys', async () => {
    const { host } = mount(`<bitmark-session value="${DOC}" schema="off"><bitmark-tabs>
      <bitmark-pane type="json"></bitmark-pane><bitmark-pane type="text"></bitmark-pane></bitmark-tabs></bitmark-session>`);
    const [json, txt] = host.querySelectorAll<BitmarkPaneElementApi>('bitmark-pane');
    await vi.waitFor(() => expect(json!.pane).toBeDefined());
    expect(txt!.pane).toBeUndefined();
    const tabs = host.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    expect([...tabs].map((t) => t.textContent)).toEqual(['JSON', 'Text']);
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    tabs[1]!.click();
    await vi.waitFor(() => expect(txt!.pane).toBeDefined());
    expect(json!.pane).toBeUndefined();
    host
      .querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await vi.waitFor(() => expect(json!.pane).toBeDefined());
  });

  // @awa-test: PLAN-021-Step12 (the preset builds the playground arrangement)
  it('builds session, split, bitmark pane and tabs from <bitmark-editor panes="…">', async () => {
    const fake = createFakeMonaco();
    const host = document.createElement('div');
    host.innerHTML = `<bitmark-editor value="${DOC}" schema="off" panes="json,html,xml:xml-niso-iec"><pre>static</pre></bitmark-editor>`;
    const editor = host.querySelector('bitmark-editor') as HTMLElement & {
      monaco: unknown;
      engine: unknown;
    };
    editor.monaco = fake.monaco;
    editor.engine = engine;
    document.body.append(host);
    const panes = [...host.querySelectorAll('bitmark-pane')].map((p) => [
      p.getAttribute('type'),
      p.getAttribute('mapping'),
    ]);
    expect(panes).toEqual([
      ['bitmark', null],
      ['json', null],
      ['html', null],
      ['xml', 'xml-niso-iec'],
    ]);
    expect(host.querySelector('pre')!.hasAttribute('data-bitmark-static')).toBe(true);
    await vi.waitFor(() =>
      expect(paneText(host.querySelectorAll('bitmark-pane')[1]!)).toContain('World'),
    );
  });

  it('splits in a row or a column', () => {
    const split = document.createElement('bitmark-split');
    split.setAttribute('direction', 'column');
    document.body.append(split);
    expect(document.querySelector('style[data-bitmark-elements]')!.textContent).toContain(
      'bitmark-split[direction="column"]',
    );
  });
});

describe('properties set before the elements are defined', () => {
  // @awa-test: PLAN-021-Step12 (the upgrade pattern: engine / monaco set first)
  it('takes over engine and monaco set on an element before its upgrade', async () => {
    const { monaco } = createFakeMonaco();
    const host = document.createElement('div');
    host.innerHTML = `<bitmark-session value="${DOC}" schema="off"><bitmark-pane type="json"></bitmark-pane></bitmark-session>`;
    const real = host.querySelector('bitmark-session') as BitmarkSessionElementApi;
    // Own properties shadowing the accessors, as an early host script leaves them.
    Object.defineProperty(real, 'engine', {
      value: engine,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    Object.defineProperty(real, 'monaco', {
      value: monaco,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    document.body.append(host);
    await vi.waitFor(() => expect(paneText(host.querySelector('bitmark-pane'))).toContain('World'));
    expect(Object.prototype.hasOwnProperty.call(real, 'engine')).toBe(false);
  });
});
