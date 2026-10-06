import * as parser from '@gmb/bitmark-parser';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createBitmarkEngine } from '../engine/createBitmarkEngine';
import type { BitmarkEngine, RawParserModule } from '../engine/types';
import {
  createBitmarkPane,
  createHtmlPane,
  createInfoPane,
  createJsonPane,
  createMappingsPane,
  createTextPane,
  createXmlPane,
} from '../panes';
import { createFakeMonaco, FakeModel } from '../testing/fakeMonaco';
import { createBitmarkSession } from './session';
import type { BitmarkPane, BitmarkSession } from './types';

const DOC = '[.article]\nHello **World**!';

let engine: BitmarkEngine;
beforeAll(async () => {
  await parser.init({ feature: 'full' });
  engine = createBitmarkEngine(parser as unknown as RawParserModule, { feature: 'full' });
});

const sessions: BitmarkSession[] = [];
afterEach(() => {
  for (const s of sessions.splice(0)) s.dispose();
});

const setup = (over: Partial<Parameters<typeof createBitmarkSession>[0]> = {}) => {
  const fake = createFakeMonaco();
  const session = createBitmarkSession({
    monaco: fake.monaco,
    engine,
    value: DOC,
    schema: false,
    ...over,
  });
  sessions.push(session);
  const el = () => document.body.appendChild(document.createElement('div'));
  return { fake, session, el };
};

const text = (pane: BitmarkPane) => pane.textEditor.getValue();
/** A user edit in `pane`. */
const type = (pane: BitmarkPane, value: string) =>
  (pane.textEditor.model as FakeModel).setText(value);
const banner = (pane: BitmarkPane) => {
  const b = pane.element.querySelector<HTMLElement>('.bm-pane-banner')!;
  return b.hidden ? '' : b.textContent;
};

