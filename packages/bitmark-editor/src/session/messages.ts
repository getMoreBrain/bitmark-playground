import type { BitmarkEditorMessages, BitmarkSessionOptions } from './types';

export const DEFAULT_MESSAGES: BitmarkEditorMessages = {
  loading: 'Loading…',
  needsFullParser: 'This view needs the full bitmark parser.',
  stale: 'Out of date: the last edit could not be converted.',
  errorPrefix: 'Error: ',
  labels: {
    bitmark: 'bitmark',
    json: 'JSON',
    html: 'HTML',
    xml: 'XML',
    text: 'Text',
    info: 'Info',
    mappings: 'Mappings',
  },
};

/** The defaults with the host's overrides (PLAN-022 D12). */
export const resolveMessages = (
  overrides: BitmarkSessionOptions['messages'],
): BitmarkEditorMessages => ({
  ...DEFAULT_MESSAGES,
  ...overrides,
  labels: { ...DEFAULT_MESSAGES.labels, ...overrides?.labels },
});
