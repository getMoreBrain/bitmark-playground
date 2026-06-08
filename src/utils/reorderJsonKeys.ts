// @awa-component: PLAN-010-ReorderJsonKeys

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Return a copy of `target` whose object keys are ordered to match `reference`,
 * recursively down the tree. Keys present in `target` but not in `reference` are
 * kept (appended in their original order) so no data is lost. Arrays keep their
 * own length/order; their elements are reordered pairwise by index. Primitives
 * and type mismatches return `target` unchanged.
 */
export const reorderKeysToReference = (reference: unknown, target: unknown): unknown => {
  if (Array.isArray(target)) {
    const ref = Array.isArray(reference) ? reference : [];
    return target.map((el, i) => reorderKeysToReference(ref[i], el));
  }

  if (isPlainObject(target)) {
    const ref = isPlainObject(reference) ? reference : {};
    const out: Record<string, unknown> = {};
    // Reference order first.
    for (const key of Object.keys(ref)) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        out[key] = reorderKeysToReference(ref[key], target[key]);
      }
    }
    // Then any target-only keys, in their original order.
    for (const key of Object.keys(target)) {
      if (!Object.prototype.hasOwnProperty.call(out, key)) {
        out[key] = reorderKeysToReference(undefined, target[key]);
      }
    }
    return out;
  }

  return target;
};

/**
 * Reorder `targetJson`'s object keys to match `referenceJson`, returning a
 * 2-space-indented JSON string. Falls back to the original `targetJson` string
 * if either input is not valid JSON.
 */
export const reorderJsonStringToReference = (referenceJson: string, targetJson: string): string => {
  try {
    const reference = JSON.parse(referenceJson);
    const target = JSON.parse(targetJson);
    return JSON.stringify(reorderKeysToReference(reference, target), undefined, 2);
  } catch {
    return targetJson;
  }
};