describe('createBitmarkSession and its panes (PLAN-022 D9)', () => {
  // @awa-test: PLAN-023-Step8 (each pane shows the document in its format)
  it('shows the document in every pane once the engine is ready', async () => {
    const { session, el } = setup();
    const bitmark = createBitmarkPane(el(), session);
    const json = createJsonPane(el(), session);
    const html = createHtmlPane(el(), session);
    const txt = createTextPane(el(), session);
    await vi.waitFor(() => expect(text(json)).toContain('"type": "article"'));
    expect(text(bitmark)).toBe(DOC);
    await vi.waitFor(() => expect(text(html)).toContain('<bitmark-bit'));
    await vi.waitFor(() => expect(text(txt)).toContain('Hello World!'));
  });

  // @awa-test: PLAN-023-Step7 (an edit in any pane updates the others; the source keeps its text)
  it('updates every other pane after an edit, and never the edited one', async () => {
    const { session, el } = setup();
    const bitmark = createBitmarkPane(el(), session);
    const json = createJsonPane(el(), session);
    const html = createHtmlPane(el(), session);
    await vi.waitFor(() => expect(text(json)).toContain('Hello'));

    type(bitmark, '[.article]\nFrom bitmark');
    await vi.waitFor(() => expect(text(json)).toContain('From bitmark'));
    await vi.waitFor(() => expect(text(html)).toContain('From bitmark'));
    expect(session.getBitmark()).toBe('[.article]\nFrom bitmark');

    // A JSON edit: the JSON pane keeps exactly what was typed.
    const typed = text(json).replace('From bitmark', 'From JSON');
    type(json, typed);
    await vi.waitFor(() => expect(session.getBitmark()).toContain('From JSON'));
    expect(text(bitmark)).toContain('From JSON');
    expect(text(json)).toBe(typed);
    await vi.waitFor(() => expect(text(html)).toContain('From JSON'));
  });

  // @awa-test: PLAN-023-Step8 (HTML and XML panes convert both ways)
  it('converts an HTML edit and an XML edit back to bitmark', async () => {
    const { session, el } = setup();
    const bitmark = createBitmarkPane(el(), session);
    const html = createHtmlPane(el(), session);
    const xml = createXmlPane(el(), session, { mapping: 'xml-niso-iec' });
    await vi.waitFor(() => expect(text(html)).toContain('World'));
    await vi.waitFor(() => expect(text(xml)).toContain('World'));
    type(html, text(html).replace('World', 'HtmlWorld'));
    await vi.waitFor(() => expect(text(bitmark)).toContain('HtmlWorld'));
    await vi.waitFor(() => expect(text(xml)).toContain('HtmlWorld'));
    type(xml, text(xml).replace('HtmlWorld', 'XmlWorld'));
    await vi.waitFor(() => expect(text(bitmark)).toContain('XmlWorld'));
  });

  // @awa-test: PLAN-023-Step7 (an error keeps the last good value; others stale; D15)
  it('keeps the document on a failed edit, marks the edited pane, and shows the others stale', async () => {
    const { session, el } = setup();
    const bitmark = createBitmarkPane(el(), session);
    const json = createJsonPane(el(), session);
    const html = createHtmlPane(el(), session);
    await vi.waitFor(() => expect(text(html)).toContain('World'));
    const errors = vi.fn();
    session.on('error', errors);

    type(json, '[{"bit": ');
    await vi.waitFor(() => expect(banner(json)).toMatch(/^Error: /));
    expect(session.getBitmark()).toBe(DOC);
    expect(text(bitmark)).toBe(DOC);
    // The edited pane keeps the user's broken text (never replaced, D15).
    expect(text(json)).toBe('[{"bit": ');
    expect(banner(html)).toBe(session.messages.stale);
    expect(html.element.classList.contains('bm-stale')).toBe(true);
    expect(errors).toHaveBeenCalledWith(expect.objectContaining({ pane: json }));

    // The next good edit clears it all.
    type(bitmark, '[.article]\nFixed');
    await vi.waitFor(() => expect(text(html)).toContain('Fixed'));
    expect(banner(html)).toBe('');
    expect(html.element.classList.contains('bm-stale')).toBe(false);
  });

  // @awa-test: PLAN-023-Step7 (undo survives a failed conversion, D15)
  it('keeps the edited pane’s undo through a failed conversion', async () => {
    const { session, el } = setup();
    createBitmarkPane(el(), session);
    const json = createJsonPane(el(), session);
    await vi.waitFor(() => expect(text(json)).toContain('World'));
    const good = text(json);
    type(json, 'broken');
    await vi.waitFor(() => expect(banner(json)).not.toBe(''));
    (json.textEditor.model as FakeModel).undo();
    expect(text(json)).toBe(good);
  });

  // @awa-test: PLAN-023-Step8 (read-only panes regenerate but are not sources)
  it('regenerates a read-only pane, ignores edits to it, and can switch', async () => {
    const { session, el } = setup();
    const bitmark = createBitmarkPane(el(), session);
    const json = createJsonPane(el(), session, { readOnly: true });
    expect(json.readOnly).toBe(true);
    await vi.waitFor(() => expect(text(json)).toContain('World'));
    type(json, text(json).replace('World', 'Ignored'));
    await new Promise((r) => setTimeout(r, 20));
    expect(session.getBitmark()).toBe(DOC);
    type(bitmark, '[.article]\nNew');
    await vi.waitFor(() => expect(text(json)).toContain('New'));
    json.setReadOnly(false);
    type(json, text(json).replace('New', 'Editable'));
    await vi.waitFor(() => expect(session.getBitmark()).toContain('Editable'));
  });

  // @awa-test: PLAN-023-Step8 (Text is always read-only)
  it('keeps the Text pane read-only', () => {
    const { session, el } = setup();
    const txt = createTextPane(el(), session);
    txt.setReadOnly(false);
    expect(txt.readOnly).toBe(true);
  });

  // @awa-test: PLAN-023-Step8 (two JSON panes in different modes stay consistent)
  it('keeps optimized and full JSON panes consistent', async () => {
    const { session, el } = setup();
    const optimized = createJsonPane(el(), session);
    const full = createJsonPane(el(), session, { mode: 'full' });
    await vi.waitFor(() => expect(text(full)).toContain('World'));
    expect(text(full).length).toBeGreaterThan(text(optimized).length);
    type(optimized, text(optimized).replace('World', 'Both'));
    await vi.waitFor(() => expect(text(full)).toContain('Both'));
  });

  // @awa-test: PLAN-023-Step8 (a pane converts only while it exists)
  it('stops converting for a pane once it is disposed', async () => {
    const spy = vi.spyOn(engine, 'convertWithBitStarts');
    const { session, el } = setup();
    const bitmark = createBitmarkPane(el(), session);
    const html = createHtmlPane(el(), session);
    await vi.waitFor(() => expect(text(html)).toContain('World'));
    html.dispose();
    spy.mockClear();
    type(bitmark, '[.article]\nAfter');
    await new Promise((r) => setTimeout(r, 20));
    expect(spy).not.toHaveBeenCalled();
    expect(session.panes()).toEqual([bitmark]);
    spy.mockRestore();
  });

  // @awa-test: PLAN-023-Step8 (markup panes wait for the full variant)
  it('shows "needs the full parser" for a markup pane on a bitmark-json engine, until it upgrades', async () => {
    const injected = createBitmarkEngine(parser as unknown as RawParserModule); // declared bitmark-json
    const { session, el } = setup({ engine: injected });
    const html = createHtmlPane(el(), session);
    await vi.waitFor(() => expect(banner(html)).toBe(session.messages.needsFullParser));
    injected.setFeature('full');
    await vi.waitFor(() => expect(text(html)).toContain('World'));
    expect(banner(html)).toBe('');
  });

  // @awa-test: PLAN-023-Step7 (the engine can arrive later; panes show loading)
  it('shows loading until the engine arrives', async () => {
    let resolve!: (e: BitmarkEngine) => void;
    const { session, el } = setup({ engine: new Promise<BitmarkEngine>((r) => (resolve = r)) });
    const json = createJsonPane(el(), session);
    expect(banner(json)).toBe(session.messages.loading);
    resolve(engine);
    await vi.waitFor(() => expect(text(json)).toContain('World'));
  });

  // @awa-test: PLAN-023-Step8 (Info: one section per distinct bit type)
  it('fills the Info pane with each distinct bit type', async () => {
    const { session, el } = setup({ value: '[.article]\nA\n\n[.article]\nB\n\n[.note]\nC' });
    const info = createInfoPane(el(), session);
    await vi.waitFor(() => expect(text(info)).toContain('note'));
    expect(text(info).split('\n\n').length).toBeGreaterThanOrEqual(2);
    expect(info.scrollSync).toBe(false);
  });

  // @awa-test: PLAN-023-Step8 (Mappings: the report for the last edit, every edit)
  it('reports the last edit in the Mappings pane, and labels an API edit', async () => {
    const { session, el } = setup();
    createBitmarkPane(el(), session);
    const json = createJsonPane(el(), session);
    const mappings = createMappingsPane(el(), session);
    await vi.waitFor(() => expect(text(json)).toContain('World'));
    type(json, text(json).replace('World', 'Mapped'));
    await vi.waitFor(() => expect(text(mappings)).toContain('Last edited: JSON  (json → bitmark)'));
    expect(session.lastEdit?.inputFormat).toBe('json');
    const count = session.lastEdit!.count;
    session.setBitmark(DOC);
    await vi.waitFor(() => expect(text(mappings)).toContain('Last edited: API  (bitmark → json)'));
    session.setBitmark(DOC);
    expect(session.lastEdit!.count).toBe(count + 2);
  });

  // @awa-test: PLAN-023-Step7 (debounceMs: one conversion for a burst, last edit wins)
  it('converts once for a burst of edits with debounceMs', async () => {
    const spy = vi.spyOn(engine, 'convert');
    const { session, el } = setup({ debounceMs: 30 });
    createBitmarkPane(el(), session);
    const json = createJsonPane(el(), session);
    await vi.waitFor(() => expect(text(json)).toContain('World'));
    spy.mockClear();
    const base = text(json);
    type(json, base.replace('World', 'One'));
    type(json, base.replace('World', 'Two'));
    type(json, base.replace('World', 'Three'));
    await vi.waitFor(() => expect(session.getBitmark()).toContain('Three'));
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  // @awa-test: PLAN-023-Step7 (scroll membership per pane)
  it('links exactly the panes given to setScrollSync', () => {
    const { session, el } = setup();
    const bitmark = createBitmarkPane(el(), session);
    const json = createJsonPane(el(), session);
    const html = createHtmlPane(el(), session, { scrollSync: false });
    expect([bitmark.scrollSync, json.scrollSync, html.scrollSync]).toEqual([true, true, false]);
    session.setScrollSync([bitmark, html]);
    expect([bitmark.scrollSync, json.scrollSync, html.scrollSync]).toEqual([true, false, true]);
  });

  // @awa-test: PLAN-023-Step7 (theme on every pane; Monaco theme only when asked, D11)
  it('themes every pane, and sets the Monaco theme only with applyMonacoTheme', () => {
    const { session, el, fake } = setup({ theme: 'light' });
    const bitmark = createBitmarkPane(el(), session);
    expect(bitmark.element.classList.contains('bm-theme-light')).toBe(true);
    session.setTheme('dark');
    expect(bitmark.element.classList.contains('bm-theme-dark')).toBe(true);
    expect(fake.setTheme).not.toHaveBeenCalled();
    const owned = setup({ theme: 'light', applyMonacoTheme: true });
    expect(owned.fake.setTheme).toHaveBeenCalledWith('vs');
  });

  // @awa-test: PLAN-023-Step8 (error slot, D12; messages, D12)
  it('reports the edited pane’s error to its error slot, with the host’s messages', async () => {
    const { session, el } = setup({ messages: { errorPrefix: 'Fehler: ' } });
    createBitmarkPane(el(), session);
    const slot = document.createElement('p');
    const callback = vi.fn();
    const json = createJsonPane(el(), session, { errorSlot: slot });
    const json2 = createJsonPane(el(), session, { errorSlot: callback });
    await vi.waitFor(() => expect(text(json)).toContain('World'));
    type(json, 'nope');
    await vi.waitFor(() => expect(slot.textContent).not.toBe(''));
    expect(slot.hidden).toBe(false);
    expect(banner(json)).toMatch(/^Fehler: /);
    type(json2, 'nope either');
    await vi.waitFor(() => expect(callback).toHaveBeenLastCalledWith(expect.any(String)));
  });

  // @awa-test: PLAN-023-Step7 (two sessions are independent)
  it('keeps two sessions independent', async () => {
    const a = setup();
    const b = setup({ value: '[.article]\nOther' });
    const aBitmark = createBitmarkPane(a.el(), a.session);
    const bJson = createJsonPane(b.el(), b.session);
    await vi.waitFor(() => expect(text(bJson)).toContain('Other'));
    type(aBitmark, '[.article]\nOnly A');
    await new Promise((r) => setTimeout(r, 20));
    expect(text(bJson)).toContain('Other');
    expect(b.session.getBitmark()).toBe('[.article]\nOther');
  });

  // @awa-test: PLAN-023-Step7 (dispose removes the panes and their models)
  it('disposes every pane, its element and its model', async () => {
    const { session, el, fake } = setup();
    const host = el();
    const json = createJsonPane(host, session);
    session.dispose();
    sessions.splice(sessions.indexOf(session), 1);
    expect(host.querySelector('.bm-pane')).toBeNull();
    expect((json.textEditor.model as FakeModel).disposed).toBe(true);
    expect(fake.editors.every((e) => e.disposed)).toBe(true);
  });

  // @awa-test: PLAN-023-Step7 (getJson on demand)
  it('gives the document as JSON on demand', async () => {
    const { session } = setup();
    await expect(session.getJson()).resolves.toContain('"type": "article"');
  });
});

describe('review fixes (PLAN-023 pass 1)', () => {
  /** The fake editor state behind a pane. */
  const stateOf = (fake: ReturnType<typeof createFakeMonaco>, pane: BitmarkPane) =>
    fake.editors.find((e) => e.options['model'] === pane.textEditor.model)!;

  // @awa-test: PLAN-023-Step7 (a slow conversion never overwrites a newer edit)
  it('drops a conversion that a newer edit superseded, result and error alike', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const slow: BitmarkEngine = Object.assign(Object.create(engine), {
      convert: async (...args: Parameters<BitmarkEngine['convert']>) => {
        await gate;
        return engine.convert(...args);
      },
    });
    const { session, el } = setup({ engine: slow });
    const bitmark = createBitmarkPane(el(), session);
    const json = createJsonPane(el(), session);
    const html = createHtmlPane(el(), session);
    await vi.waitFor(() => expect(text(json)).toContain('World'));
    type(json, text(json).replace('World', 'Old'));
    // Let the JSON conversion start (edits in one tick merge into one).
    await new Promise((r) => setTimeout(r, 0));
    type(bitmark, '[.article]\nNewer');
    release();
    await new Promise((r) => setTimeout(r, 30));
    expect(session.getBitmark()).toBe('[.article]\nNewer');
    expect(text(bitmark)).toBe('[.article]\nNewer');
    expect(banner(html)).toBe('');
  });

  // @awa-test: PLAN-023-Step8 (an applied regeneration clears the pane's old source error)
  it('clears a pane’s error once it shows the document again', async () => {
    const { session, el, fake } = setup();
    const bitmark = createBitmarkPane(el(), session);
    const json = createJsonPane(el(), session);
    await vi.waitFor(() => expect(text(json)).toContain('World'));
    type(json, '[{"bit": {"type": "article", "body": 5}}');
    await vi.waitFor(() => expect(banner(json)).toMatch(/^Error: /));
    type(bitmark, '[.article]\nRepaired');
    await vi.waitFor(() => expect(text(json)).toContain('Repaired'));
    expect(banner(json)).toBe('');
    expect(fake.markersOf(json.textEditor.model, 'bitmark-convert')).toEqual([]);
  });

  // @awa-test: PLAN-023-Step8 (an API change reaches a focused pane)
  it('applies setBitmark to a focused pane', async () => {
    const { session, el, fake } = setup();
    const bitmark = createBitmarkPane(el(), session);
    stateOf(fake, bitmark).focused = true;
    session.setBitmark('[.article]\nFrom the API');
    expect(text(bitmark)).toBe('[.article]\nFrom the API');
  });

  // @awa-test: PLAN-023-Step8 (a focused pane catches up on blur)
  it('catches a focused pane up on blur when it could not regenerate', async () => {
    const injected = createBitmarkEngine(parser as unknown as RawParserModule);
    const { session, el, fake } = setup({ engine: injected });
    const html = createHtmlPane(el(), session);
    await vi.waitFor(() => expect(banner(html)).toBe(session.messages.needsFullParser));
    stateOf(fake, html).focused = true;
    injected.setFeature('full');
    await new Promise((r) => setTimeout(r, 20));
    expect(text(html)).toBe('');
    stateOf(fake, html).blur();
    await vi.waitFor(() => expect(text(html)).toContain('World'));
  });

  // @awa-test: PLAN-023-Step8 (a stage-2 failure ends "loading")
  it('says "needs the full parser" when stage 2 fails on the load path', async () => {
    const failing = {
      ...(parser as unknown as RawParserModule),
      init: async ({ feature }: { feature: string }) => {
        if (feature !== 'bitmark-json') throw new Error('no full variant');
      },
    };
    const { session, el } = setup({
      engine: { url: 'stage2-fails', importModule: async () => failing },
    });
    const html = createHtmlPane(el(), session);
    await vi.waitFor(() => expect(banner(html)).toBe(session.messages.needsFullParser));
  });

  // @awa-test: PLAN-023-Step7 (a failed engine load shows in the panes)
  it('shows a failed engine load in every pane', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { session, el } = setup({ engine: Promise.reject(new Error('engine unreachable')) });
    const json = createJsonPane(el(), session);
    await vi.waitFor(() => expect(banner(json)).toBe('Error: engine unreachable'));
    const late = createHtmlPane(el(), session);
    expect(banner(late)).toBe('Error: engine unreachable');
    vi.restoreAllMocks();
  });

  // @awa-test: PLAN-023-Step7 (dispose releases the feature subscription)
  it('releases its feature-change subscription on dispose', async () => {
    const shared = createBitmarkEngine(parser as unknown as RawParserModule, { feature: 'full' });
    const spy = vi.spyOn(shared, 'onFeatureChange');
    const { session } = setup({ engine: shared });
    await session.ready;
    await Promise.resolve();
    const off = spy.mock.results[0]!.value as () => boolean;
    session.dispose();
    sessions.splice(sessions.indexOf(session), 1);
    expect(off()).toBe(false); // already removed by dispose
  });
});

