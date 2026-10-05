// PLAN-020 Phase 0: Angular 21 shaped like cosmic (D10).
import { expect, test } from '@playwright/test';

import {
  checkConversionAndServices,
  checkJsonEditAndSchema,
  checkScrollSync,
  waitMounted,
} from './editorChecks.mjs';

test('the core works in an Angular 21 zone app with injected Monaco 0.46 and parser', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://localhost:4603/');
  const spike = await waitMounted(page);
  expect(spike.schemaApplied).toBe(true);
  await checkConversionAndServices(page);
  await checkJsonEditAndSchema(page);
  await checkScrollSync(page);
  expect(errors).toEqual([]);
});

const ticksWhileTyping = async (page, url) => {
  await page.goto(url);
  await waitMounted(page);
  await page.waitForTimeout(500);
  await page.locator('[data-pane="bitmark"] .monaco-editor').first().click();
  await page.keyboard.press('Control+End');
  const before = await page.evaluate(() => window.__ticks);
  await page.keyboard.type('\nTyping twenty chars.', { delay: 20 });
  await page.waitForTimeout(500);
  return (await page.evaluate(() => window.__ticks)) - before;
};

test('change detection: Monaco outside the zone does not tick per keystroke', async ({ page }) => {
  const outside = await ticksWhileTyping(page, 'http://localhost:4603/');
  const inside = await ticksWhileTyping(page, 'http://localhost:4603/?zone=inside');
  console.log('TICKS outside', outside, 'inside', inside);
  expect(outside).toBeLessThan(inside);
});
