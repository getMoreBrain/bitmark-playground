/** The package's console output, prefixed so a host can tell it apart. */
const PREFIX = '[bitmark-editor]';
const warned = new Set<string>();

export const log = {
  warn: (...args: unknown[]): void => console.warn(PREFIX, ...args),
  error: (...args: unknown[]): void => console.error(PREFIX, ...args),
  /** Warn once per distinct `key` for the page's lifetime. */
  warnOnce: (key: string, ...args: unknown[]): void => {
    if (warned.has(key)) return;
    warned.add(key);
    console.warn(PREFIX, ...args);
  },
};
