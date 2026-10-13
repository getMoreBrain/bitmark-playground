/**
 * Very basic logging system.
 *
 * Just a light wrapper around console.log.
 */

const log = (function () {
  const _log = {
    trace: console.trace.bind(console),
    debug: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    fatal: console.error.bind(console),
  };

  return _log;
})();

export { log };
