// The static-site example (PLAN-023 Step 15): /bundled from a cross-origin
// "CDN", no bundler, shaped like the docs site (PLAN-022 D12).
import { expect, test } from '@playwright/test';

const PAGE = 'http://localhost:4611/index.html';
const paneValue = (page, type) =>
  page.evaluate((t) => document.querySelector(`bitmark-pane[type="${t}"]`).pane?.textEditor.getValue() ?? '', type);

test('loads on idle from the CDN, then every service works', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(PAGE);
  await expect(page.locator('[data-bitmark-static]')).toBeVisible();
  await page.waitForFunction(() => window.__example.ready || window.__example.error, null, { timeout: 30_000 });
  expect(await page.evaluate(() => window.__example.error)).toBeUndefined();
  await expect(page.locator('[data-bitmark-static]')).toBeHidden();
  await expect.poll(() => paneValue(page, 'json')).toContain('"type": "cloze"');
  await expect(page.locator('bitmark-pane[type="bitmark"] .bm-tok-bitType').first()).toBeVisible();

  // Type: the JSON follows after the 300 ms debounce.
  await page.locator('bitmark-pane[type="bitmark"] .monaco-editor').first().click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('\n\n[.note]\nTyped note');
  await expect.poll(() => paneValue(page, 'json'), { timeout: 5_000 }).toContain('Typed note');

  // Diagnostics, completion, hover.
  await page.keyboard.type('\n\n[.no-such-bit-xyz]\nx');
  await expect(page.locator('bitmark-pane[type="bitmark"] .squiggly-error, bitmark-pane[type="bitmark"] .squiggly-warning').first()).toBeVisible({ timeout: 10_000 });
  await page.keyboard.type('\n\n[.');
  await expect(page.locator('.suggest-widget.visible').first()).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press('Escape');
  await page.locator('bitmark-pane[type="bitmark"] .bm-tok-bitType').first().hover();
  await expect(page.locator('.monaco-hover:not(.hidden)').first()).toBeVisible({ timeout: 10_000 });

  // The JSON worker and the schema: a wrong type is marked.
  await page.evaluate(() => document.querySelector('bitmark-pane[type="json"]').pane.textEditor.model.setValue('[{"bit": {"type": 42}}]'));
  await expect
    .poll(() => page.evaluate(() => {
      const m = document.querySelector('bitmark-pane[type="json"]').pane.textEditor.model;
      return window.__bundle.loadBundledMonaco().then((monaco) => monaco.editor.getModelMarkers({ resource: m.uri }).length);
    }), { timeout: 10_000 })
    .toBeGreaterThan(0);

  // Reset sets the document; the theme toggle switches the panes' theme.
  await page.locator('[data-reset]').click();
  await expect.poll(() => paneValue(page, 'bitmark')).toBe('[.article]\nHello **World**!');
  await page.locator('[data-theme-toggle]').click();
  await expect(page.locator('bitmark-pane[type="bitmark"] .bm-pane')).toHaveClass(/bm-theme-dark/);
  // The site's token mapping applies: bit types take the site's tag colour.
  const color = await page.locator('bitmark-pane[type="bitmark"] .bm-tok-bitType').first().evaluate((el) => getComputedStyle(el).color);
  expect(color).toBe('rgb(255, 212, 121)'); // --syntax-tag in the dark site theme
  expect(errors).toEqual([]);
});

test('narrow touch screens keep the static example and load nothing heavy', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const requested = [];
  page.on('request', (r) => requested.push(r.url()));
  await page.goto(PAGE);
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-bitmark-static]')).toBeVisible();
  expect(requested.filter((u) => /monaco\.js|\.worker\.js|bitmark-parser/.test(u))).toEqual([]);
  await context.close();
});

test('a blocked CDN leaves the static example in place', async ({ page }) => {
  await page.route('http://localhost:4612/**', (r) => r.abort());
  await page.goto(PAGE);
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-bitmark-static]')).toBeVisible();
});

test('start-up: first visit (cold cache) against a later page (warm cache)', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const visit = async () => {
    await page.goto(PAGE);
    await page.waitForFunction(() => window.__example.ready, null, { timeout: 30_000 });
    return page.evaluate(() => Math.round(window.__example.ready - window.__example.start));
  };
  const cold = await visit();
  const warm = await visit();
  console.log('EXAMPLE start-up ms: cold', cold, 'warm', warm);
  await context.close();
});

test('the injected parser path: the package never inits it; markup panes wait for full', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://localhost:4611/inject.html');
  await page.waitForFunction(() => window.__example.ready, null, { timeout: 30_000 });
  await expect.poll(() => paneValue(page, 'json')).toContain('Injected parser');
  await expect(page.locator('bitmark-pane[type="html"] .bm-pane-banner')).toHaveText('This view needs the full bitmark parser.');
  // The host upgrades its own parser, then tells the engine (D7).
  await page.evaluate(async () => {
    await window.__parser.init({ feature: 'full' });
    document.getElementById('doc').session.engine.setFeature('full');
  });
  await expect.poll(() => paneValue(page, 'html')).toContain('Injected parser');
  expect(errors).toEqual([]);
});

test('a relocated bundle finds Monaco, its CSS and workers through setBitmarkAssetBase', async ({ page }) => {
  // Only bundled.js was copied by the "host bundler"; nothing else is there.
  await page.route(/localhost:4611\/relocated\/(?!bundled\.js)/, (r) => r.fulfill({ status: 404, body: 'not copied' }));
  const relocatedHits = [];
  page.on('request', (r) => r.url().includes('/relocated/') && relocatedHits.push(r.url()));
  await page.goto('http://localhost:4611/relocated.html');
  await page.waitForFunction(() => window.__example.loaded, null, { timeout: 10_000 });
  // A waiting session without static content has no size: click it from script.
  await page.evaluate(() => document.getElementById('doc').click());
  await page.waitForFunction(() => window.__example.ready || window.__example.error, null, { timeout: 30_000 });
  expect(await page.evaluate(() => window.__example.error)).toBeUndefined();
  await expect.poll(() => paneValue(page, 'json')).toContain('Relocated');
  await expect(page.locator('bitmark-pane[type="bitmark"] .bm-tok-bitType').first()).toBeVisible();
  expect(relocatedHits.filter((u) => !u.endsWith('/relocated/bundled.js'))).toEqual([]);
});

test('the bundled worker engine runs the parser in workers from the CDN', async ({ page }) => {
  await page.goto('http://localhost:4611/index.html');
  await page.waitForFunction(() => window.__bundle, null, { timeout: 30_000 });
  const out = await page.evaluate(async () => {
    const engine = await window.__bundle.createBundledWorkerEngine({
      url: 'http://localhost:4612/parser/dist/browser/bitmark-parser.min.js',
    });
    const json = await engine.bitmarkToJsonText('[.article]\nFrom a worker');
    const tokens = await engine.semanticTokens('[.article]');
    engine.dispose();
    return { version: engine.version, json: json.text, tokens: tokens.tokens.length };
  });
  expect(out.version).toMatch(/^\d+\.\d+\.\d+/);
  expect(out.json).toContain('From a worker');
  expect(out.tokens).toBeGreaterThan(0);
});
