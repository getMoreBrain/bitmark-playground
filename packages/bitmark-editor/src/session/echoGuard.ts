// @awa-component: PLAN-021-Session

/**
 * Tells a host's own lagging `value` apart from a new document (for
 * controlled bindings: React `value`, Angular `[value]`, the element's
 * `value` attribute). A host re-renders with the document it last received,
 * which may be several edits behind when edits land back to back: any of the
 * recent emissions is an echo, and setting it back would undo the user's
 * typing.
 *
 * A host that deliberately sets the document back to one of its last few
 * emitted values is therefore ignored; set a different value, or use the
 * session's `setBitmark`, for that.
 */
export const createEchoGuard = (size = 20) => {
  const recent: string[] = [];
  return {
    /** The session reported `text`. */
    remember: (text: string): void => {
      recent.push(text);
      if (recent.length > size) recent.shift();
    },
    /** `text` is one of the session's own recent reports. */
    isEcho: (text: string): boolean => recent.includes(text),
  };
};
