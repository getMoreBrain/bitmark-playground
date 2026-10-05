// PLAN-020 Phase 0: the playground injects its own Monaco (/esm path, D8).
// Needs the playground's Vite dev server on :4604 (see the Phase 0 notes).
import { expect, test } from '@playwright/test';

import {
  checkConversionAndServices,
  checkJsonEditAndSchema,
  checkScrollSync,
  waitMounted,
} from './editorChecks.mjs';

test('the core works on the playground Monaco 0.52 ESM with its own workers', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://localhost:4604/bitmark-playground/packages/bitmark-editor/playground-spike/esm.html');
  const spike = await waitMounted(page);
  expect(spike.schemaApplied).toBe(true);
  expect(spike.globalMonaco).toBe(false); // one Monaco, the playground's module instance
  await checkConversionAndServices(page);
  await checkJsonEditAndSchema(page);
  await checkScrollSync(page);
  expect(errors).toEqual([]);
});
