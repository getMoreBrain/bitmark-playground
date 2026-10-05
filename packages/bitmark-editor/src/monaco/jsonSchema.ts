// @awa-component: PLAN-021-MonacoServices
import { DEFAULT_PARSER_VERSION } from '../engine/loadBitmarkEngine';
import { log } from '../log';
import type { Monaco } from './types';

/**
 * Every model the package creates lives under this URI scheme, so the
 * bitmark JSON schema can apply to them alone and never to the host's own
 * JSON editors (PLAN-020 D5).
 */
export const BITMARK_MODEL_SCHEME = 'bitmark-editor';

/**
 * The schema's `fileMatch` for the package's models. Monaco's matcher needs
 * the double-star glob: a single `*` does not cross `/`, so
 * `bitmark-editor://*` silently matches nothing (found in PLAN-021 Phase 0).
 */
export const BITMARK_MODEL_FILE_MATCH = `${BITMARK_MODEL_SCHEME}://**`;

/** The schema's id in Monaco's JSON service. */
export const BITMARK_SCHEMA_URI = 'https://getmorebrain.github.io/bitmark/bitmark.schema.json';

/** The schema URL beside an engine URL (`…/dist/browser/x.js` → `…/schema/…`). */
export const schemaUrlFor = (engineUrl: string): string => {
  const clean = engineUrl.split('?')[0]!;
  if (clean.includes('/dist/browser/')) {
    return `${clean.split('/dist/browser/')[0]}/schema/bitmark.schema.json`;
  }
  // A local-engine route serves the package's own directories.
  return `${clean.replace(/[^/]*$/, '')}schema.json`;
};

/** The schema on jsDelivr for a parser version (an injected module has no URL). */
export const schemaUrlForVersion = (version: string = DEFAULT_PARSER_VERSION): string =>
  `https://cdn.jsdelivr.net/npm/@gmb/bitmark-parser@${version}/schema/bitmark.schema.json`;

/** Fetch the schema; `undefined` on failure (the JSON pane then checks syntax only). */
export const loadBitmarkJsonSchema = async (url: string): Promise<unknown | undefined> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as unknown;
  } catch (e) {
    log.warn('bitmark JSON schema not loaded; the JSON pane checks syntax only', e);
    return undefined;
  }
};

/**
 * Bind `schema` in Monaco's JSON service for the package's models (D5). A
 * host whose every JSON model is bitmark JSON (the playground) may widen
 * `fileMatch`. Returns false when this Monaco has no JSON language.
 */
// @awa-impl: PLAN-021-Step3 (the schema scoped to the package's model URIs)
export const bindBitmarkJsonSchema = (
  monaco: Monaco,
  schema: unknown,
  options: { fileMatch?: string[] } = {},
): boolean => {
  const json = (monaco.languages as { json?: Monaco['languages']['json'] }).json;
  if (!json?.jsonDefaults) return false;
  json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: false,
    enableSchemaRequest: false,
    schemas: [
      {
        uri: BITMARK_SCHEMA_URI,
        fileMatch: options.fileMatch ?? [BITMARK_MODEL_FILE_MATCH],
        schema,
      },
    ],
  });
  return true;
};
