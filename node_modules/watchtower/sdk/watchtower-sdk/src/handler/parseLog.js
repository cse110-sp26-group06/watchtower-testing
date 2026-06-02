
/**
 * Converts a captured console call into a WatchTower log event.
 *
 * The returned event matches the schema defined in
 * sdk/watchtower-sdk/src/types/log_schema.json.
 *
 * @param {string} level - Console severity level for the log event.
 * @param {any[]} [args=[]] - Raw console arguments captured by the wrapper.
 * @returns {{ event_type: "log", timestamp: string, payload: { level: string, message: string, file?: string, lineno?: number, colno?: number } }} A normalized log event.
 */
export function parseLog(level, args = []) {
  const message = formatConsoleMessage(args);

  const sourceLocation = getSourceLocationFromStack();

  return {
    event_type: "log",
    timestamp: new Date().toISOString(),
    payload: {
      level,
      message,
      ...(sourceLocation.file !== undefined ? { file: sourceLocation.file } : {}),
      ...(sourceLocation.lineno !== undefined ? { lineno: sourceLocation.lineno } : {}),
      ...(sourceLocation.colno !== undefined ? { colno: sourceLocation.colno } : {})
    }
  };
}

/**
 * Converts console arguments into a single human-readable message string.
 *
 * Strings are preserved as-is. Non-string values are serialized safely.
 *
 * @param {any[]} args - Raw console arguments to serialize.
 * @returns {string} The formatted log message.
 */
function formatConsoleMessage(args) {
  if (!args || args.length === 0) {
    return "";
  }

  return args
    .map((arg) => {
      if (typeof arg === "string") {
        return arg;
      }

      if (arg instanceof Error) {
        return arg.stack ?? arg.message;
      }

      if (typeof arg === "undefined") {
        return "undefined";
      }

      if (typeof arg === "object") {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }

      return String(arg);
    })
    .join(" ");
}

/**
 * Attempts to infer the source file and line/column information from the
 * current stack trace.
 *
 * The helper skips internal WatchTower frames so only the caller's location
 * is reported when possible.
 *
 * @returns {{ file?: string, lineno?: number, colno?: number }} Source location info if available.
 */
function getSourceLocationFromStack() {
  const stack = new Error().stack ?? "";
  const lines = stack.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    const match = trimmed.match(/\(?(.+?):(\d+)(?::(\d+))?\)?$/);
    if (!match) {
      continue;
    }

    const [, file, lineno, colno] = match;

    if (!file) {
      continue;
    }

    const isWatchtowerInternal =
      file.includes("watchtower-sdk/src") ||
      file.includes("watchtower-sdk\\src");

    if (isWatchtowerInternal) {
      continue;
    }

    return {
      file,
      lineno: Number(lineno),
      colno: colno ? Number(colno) : undefined
    };
  }

  return {
    file: undefined,
    lineno: undefined,
    colno: undefined
  };
}