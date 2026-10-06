// Shared browser checks for a page that exposes `window.__pair` (a proto
// pair) and `window.__monaco` once `window.__spike.mounted` is set.
import { expect } from '@playwright/test';

export const waitMounted = async (page) => {
  await page.waitForFunction(() => window.__spike?.mounted || window.__spike?.error, null, {
    timeout: 30_000,
  });
  const spike = await page.evaluate(() => window.__spike);
  expect(spike.error, 'mount error').toBeUndefined();
  return spike;
};

const bitmarkPane = (page) => page.locator('[data-pane="bitmark"] .monaco-editor').first();

export const checkConversionAndServices = async (page) => {
  // Highlighting from semantic tokens.
  await expect(page.locator('[data-pane="bitmark"] .bm-tok-bitType').first()).toBeVisible();

  // Typing converts bitmark -> JSON.
  await bitmarkPane(page).click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('\n\n[.note]\nTyped note');
  await expect
    .poll(() => page.evaluate(() => window.__pair.getJson()))
    .toContain('Typed note');

  // Diagnostics from the parser: an unknown bit type is marked.
  await page.keyboard.type('\n\n[.no-such-bit-xyz]\nx');
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__monaco.editor.getModelMarkers({ owner: 'bitmark' }).length,
      ),
    )
    .toBeGreaterThan(0);

  // Completion opens on `[` + `.` (trigger characters).
  await page.keyboard.type('\n\n[.');
  await expect(page.locator('[data-pane="bitmark"] .suggest-widget.visible, .suggest-widget.visible').first())
    .toBeVisible({ timeout: 5_000 });
  await page.keyboard.press('Escape');

  // Hover over the first bit type.
  const firstBitType = page.locator('[data-pane="bitmark"] .bm-tok-bitType').first();
  await firstBitType.hover();
  await expect(page.locator('.monaco-hover:not(.hidden)').first()).toBeVisible({ timeout: 5_000 });
};

export const checkJsonEditAndSchema = async (page) => {
  // Editing JSON converts back to bitmark (set through the model: it is a
  // user-equivalent content change for the prototype).
  await page.evaluate(() => {
    const model = window.__pair.jsonEditor.getModel();
    const bits = JSON.parse(model.getValue());
    bits.push({ bit: { type: 'article', format: 'text', body: 'From JSON' } });
    model.setValue(JSON.stringify(bits, null, 2));
  });
  await expect
    .poll(() => page.evaluate(() => window.__pair.getBitmark()))
    .toContain('From JSON');

  // The JSON worker runs and the schema applies: a wrong-typed property is marked.
  await page.evaluate(() => {
    window.__pair.jsonEditor.getModel().setValue('[{"bit": {"type": 42}}]');
  });
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          window.__monaco.editor.getModelMarkers({ resource: window.__pair.jsonEditor.getModel().uri }).length,
        ),
      { timeout: 10_000 },
    )
    .toBeGreaterThan(0);
};

export const checkScrollSync = async (page) => {
  await page.evaluate(() => {
    const doc = Array.from({ length: 60 }, (_, i) => `[.article]\nBit ${i}\n\nline\n\nline\n`).join('\n');
    window.__pair.bitmarkEditor.getModel().setValue(doc);
  });
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => {
    window.__pair.bitmarkEditor.setScrollTop(2000);
    return window.__pair.jsonEditor.getScrollTop();
  });
  expect(after).toBeGreaterThan(0);
};
