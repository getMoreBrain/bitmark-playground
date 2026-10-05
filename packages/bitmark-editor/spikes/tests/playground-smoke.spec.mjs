// Smoke check of the real playground during PLAN-021 Phase 1 (needs its Vite
// dev server on :4604). Loads the parser from jsDelivr, as the playground does.
import { expect, test } from '@playwright/test';

test('the playground loads, converts and highlights', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('http://localhost:4604/bitmark-playground/?tab=wasm');
  const bitmark = page.locator('.markup-editor .monaco-editor').first();
  await expect(bitmark).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.markup-editor .bm-tok-bitType').first()).toBeVisible({ timeout: 30_000 });
  await bitmark.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('\n\n[.note]\nSmoke note');
  await expect(page.locator('.json-editor .view-lines')).toContainText('"type": "note"', { timeout: 10_000 });
  // Diagnostics: an unknown bit type is marked.
  await page.keyboard.type('\n\n[.no-such-bit-xyz]\nx');
  await expect(page.locator('.markup-editor .squiggly-error, .markup-editor .squiggly-warning').first()).toBeVisible({ timeout: 10_000 });
  // Completion opens on `[` + `.`, and hover describes a bit type.
  await page.keyboard.type('\n\n[.');
  await expect(page.locator('.suggest-widget.visible').first()).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press('Escape');
  await page.locator('.markup-editor .bm-tok-bitType').first().hover();
  await expect(page.locator('.monaco-hover:not(.hidden)').first()).toBeVisible({ timeout: 10_000 });
  expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
});

test('the playground links scrolling by bit, and the toggle unlinks it', async ({ page }) => {
  await page.goto('http://localhost:4604/bitmark-playground/?tab=wasm');
  const bitmark = page.locator('.markup-editor .monaco-editor').first();
  await expect(page.locator('.markup-editor .bm-tok-bitType').first()).toBeVisible({ timeout: 30_000 });
  await bitmark.click();
  await page.keyboard.press('Control+A');
  const doc = Array.from({ length: 30 }, (_, i) => `[.article]\nMarker${i}\n\nline\n\nline\n\nline`).join('\n\n');
  await page.keyboard.insertText(doc);
  // The cursor ends at the bottom; the JSON follows it there.
  await expect(page.locator('.json-editor .view-lines')).toContainText('Marker2', { timeout: 10_000 });
  await page.keyboard.press('Control+Home');
  await expect(page.locator('.json-editor .view-lines')).toContainText('Marker0', { timeout: 10_000 });
  await page.waitForTimeout(500);
  // Scroll the bitmark editor well down; the JSON should show the same bit.
  /** Scroll the bitmark editor down, as the user does (Chromium caps one wheel delta). */
  const scrollBitmark = async () => {
    await bitmark.hover();
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(500);
  };
  await scrollBitmark();
  /** The bit markers visible in a pane, in order. */
  const visibleBits = async (pane) =>
    [...(await page.locator(`${pane} .view-lines`).innerText()).matchAll(/Marker(\d+)/g)].map((m) => Number(m[1]));
  const left = Math.min(...(await visibleBits('.markup-editor')));
  const right = await visibleBits('.json-editor');
  console.log('SCROLL bitmark top', left, 'json shows', right.join(','));
  expect(left).toBeGreaterThanOrEqual(2); // scrolled past the first bits
  // A JSON bit is ~40 lines, so its viewport shows the neighbouring bits.
  expect(right.some((n) => Math.abs(n - left) <= 2)).toBe(true);

  // Switch "Link scrolling" off: the JSON stays put.
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Link scrolling').uncheck();
  await page.keyboard.press('Escape');
  await scrollBitmark();
  expect(await visibleBits('.json-editor')).toEqual(right);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Link scrolling').check();
});
