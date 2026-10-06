// The README's worker-engine recipe under Vite: `?worker` on the package's
// `./worker` export (needs the playground Vite dev server on :4604 and the
// examples server on :4612).
import { expect, test } from '@playwright/test';

test('README worker recipe works under Vite', async ({ page }) => {
  await page.goto('http://localhost:4604/bitmark-playground/packages/bitmark-editor/playground-spike/worker-import.html');
  await page.waitForFunction(() => window.__result, null, { timeout: 30_000 });
  const r = await page.evaluate(() => window.__result);
  console.log('RECIPE', String(r).slice(0, 80));
  expect(r).toContain('Via ?worker');
});