describe('second review fixes', () => {
  const stateOf = (fake: ReturnType<typeof createFakeMonaco>, pane: BitmarkPane) =>
    fake.editors.find((e) => e.options['model'] === pane.textEditor.model)!;

  // @awa-test: PLAN-023-Step8 (blur never replaces the user's own text)
  it.each([
    ['valid compact JSON', (t: string) => JSON.stringify(JSON.parse(t.replace('Typed', 'Mine')))],
    ['half-typed JSON', () => '[{"bit": '],
  ])('keeps what the user typed in a pane on blur (%s)', async (_name, edit) => {
    const { session, el, fake } = setup();
    const bitmark = createBitmarkPane(el(), session);
    const json = createJsonPane(el(), session);
    await vi.waitFor(() => expect(text(json)).toContain('World'));
    // The JSON pane has focus when an edit from the bitmark pane lands: pending.
    stateOf(fake, json).focused = true;
    type(bitmark, '[.article]\nTyped');
    await new Promise((r) => setTimeout(r, 20));
    expect(text(json)).not.toContain('Typed');
    // The user types in the JSON pane, then leaves it.
    const theirs = edit(await session.getJson());
    type(json, theirs);
    await new Promise((r) => setTimeout(r, 20));
    stateOf(fake, json).blur();
    await new Promise((r) => setTimeout(r, 20));
    expect(text(json)).toBe(theirs);
  });
});

