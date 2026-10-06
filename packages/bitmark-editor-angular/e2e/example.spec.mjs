// The Angular example, shaped like cosmic (PLAN-021 Step 15a): the CI test
// for cosmic's setup, which cosmic itself has none of.
import { expect, test } from '@playwright/test';

const paneValue = (page, type) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll('bm-pane')].find((p) => p.querySelector('.bm-pane') && p.querySelector(`.bm-pane-${t}`));
    const monaco = window.__example.monaco;
    const model = monaco?.editor.getModels().find((m) => m.uri.toString().includes(`/${t}.`));
    return el && model ? model.getValue() : '';
  }, type);

test('bm-session and bm-panes on Monaco 0.46 AMD with the injected parser', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://localhost:4621/');
  await page.waitForFunction(() => window.__example?.ready, null, { timeout: 30_000 });
  await expect.poll(() => paneValue(page, 'json')).toContain('"type": "cloze"');
  await expect(page.locator('.bm-pane-bitmark .bm-tok-bitType').first()).toBeVisible();
  // Tabs: only the active pane is mounted.
  await expect(page.locator('bm-session').first().locator('.bm-pane-text')).toHaveCount(0);

  // Type: the JSON follows, and the form value with it.
  await page.locator('.bm-pane-bitmark .monaco-editor').first().click();
  await page.keyboard.press('Control+End');
  const ticksBefore = await page.evaluate(() => window.__example.ticks);
  const changesBefore = Number(await page.locator('#changes').textContent());
  await page.keyboard.type('\n\nAngular typed', { delay: 20 });
  await expect.poll(() => paneValue(page, 'json')).toContain('Angular typed');
  await expect.poll(() => page.evaluate(() => window.__example.form.value)).toContain('Angular typed');
  const changes = Number(await page.locator('#changes').textContent()) - changesBefore;
  const ticks = (await page.evaluate(() => window.__example.ticks)) - ticksBefore;
  console.log('ANGULAR keystrokes 15, changes', changes, 'zone turns', ticks);
  // Change detection runs for the session's changes, not for Monaco's internals.
  expect(ticks).toBeLessThanOrEqual(changes * 2 + 4);

  // Diagnostics, completion, hover on the host's Monaco 0.46.
  await page.keyboard.type('\n\n[.no-such-bit-xyz]\nx');
  await expect(page.locator('.bm-pane-bitmark .squiggly-error, .bm-pane-bitmark .squiggly-warning').first()).toBeVisible({ timeout: 10_000 });
  await page.keyboard.type('\n\n[.');
  await expect(page.locator('.suggest-widget.visible').first()).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press('Escape');
  await page.locator('.bm-pane-bitmark .bm-tok-bitType').first().hover();
  await expect(page.locator('.monaco-hover:not(.hidden)').first()).toBeVisible({ timeout: 10_000 });

  // Setting the form value replaces the document, without echoing back as
  // an edit: no (change), no second valueChanges (review fix #8).
  const changesBeforeSet = await page.locator('#changes').textContent();
  const valueChanges = await page.evaluate(() => {
    window.__example.vc = 0;
    window.__example.form.valueChanges.subscribe(() => window.__example.vc++);
    window.__example.form.setValue('[.article]\nFrom the form');
    return 0;
  });
  await expect.poll(() => paneValue(page, 'json')).toContain('From the form');
  await page.waitForTimeout(300);
  expect(await page.locator('#changes').textContent()).toBe(changesBeforeSet);
  expect(await page.evaluate(() => window.__example.vc)).toBe(1 + valueChanges);

  // The second tab mounts when chosen, and the first unmounts.
  await page.getByRole('tab', { name: 'Text' }).click();
  const first = page.locator('bm-session').first();
  await expect(first.locator('.bm-pane-text')).toHaveCount(1);
  await expect(first.locator('.bm-pane-json')).toHaveCount(0);

  // The host's own JSON model gets no bitmark schema markers (D5).
  await page.waitForTimeout(1500);
  const hostMarkers = await page.evaluate(() => {
    const m = window.__example.monaco;
    return m.editor.getModelMarkers({ resource: m.Uri.parse('inmemory://host/config.json') }).length;
  });
  expect(hostMarkers).toBe(0);
  // The second session loads its own parser (D2's load path) and works.
  await expect(page.locator('#loaded-ready')).toHaveText('true', { timeout: 30_000 });
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__example.monaco.editor
          .getModels()
          .some((m) => m.uri.toString().endsWith('/json.json') && m.getValue().includes('Loaded parser')),
      ),
    )
    .toBe(true);
  expect(errors).toEqual([]);
});
