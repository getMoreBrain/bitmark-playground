// PLAN-021 Steps 7-8 in a real browser (playground Vite dev server :4604 + serve.mjs :4602).
import { expect, test } from '@playwright/test';

const PAGE = 'http://localhost:4604/bitmark-playground/packages/bitmark-editor/playground-spike/panes.html';
const value = (page, pane) => page.evaluate((p) => window.__panes[p].textEditor.getValue(), pane);

test('a session with four free panes: edits flow both ways, services and scroll work', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(PAGE);
  await page.waitForFunction(() => window.__spike?.ready || window.__spike?.error, null, { timeout: 30_000 });
  expect(await page.evaluate(() => window.__spike.error)).toBeUndefined();
  await expect.poll(() => value(page, 'html'), { timeout: 15_000 }).toContain('Marker29');
  await expect.poll(() => value(page, 'text')).toContain('Marker29');
  await expect(page.locator('#bitmark .bm-tok-bitType').first()).toBeVisible();

  // Type in the bitmark pane: JSON, HTML and Text follow.
  const bitmark = page.locator('#bitmark .monaco-editor').first();
  await bitmark.click();
  await page.keyboard.press('Control+Home');
  await page.keyboard.type('[.note]\nTyped first\n\n');
  await expect.poll(() => value(page, 'json')).toContain('Typed first');
  await expect.poll(() => value(page, 'html')).toContain('Typed first');
  await expect.poll(() => value(page, 'text')).toContain('Typed first');

  // Completion and hover in the bitmark pane.
  await page.keyboard.type('[.');
  await expect(page.locator('#bitmark .suggest-widget.visible, .suggest-widget.visible').first()).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press('Escape');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await page.locator('#bitmark .bm-tok-bitType').first().hover();
  await expect(page.locator('.monaco-hover:not(.hidden)').first()).toBeVisible({ timeout: 10_000 });

  // Edit the HTML pane: bitmark and JSON follow, the HTML keeps what was typed.
  await page.evaluate(() => {
    const ed = window.__panes.html.textEditor.editor;
    const model = ed.getModel();
    const at = model.getValue().indexOf('Typed first');
    const pos = model.getPositionAt(at);
    ed.focus();
    ed.setPosition(pos);
  });
  await page.keyboard.type('HTML-');
  await expect.poll(() => page.evaluate(() => window.__session.getBitmark())).toContain('HTML-Typed first');
  await expect.poll(() => value(page, 'json')).toContain('HTML-Typed first');

  // A broken JSON edit: the document is kept, the other panes go stale.
  await page.evaluate(() => {
    const ed = window.__panes.json.textEditor.editor;
    ed.focus();
    ed.setPosition({ lineNumber: 1, column: 1 });
  });
  await page.keyboard.type('}}');
  await expect(page.locator('#json .bm-pane-banner')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#html .bm-pane')).toHaveClass(/bm-stale/);
  expect(await page.evaluate(() => window.__session.getBitmark())).toContain('HTML-Typed first');
  await page.keyboard.press('Control+Z');
  await expect.poll(() => value(page, 'json')).not.toMatch(/^\}\}/);

  // Scroll the bitmark pane: JSON, HTML and Text all follow (3 followers).
  await page.evaluate(() => window.__panes.bitmark.textEditor.editor.setScrollTop(1500));
  await page.waitForTimeout(300);
  const tops = await page.evaluate(() =>
    ['json', 'html', 'text'].map((p) => window.__panes[p].textEditor.editor.getScrollTop()),
  );
  console.log('PANES scrollTops', tops.join(','));
  for (const top of tops) expect(top).toBeGreaterThan(0);

  // A pane out of the linking stays put.
  await page.evaluate(() => window.__panes.text.setScrollSync(false));
  const before = await page.evaluate(() => window.__panes.text.textEditor.editor.getScrollTop());
  await page.evaluate(() => window.__panes.bitmark.textEditor.editor.setScrollTop(300));
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__panes.text.textEditor.editor.getScrollTop())).toBe(before);
  expect(errors).toEqual([]);
});
