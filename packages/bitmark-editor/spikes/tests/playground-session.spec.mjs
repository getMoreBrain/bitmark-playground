// PLAN-021 Step 14: the playground's WASM JSON, HTML, Text, XML, Info and
// Mappings tabs are the package's session panes (needs the playground's Vite
// dev server on :4604).
import { expect, test } from '@playwright/test';

const URL = 'http://localhost:4604/bitmark-playground/?tab=wasm';
const DOC = '[.article]\nHello **World**!';

/** Replace the left editor's bitmark, as the user does. */
const typeBitmark = async (page, text) => {
  await page.locator('.markup-editor .monaco-editor').first().click();
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText(text);
};
/** A right-hand (JSON side) tab: the second bar when the name is in both. */
const rightTab = (page, name) => page.getByRole('tab', { name }).last();
const rightPane = (page) => page.locator('.json-editor .view-lines');

test('the moved tabs show the session panes, and edits flow both ways', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL);
  await expect(page.locator('.markup-editor .bm-tok-bitType').first()).toBeVisible({ timeout: 30_000 });
  await typeBitmark(page, DOC);

  // WASM JSON: the session's optimized JSON.
  await rightTab(page, /^WASM(?! \(full\)| Check)/).click();
  await expect(rightPane(page)).toContainText('"type": "article"', { timeout: 10_000 });
  // WASM (full) JSON, HTML, Text, XML: each is a session pane with content.
  await rightTab(page, /^WASM \(full\)/).click();
  await expect(rightPane(page)).toContainText('"type": "article"', { timeout: 15_000 });
  await rightTab(page, /^HTML/).click();
  await expect(rightPane(page)).toContainText('World', { timeout: 15_000 });
  await expect(rightTab(page, /^HTML/)).toContainText(/\d/); // its timing
  await rightTab(page, /^Text/).click();
  await expect(rightPane(page)).toContainText('Hello World', { timeout: 15_000 });
  await rightTab(page, /^XML \(NISO-IEC\)/).click();
  await expect(rightPane(page)).toContainText('<', { timeout: 15_000 });
  await rightTab(page, /^XML \(NISO-IEC-ES\)/).click();
  await expect(rightPane(page)).toContainText('<', { timeout: 15_000 });

  // An edit in the WASM JSON pane comes back to the left editor.
  await rightTab(page, /^WASM(?! \(full\)| Check)/).click();
  await expect(rightPane(page)).toContainText('World', { timeout: 10_000 });
  await page.locator('.json-editor .view-lines').getByText('World').first().dblclick();
  await page.keyboard.type('Planet');
  await expect(page.locator('.markup-editor .view-lines')).toContainText('Planet', { timeout: 10_000 });
  // ...and a left edit reaches the pane.
  await typeBitmark(page, '[.article]\nFrom the left');
  await expect(rightPane(page)).toContainText('From the left', { timeout: 10_000 });

  // Info and Mappings, in the bottom-left panel.
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Show diff / lex').check();
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Info' }).click();
  await expect(page.getByText(/article/).last()).toBeVisible({ timeout: 15_000 });
  await page.getByRole('tab', { name: 'Mappings' }).click();
  await expect(page.locator('.monaco-editor').last()).toContainText(/bitmark/i, { timeout: 15_000 });
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Show diff / lex').uncheck();
  await page.keyboard.press('Escape');

  // "no diff result available": the Diff panel (not moved) when it is hidden
  // mid-diff; the same before Step 14.
  expect(errors.filter((e) => !e.includes('favicon') && !e.includes('no diff result'))).toEqual([]);
});

test('switching the left tab shows that parser\'s bitmark in the session', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.markup-editor .bm-tok-bitType').first()).toBeVisible({ timeout: 30_000 });
  await typeBitmark(page, '[.article]\nSwitch check');
  await rightTab(page, /^Text/).click();
  await expect(rightPane(page)).toContainText('Switch check', { timeout: 15_000 });
  await page.getByRole('tab', { name: /^Original/ }).first().click();
  await expect(page.locator('.markup-editor .view-lines')).toContainText('Switch check', { timeout: 15_000 });
  await expect(rightPane(page)).toContainText('Switch check');
});

test('hidden tabs keep converting: every tab shows its duration', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.markup-editor .bm-tok-bitType').first()).toBeVisible({ timeout: 30_000 });
  await typeBitmark(page, '[.article]\nTimed');
  // Not visited: their panes are mounted but hidden.
  for (const name of [/^HTML/, /^Text/, /^XML \(NISO-IEC\)/, /^XML \(NISO-IEC-ES\)/]) {
    await expect(rightTab(page, name)).toContainText(/\d/, { timeout: 15_000 });
  }
});

test('a left-tab switch right after a pane edit still reaches the panes', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.markup-editor .bm-tok-bitType').first()).toBeVisible({ timeout: 30_000 });
  await typeBitmark(page, '[.article]\nBefore');
  await rightTab(page, /^WASM(?! \(full\)| Check)/).click();
  await expect(rightPane(page)).toContainText('Before', { timeout: 10_000 });
  await rightPane(page).getByText('Before').first().dblclick();
  await page.keyboard.type('After');
  // Switch at once, inside the Original parser's debounce.
  await page.getByRole('tab', { name: /^Original/ }).first().click();
  await expect(page.locator('.markup-editor .view-lines')).toContainText('After', { timeout: 15_000 });
  await rightTab(page, /^Text/).click();
  await expect(rightPane(page)).toContainText('After', { timeout: 15_000 });
});
