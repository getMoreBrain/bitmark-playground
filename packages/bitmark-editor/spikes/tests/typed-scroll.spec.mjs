// Main's PLAN-020 in the package: JSON the user types links its scrolling by
// bit (needs the playground's Vite dev server on :4604).
import { createRequire } from 'node:module';

import { expect, test } from '@playwright/test';

const parser = createRequire(import.meta.url)('../../../../node_modules/@gmb/bitmark-parser');

// Pasted, as a user would: typing JSON character by character into Monaco
// would let its auto-closing brackets rewrite it.
test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

test('typed JSON keeps linked scrolling by bit', async ({ page }) => {
  await parser.init?.();
  const bits = 40;
  const doc = Array.from({ length: bits }, (_, i) => `[.article]\nMarker${i}`).join('\n\n');
  const parsed = JSON.parse(parser.convert(doc, { inputFormat: 'bitmark', outputFormat: 'json' }));
  // Uneven: the first half compact (one line a bit), the rest spread out, so
  // proportional scrolling drifts and only pinned bit positions line up.
  const json =
    '[\n' +
    parsed.map((b, i) => (i < bits / 2 ? JSON.stringify(b) : JSON.stringify(b, null, 8))).join(',\n') +
    '\n]';

  await page.goto('http://localhost:4604/bitmark-playground/?tab=wasm');
  await expect(page.locator('.markup-editor .bm-tok-bitType').first()).toBeVisible({ timeout: 30_000 });
  const right = page.locator('.json-editor .monaco-editor').first();
  await right.click();
  await page.evaluate((t) => navigator.clipboard.writeText(t), json);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Control+V');
  await page.keyboard.press('Control+Home');
  await expect(page.locator('.markup-editor .view-lines')).toContainText('Marker0', { timeout: 10_000 });
  await page.waitForTimeout(800);
  const visible = async (pane) =>
    [...(await page.locator(`${pane} .view-lines`).innerText()).matchAll(/Marker(\d+)/g)].map((m) => Number(m[1]));
  // Scroll the JSON pane down, past the compact half's start.
  await right.hover();
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(800);
  const shown = await visible('.json-editor');
  const top = Math.min(...shown);
  const left = await visible('.markup-editor');
  console.log('TYPED json shows', shown.join(','), 'bitmark shows', left.join(','));
  expect(top).toBeGreaterThanOrEqual(2);
  // The same bit at the top of both (proportional scrolling drifts by several).
  expect(Math.abs(Math.min(...left) - top)).toBeLessThanOrEqual(1);
});
