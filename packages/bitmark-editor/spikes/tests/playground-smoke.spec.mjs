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
