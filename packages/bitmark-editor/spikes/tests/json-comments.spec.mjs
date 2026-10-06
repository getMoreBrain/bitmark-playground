// Comments in the playground's JSON pane are still marked as errors after the
// schema binding stopped forcing allowComments: false (Monaco's own
// `comments: "error"` default applies).
import { expect, test } from '@playwright/test';

test('a comment in the JSON pane is marked as an error', async ({ page }) => {
  await page.goto('http://localhost:4604/bitmark-playground/?tab=wasm');
  const json = page.locator('.json-editor .monaco-editor').first();
  await expect(page.locator('.json-editor .view-lines')).toContainText('"type"', { timeout: 30_000 });
  await json.click();
  await page.keyboard.press('Control+Home');
  await page.keyboard.type('// a comment\n');
  await expect(page.locator('.json-editor .squiggly-error').first()).toBeVisible({ timeout: 10_000 });
});
