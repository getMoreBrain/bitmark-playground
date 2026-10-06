// PLAN-022 Phase 0: Monaco 0.46 AMD injected (D8), and the /bundled guard.
import { expect, test } from '@playwright/test';

import {
  checkConversionAndServices,
  checkJsonEditAndSchema,
  checkScrollSync,
  waitMounted,
} from './editorChecks.mjs';

test('the core works on an injected Monaco 0.46 AMD global', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://localhost:4601/amd.html');
  const spike = await waitMounted(page);
  expect(spike.schemaApplied).toBe(true);
  expect(await page.evaluate(() => window.monaco.editor.getModels().length)).toBe(3);
  await checkConversionAndServices(page);
  await checkJsonEditAndSchema(page);
  await checkScrollSync(page);

  // D5: the host's own JSON model is not validated against the bitmark schema.
  await page.waitForTimeout(1500);
  const hostMarkers = await page.evaluate(
    () => window.monaco.editor.getModelMarkers({ resource: window.monaco.Uri.parse('inmemory://host/config.json') }).length,
  );
  expect(hostMarkers).toBe(0);
  expect(errors).toEqual([]);
});

test('/bundled beside a host Monaco warns and leaves MonacoEnvironment alone', async ({ page }) => {
  const warnings = [];
  page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
  await page.goto('http://localhost:4601/guard.html');
  await page.waitForFunction(() => window.__spike?.done, null, { timeout: 30_000 });
  const spike = await page.evaluate(() => window.__spike);
  expect(spike.detected).toBe(true);
  expect(spike.untouched).toBe(true);
  expect(warnings.some((w) => w.includes('this page already has Monaco'))).toBe(true);
});
