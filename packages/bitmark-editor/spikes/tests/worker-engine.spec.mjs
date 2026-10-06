// PLAN-023 Step 1a in a real browser (needs the playground Vite dev server on :4604
// and `node serve.mjs` for the parser on :4602).
import { expect, test } from '@playwright/test';

test('the worker engine runs in a real Worker and keeps the main thread free', async ({ page }) => {
  page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
  await page.goto('http://localhost:4604/bitmark-playground/packages/bitmark-editor/playground-spike/worker.html');
  await page.waitForFunction(() => window.__spike?.done || window.__spike?.error, null, { timeout: 120_000 });
  const s = await page.evaluate(() => window.__spike);
  console.log('WORKER-ENGINE', JSON.stringify(s));
  expect(s.error).toBeUndefined();
  expect(s.same).toBe(true);
  // Single results never make a long task; a burst of three large ones
  // occasionally does (~100-150 ms, likely GC), against ~1.1 s on the main thread.
  expect(s.worker.longest).toBeLessThan(s.mainThread.longest * 0.2);
  for (const k of ["w_jsonText", "w_tokens", "w_diagnostics"]) expect(s[k].longest).toBeLessThan(50);
});
