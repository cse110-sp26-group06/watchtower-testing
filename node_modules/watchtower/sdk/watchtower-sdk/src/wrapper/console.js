
/**
 * Stores the original console methods so WatchTower can forward logs
 * without breaking default console behavior.
 */
export const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info
};

/**
 * Applies WatchTower's console overrides.
 * Each override captures log metadata, forwards the event to the
 * batching pipeline, and then calls the original console method.
 *
 * @param {Function} captureFn - Function invoked with (level, args)
 *                               to parse and enqueue a WatchTower log event.
 */
export function patchConsole(captureFn) {
  console.log = (...args) => {
    captureFn("log", args);
    originalConsole.log(...args);
  };

  console.warn = (...args) => {
    captureFn("warn", args);
    originalConsole.warn(...args);
  };

  console.error = (...args) => {
    captureFn("error", args);
    originalConsole.error(...args);
  };

  console.info = (...args) => {
    captureFn("info", args);
    originalConsole.info(...args);
  };
}