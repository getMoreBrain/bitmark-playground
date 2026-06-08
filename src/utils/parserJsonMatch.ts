// @awa-component: PLAN-009-ParserJsonMatch
import isEqual from 'lodash/isEqual';

/** LED status for the WASM Check tab. */
export type WasmCheckLed = 'match' | 'mismatch' | 'neutral';

/**
 * A value is a "natural default" when it equals the default for its type:
 * string `""`, boolean `false`, number `0`, empty array `[]`, empty object `{}`.
 * `null` is NOT a natural default (it is compared as-is).
 */
const isNaturalDefault = (value: unknown): boolean => {
  if (value === '' || value === false || value === 0) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (value !== null && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length === 0;
  }
  return false;
};

/**
 * Recursively strip natural-default-valued object keys (bottom-up, so a key
 * whose value collapses to `{}` / `[]` after stripping is itself dropped).
 * Also drops `example: null` (a bpg artifact the WASM optimized output omits).
 * Array elements are normalized but never dropped (length/order preserved).
 */
export const normalizeBitJson = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeBitJson);
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      const normalized = normalizeBitJson(v);
      if (key === 'example' && normalized === null) continue; // drop `example: null`
      if (isNaturalDefault(normalized)) continue; // drop default-valued keys
      out[key] = normalized;
    }
    return out;
  }
  return value;
};

interface BitWrapperLike {
  bit?: unknown;
}

/**
 * Compare Original (JS) vs WASM optimized parser JSON:
 * - keep `entry.bit` only (strips `parser` and `bitmark`),
 * - strip natural defaults recursively from both sides,
 * - deep-equal (object-key order independent; array order significant).
 *
 * Returns `neutral` when either side is not a non-empty array (no data /
 * parser not loaded). Error states are handled by the caller.
 */
export const parserJsonMatch = (originalJson: unknown, wasmJson: unknown): WasmCheckLed => {
  if (!Array.isArray(originalJson) || !Array.isArray(wasmJson)) return 'neutral';
  if (originalJson.length === 0 || wasmJson.length === 0) return 'neutral';

  const a = originalJson.map((e) => normalizeBitJson((e as BitWrapperLike)?.bit ?? {}));
  const b = wasmJson.map((e) => normalizeBitJson((e as BitWrapperLike)?.bit ?? {}));

  return isEqual(a, b) ? 'match' : 'mismatch';
};
