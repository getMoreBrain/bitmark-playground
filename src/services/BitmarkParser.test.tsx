// @awa-test: PLAN-017-Step6 (which engine a page load drives)
import { describe, expect, it } from 'vitest';

import { engineUrl } from './BitmarkParser';

const BASE = '/bitmark-playground/';

describe('engineUrl', () => {
  it('loads the published engine by default, cache-busted', () => {
    const url = engineUrl('', BASE, 42);
    expect(url).toBe(
      'https://cdn.jsdelivr.net/npm/@gmb/bitmark-parser@latest/dist/browser/bitmark-parser.min.js?_=42',
    );
  });

  it('honours ?v2= for a published version', () => {
    expect(engineUrl('?v2=7.0.0', BASE, 42)).toContain('@gmb/bitmark-parser@7.0.0/');
  });

  it('drives this checkout’s own build with ?engine=local', () => {
    // Served by the dev server from the parser repo this playground is a
    // submodule of — how an unreleased parser is tried out.
    expect(engineUrl('?engine=local', BASE, 42)).toBe(
      '/bitmark-playground/local-engine/bitmark-parser.min.js?_=42',
    );
  });

  it('ignores ?v2= when the local engine is asked for', () => {
    expect(engineUrl('?v2=6.9.0&engine=local', BASE, 42)).toContain('local-engine');
  });
});