describe('host integration options (PLAN-023 Step 14)', () => {
  // @awa-test: PLAN-023-Step14 (setBitmark with an origin or as no edit at all)
  it('records a host edit’s origin, and leaves the last edit alone for `false`', async () => {
    const { session, el } = setup();
    const mappings = createMappingsPane(el(), session);
    session.setBitmark('[.article]\nOriginal', {
      inputFormat: 'bitmark',
      content: '[.article]\nOriginal',
      label: 'Original bitmark',
    });
    expect(session.lastEdit).toMatchObject({ label: 'Original bitmark', inputFormat: 'bitmark' });
    await vi.waitFor(() => expect(text(mappings)).toContain('Last edited: Original bitmark'));
    const count = session.lastEdit!.count;
    session.setBitmark('[.article]\nTab switch', false);
    expect(session.getBitmark()).toBe('[.article]\nTab switch');
    expect(session.lastEdit!.count).toBe(count);
    expect(session.lastEdit!.label).toBe('Original bitmark');
  });

  // @awa-test: PLAN-023-Step14 (a host's scroll group)
  it('joins the host’s scroll group when given one', async () => {
    const { createScrollSyncGroup } = await import('../scroll/scrollSyncGroup');
    const group = createScrollSyncGroup();
    const { session, el } = setup({ scrollGroup: group });
    createJsonPane(el(), session);
    createHtmlPane(el(), session);
    createInfoPane(el(), session); // not in scroll sync
    expect(group.members()).toHaveLength(2);
  });

  // @awa-test: PLAN-023-Step14 (onRender reports each shown regeneration)
  it('reports how long each shown regeneration took', async () => {
    const { session, el } = setup();
    const onRender = vi.fn();
    const bitmark = createBitmarkPane(el(), session);
    createHtmlPane(el(), session, { onRender });
    await vi.waitFor(() => expect(onRender).toHaveBeenCalledTimes(1));
    type(bitmark, '[.article]\nAgain');
    await vi.waitFor(() => expect(onRender).toHaveBeenCalledTimes(2));
    expect(onRender.mock.calls[0]![0].durationMs).toBeGreaterThanOrEqual(0);
  });
});
