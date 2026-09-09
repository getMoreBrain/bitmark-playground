// @awa-test: PLAN-017-Step5 (the JSON pane validates against the parser's own schema)
import * as monaco from 'monaco-editor';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { log } from '../logging/log';
import { BITMARK_SCHEMA_URI, registerBitmarkJsonSchema, schemaUrlFor } from './bitmarkJsonSchema';

const CDN =
  'https://cdn.jsdelivr.net/npm/@gmb/bitmark-parser@7.0.0/dist/browser/bitmark-parser.min.js';

describe('schemaUrlFor', () => {
  it('finds the schema published beside a CDN engine, ignoring the cache-buster', () => {
    expect(schemaUrlFor(`${CDN}?_=123`)).toBe(
      'https://cdn.jsdelivr.net/npm/@gmb/bitmark-parser@7.0.0/schema/bitmark.schema.json',
    );
  });

  it('finds it beside a local engine', () => {
    expect(schemaUrlFor('/bitmark-playground/local-engine/bitmark-parser.min.js?_=1')).toBe(
      '/bitmark-playground/local-engine/schema.json',
    );
  });
});

describe('registerBitmarkJsonSchema', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hands the fetched schema to Monaco’s JSON language service', async () => {
    const schema = { $id: 'bitmark', type: 'array' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => schema } as Response),
    );
    const setDiagnosticsOptions = vi
      .spyOn(monaco.languages.json.jsonDefaults, 'setDiagnosticsOptions')
      .mockImplementation(() => {});

    await expect(registerBitmarkJsonSchema(CDN)).resolves.toBe(true);
    const options = setDiagnosticsOptions.mock.calls[0][0] as {
      validate: boolean;
      schemas: { uri: string; fileMatch: string[]; schema: unknown }[];
    };
    expect(options.validate).toBe(true);
    expect(options.schemas[0]).toEqual({
      uri: BITMARK_SCHEMA_URI,
      fileMatch: ['*'],
      schema,
    });
  });

  it('leaves the JSON pane as it was when the schema cannot be fetched', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response));
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const setDiagnosticsOptions = vi
      .spyOn(monaco.languages.json.jsonDefaults, 'setDiagnosticsOptions')
      .mockImplementation(() => {});

    await expect(registerBitmarkJsonSchema(CDN)).resolves.toBe(false);
    expect(setDiagnosticsOptions).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });
});
