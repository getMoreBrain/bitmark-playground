// PLAN-020 Phase 0: the no-bundler static spike (D4, D12).
import { expect, test } from '@playwright/test';

import {
  checkConversionAndServices,
  checkJsonEditAndSchema,
  checkScrollSync,
  waitMounted,
} from './editorChecks.mjs';

const PAGE = 'http://localhost:4601/index.html';

test('the bundle loads cross-origin, with blob workers, and every service works', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(PAGE);
  const spike = await waitMounted(page);
  expect(spike.schemaApplied).toBe(true);
  await expect(page.locator('[data-try-it-source]')).toBeHidden();
  await checkConversionAndServices(page);
  await checkJsonEditAndSchema(page);
  await checkScrollSync(page);
  expect(errors).toEqual([]);
});

test('narrow touch screens keep the static example and load nothing', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const requested = [];
  page.on('request', (r) => requested.push(r.url()));
  await page.goto(PAGE);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__spike.narrow)).toBe(true);
  await expect(page.locator('[data-try-it-source]')).toBeVisible();
  expect(requested.filter((u) => u.includes(':4602'))).toEqual([]);
  await context.close();
});

test('a blocked CDN leaves the static example in place', async ({ page }) => {
  await page.route('http://localhost:4602/**', (r) => r.abort());
  await page.goto(PAGE);
  await page.waitForFunction(() => window.__spike?.error, null, { timeout: 10_000 });
  await expect(page.locator('[data-try-it-source]')).toBeVisible();
  await expect(page.locator('[data-try-it-editor]')).toBeHidden();
});

test('start-up: first visit (cold cache) against a later page (warm cache)', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const measure = async () => {
    let bytes = 0;
    const onResponse = async (r) => {
      if (!r.url().includes(':4602')) return;
      const fromCache = r.fromServiceWorker() || (await r.request().sizes().catch(() => null))?.responseBodySize === 0;
      if (!fromCache) bytes += Number(r.headers()['content-length'] ?? 0);
    };
    page.on('response', onResponse);
    await page.goto(PAGE);
    const s = await waitMounted(page);
    page.off('response', onResponse);
    return {
      idleToBundle: Math.round(s.bundle - s.idle),
      bundleToEngine: Math.round(s.engine - s.bundle),
      idleToMounted: Math.round(s.mounted - s.idle),
      startToMounted: Math.round(s.mounted - s.start),
    };
  };
  const cold = await measure();
  const warm1 = await measure();
  const warm2 = await measure();
  console.log('TIMING cold ', JSON.stringify(cold));
  console.log('TIMING warm1', JSON.stringify(warm1));
  console.log('TIMING warm2', JSON.stringify(warm2));
  await context.close();
});
