// Main's PLAN-021 (bit templates, the `[` `]` pair) in the package: the
// playground's bitmark editor (needs its Vite dev server on :4604).
import { expect, test } from '@playwright/test';

test('`[` auto-closes, and a bit type completes to its template', async ({ page }) => {
  await page.goto('http://localhost:4604/bitmark-playground/?tab=wasm');
  await expect(page.locator('.markup-editor .bm-tok-bitType').first()).toBeVisible({ timeout: 30_000 });
  await page.locator('.markup-editor .monaco-editor').first().click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type('[');
  await expect(page.locator('.markup-editor .view-lines')).toHaveText('[]');
  await page.keyboard.type('.artic');
  await expect(page.locator('.suggest-widget.visible').first()).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press('Enter');
  const lines = page.locator('.markup-editor .view-lines');
  // One `]` (the auto-closed one replaced), then the template's lines.
  await expect(lines).toContainText('[.article]');
  await expect(lines).not.toContainText('[.article]]');
  expect((await lines.innerText()).split('\n').length).toBeGreaterThan(1);
  console.log('TEMPLATE', JSON.stringify(await lines.innerText()));
});
