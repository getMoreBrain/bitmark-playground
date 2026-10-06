import { DEFAULT_PARSER_VERSION } from '../engine/loadBitmarkEngine';
import { log } from '../log';
import type { Monaco } from './types';

/**
 * Every model the package creates lives under this URI scheme, so the
 * bitmark JSON schema can apply to them alone and never to the host's own
 * JSON editors (PLAN-022 D5).
 */
export const BITMARK_MODEL_SCHEME = 'bitmark-editor';

/**
 * The schema's `fileMatch` for the package's models. Monaco's matcher needs
 * the double-star glob: a single `*` does not cross `/`, so
 * `bitmark-editor://*` silently matches nothing (found in PLAN-023 Phase 0).
 */
export const BITMARK_MODEL_FILE_MATCH = `${BITMARK_MODEL_SCHEME}://**`;

/** What the schema binding needs of Monaco's JSON language service. */
interface JsonDiagnosticsOptions {
  validate?: boolean;
  allowComments?: boolean;
  enableSchemaRequest?: boolean;
  schemas?: { uri: string; fileMatch?: string[]; schema?: unknown }[];
  [other: string]: unknown;
}
interface JsonDefaults {
  /** The options in force (Monaco has it on every version 0.46+). */
  readonly diagnosticsOptions?: JsonDiagnosticsOptions;
  setDiagnosticsOptions(options: JsonDiagnosticsOptions): void;
}

/**
 * Monaco's JSON defaults, wherever this Monaco keeps them: the top-level
 * `monaco.json` (0.55+; `languages.json` is then only a deprecation stub),
 * or `monaco.languages.json` (0.46 to 0.54). `undefined`: no JSON language.
 */
export const jsonDefaultsOf = (monaco: Monaco): JsonDefaults | undefined =>
  (monaco as unknown as { json?: { jsonDefaults?: JsonDefaults } }).json?.jsonDefaults ??
  (monaco.languages as unknown as { json?: { jsonDefaults?: JsonDefaults } }).json?.jsonDefaults;

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
export const bindBitmarkJsonSchema = (
  monaco: Monaco,
  schema: unknown,
  options: { fileMatch?: string[] } = {},
): boolean => {
  const jsonDefaults = jsonDefaultsOf(monaco);
  if (!jsonDefaults) return false;
  // Merge, never replace (D5): the host's own schemas and settings stay; only
  // the bitmark schema's entry is added or replaced.
  const current = jsonDefaults.diagnosticsOptions ?? {};
  jsonDefaults.setDiagnosticsOptions({
    ...current,
    validate: current.validate ?? true,
    schemas: [
      ...(current.schemas ?? []).filter((entry) => entry.uri !== BITMARK_SCHEMA_URI),
      {
        uri: BITMARK_SCHEMA_URI,
        fileMatch: options.fileMatch ?? [BITMARK_MODEL_FILE_MATCH],
        schema,
      },
    ],
  });
  return true;
};
