/** From this length (characters), typing waits for a pause (PLAN-029 D3). */
export const LARGE_DOCUMENT_CHARS = 20_000;

/** How long a large document's conversion waits after the last keystroke. */
export const LARGE_DOCUMENT_DEBOUNCE_MS = 150;

export interface InputScheduler {
  /** An edit: run now (small text) or after a pause (large text). */
  input(text: string): void;
  /** Run a pending edit now. */
  flush(): void;
  /** Drop a pending edit. */
  cancel(): void;
}

/**
 * When an editor's edits are converted (PLAN-029 D3, D4): at once for a
 * small text; for a large one, `delayMs` after the last edit, so typing is
 * not held up by each conversion. Only the latest pending edit runs.
 */
export const createInputScheduler = (
  run: (text: string) => void,
  {
    thresholdChars = LARGE_DOCUMENT_CHARS,
    delayMs = LARGE_DOCUMENT_DEBOUNCE_MS,
  }: { thresholdChars?: number; delayMs?: number } = {},
): InputScheduler => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: string | undefined;

  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    pending = undefined;
  };

  const flush = () => {
    if (pending === undefined) return;
    const text = pending;
    cancel();
    run(text);
  };

  return {
    input(text) {
      if (text.length < thresholdChars) {
        cancel();
        run(text);
        return;
      }
      pending = text;
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    },
    flush,
    cancel,
  };
};
