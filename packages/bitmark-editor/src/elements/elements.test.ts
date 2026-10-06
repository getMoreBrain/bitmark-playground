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

describe('<bitmark-session> and <bitmark-pane> (PLAN-022 D3, D9)', () => {
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

  it('binds a pane elsewhere in the page by session id, even before the session starts', async () => {
    const { host } = mount(`<bitmark-pane type="json" session="doc"></bitmark-pane>
      <div><bitmark-session id="doc" value="${DOC}" schema="off" lazy="click"></bitmark-session></div>`);
    const pane = host.querySelector('bitmark-pane')!;
    expect((pane as BitmarkPaneElementApi).pane).toBeUndefined();
    (host.querySelector('bitmark-session') as HTMLElement).click();
    await vi.waitFor(() => expect(paneText(pane)).toContain('World'));
  });

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

  it('sets the theme of its own Monaco, at start and on a theme change, and never a host one', async () => {
    const own = createFakeMonaco();
    setMonacoLoader(async () => own.monaco, { own: true });
    const host = document.createElement('div');
    host.innerHTML = `<bitmark-session theme="light" value="${DOC}" schema="off"><bitmark-pane type="json"></bitmark-pane></bitmark-session>`;
    const session = host.querySelector('bitmark-session') as BitmarkSessionElementApi;
    session.engine = engine;
    document.body.append(host);
    await vi.waitFor(() => expect(session.dataset.state).toBe('ready'));
    expect(own.setTheme).toHaveBeenCalled();
    const before = own.setTheme.mock.calls.length;
    session.setAttribute('theme', 'dark');
    expect(own.setTheme.mock.calls.length).toBeGreaterThan(before);
    expect(own.setTheme.mock.calls.at(-1)![0]).not.toBe(own.setTheme.mock.calls[before - 1]![0]);
    host.remove();

    const hostMonaco = createFakeMonaco();
    setMonacoLoader(async () => hostMonaco.monaco);
    const other = document.createElement('div');
    other.innerHTML = `<bitmark-session theme="light" value="${DOC}" schema="off"><bitmark-pane type="json"></bitmark-pane></bitmark-session>`;
    const second = other.querySelector('bitmark-session') as BitmarkSessionElementApi;
    second.engine = engine;
    document.body.append(other);
    await vi.waitFor(() => expect(second.dataset.state).toBe('ready'));
    second.setAttribute('theme', 'dark');
    expect(hostMonaco.setTheme).not.toHaveBeenCalled();
    other.remove();

    // A theme first given after the start still reaches the package's Monaco.
    const late = createFakeMonaco();
    setMonacoLoader(async () => late.monaco, { own: true });
    const third = document.createElement('div');
    third.innerHTML = `<bitmark-session value="${DOC}" schema="off"><bitmark-pane type="json"></bitmark-pane></bitmark-session>`;
    const lateSession = third.querySelector('bitmark-session') as BitmarkSessionElementApi;
    lateSession.engine = engine;
    document.body.append(third);
    await vi.waitFor(() => expect(lateSession.dataset.state).toBe('ready'));
    expect(late.setTheme).not.toHaveBeenCalled();
    lateSession.setAttribute('theme', 'light');
    expect(late.setTheme).toHaveBeenLastCalledWith('vs');
    third.remove();
    setMonacoLoader(undefined as never);
  });

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

  it('passes messages set before its upgrade to the session', async () => {
    const { monaco } = createFakeMonaco();
    const host = document.createElement('div');
    host.innerHTML = `<bitmark-session value="${DOC}" schema="off"><bitmark-pane type="json"></bitmark-pane></bitmark-session>`;
    const real = host.querySelector('bitmark-session') as BitmarkSessionElementApi & {
      messages?: unknown;
    };
    Object.defineProperty(real, 'messages', {
      value: { errorPrefix: 'Fehler: ', labels: { json: 'JSON (de)' } },
      writable: true,
      configurable: true,
      enumerable: true,
    });
    real.engine = engine;
    real.monaco = monaco;
    document.body.append(host);
    await vi.waitFor(() => expect(real.session).toBeDefined());
    expect(real.session!.messages.errorPrefix).toBe('Fehler: ');
    expect(real.session!.messages.labels.json).toBe('JSON (de)');
    // The rest keep their defaults.
    expect(real.session!.messages.labels.bitmark).toBeTruthy();
  });
});

describe('element lifecycle (PLAN-023 pass 1)', () => {
  it('creates one session when removed and re-inserted while Monaco is still loading', async () => {
    let release!: () => void;
    setMonacoLoader(async () => {
      await new Promise<void>((r) => (release = r));
      return createFakeMonaco().monaco;
    });
    const host = document.createElement('div');
    host.innerHTML = `<bitmark-session value="${DOC}" schema="off"></bitmark-session>`;
    const session = host.querySelector('bitmark-session') as BitmarkSessionElementApi;
    session.engine = engine;
    // One `ready` event per session created.
    const ready = vi.fn();
    session.addEventListener('ready', ready);
    document.body.append(host);
    await Promise.resolve();
    host.remove();
    await Promise.resolve();
    await Promise.resolve();
    document.body.append(host);
    await Promise.resolve();
    release();
    await vi.waitFor(() => expect(ready).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(ready).toHaveBeenCalledTimes(1);
    setMonacoLoader(undefined as never);
  });

  it('remounts a pane bound by id when its session is removed and comes back', async () => {
    const { host } = mount(`<bitmark-pane type="json" session="doc2"></bitmark-pane>
      <div id="wrap"><bitmark-session id="doc2" value="${DOC}" schema="off"></bitmark-session></div>`);
    const pane = host.querySelector('bitmark-pane') as BitmarkPaneElementApi;
    await vi.waitFor(() => expect(paneText(pane)).toContain('World'));
    const session = host.querySelector('bitmark-session')!;
    session.remove();
    await vi.waitFor(() => expect(pane.pane).toBeUndefined());
    host.querySelector('#wrap')!.append(session);
    await vi.waitFor(() => expect(paneText(pane)).toContain('World'));
  });

  it('forwards attribute changes from <bitmark-editor> and rebuilds its tabs on panes=', async () => {
    const fake = createFakeMonaco();
    const host = document.createElement('div');
    host.innerHTML = `<bitmark-editor value="${DOC}" schema="off" panes="json"></bitmark-editor>`;
    const editor = host.querySelector('bitmark-editor') as HTMLElement & {
      monaco: unknown;
      engine: unknown;
    };
    editor.monaco = fake.monaco;
    editor.engine = engine;
    document.body.append(host);
    editor.setAttribute('theme', 'light');
    expect(host.querySelector('bitmark-session')!.getAttribute('theme')).toBe('light');
    editor.setAttribute('panes', 'html,text');
    expect(
      [...host.querySelectorAll('bitmark-tabs > bitmark-pane')].map((p) => p.getAttribute('type')),
    ).toEqual(['html', 'text']);
  });
});
