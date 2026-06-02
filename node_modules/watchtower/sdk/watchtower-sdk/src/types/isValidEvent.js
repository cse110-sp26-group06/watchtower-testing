/**
 * Validates whether an event object is a supported Watchtower event
 * (error, log, or performance) and structurally correct.
 *
 * @param {object} event - The event object to validate.
 * @returns {boolean} True if the event is valid and matches its declared type.
 */
export function isValidEvent(event) {
  if (!event || typeof event !== "object") {
    return false;
  }
  switch (event.event_type) {
  case "error":
    return isErrorEvent(event);
  case "log":
    return isLogEvent(event);
  case "performance":
    return isPerformanceEvent(event);
  default:
    return false;
  }
}

/**
 * Validates an error event structure.
 *
 * Expected shape:
 * {
 *   event_type: "error",
 *   timestamp: string,
 *   payload: {
 *     message: string,
 *     stack_trace: string
 *   }
 * }
 *
 * @param {object} event - The event to validate.
 * @returns {boolean} True if the event is a valid error event.
 */
export function isErrorEvent(event) {
  return (
    event &&
    event.event_type === "error" &&
    typeof event.timestamp === "string" &&
    event.payload &&
    typeof event.payload.message === "string" &&
    typeof event.payload.stack_trace === "string"
  );
}

/**
 * Validates a log event structure.
 *
 * Expected shape:
 * {
 *   event_type: "log",
 *   timestamp: string,
 *   payload: {
 *     message: string
 *   }
 * }
 *
 * @param {object} event - The event to validate.
 * @returns {boolean} True if the event is a valid log event.
 */
export function isLogEvent(event) {
  return (
    event &&
    event.event_type === "log" &&
    typeof event.timestamp === "string" &&
    event.payload &&
    typeof event.payload.message === "string"
  );
}

/**
 * Validates a performance event and its payload based on entryType.
 *
 * Expected base shape:
 * {
 *   event_type: "performance",
 *   timestamp: string,
 *   payload: {
 *     name: string,
 *     entryType: "resource" | "paint" | "navigation",
 *     time: number,
 *     duration: number,
 *     ...entryType-specific fields
 *   }
 * }
 *
 * @param {object} event - The event to validate.
 * @returns {boolean} True if the event is a valid performance event.
 */
export function isPerformanceEvent(event) {
  if (
    !event ||
    event.event_type !== "performance" ||
    typeof event.timestamp !== "string" ||
    !event.payload
  ) {
    return false;
  }

  const { payload } = event;

  // Validate base payload properties
  if (
    typeof payload.name !== "string" ||
    typeof payload.entryType !== "string" ||
    typeof payload.time !== "number" ||
    typeof payload.duration !== "number"
  ) {
    return false;
  }

  // Validate based on entryType
  switch (payload.entryType) {
  case "resource":
    return isResourcePayload(payload);
  case "paint":
    return isPaintPayload(payload);
  case "navigation":
    return isNavigationPayload(payload);
  default:
    return false;
  }
}

/**
 * Validates a Resource Timing performance payload.
 *
 * Expected optional fields:
 * - responseStatus?: number
 *
 * @param {object} payload - The performance payload.
 * @returns {boolean} True if valid.
 */
function isResourcePayload(payload) {
  return (
    typeof payload.responseStatus === "number" ||
    payload.responseStatus === undefined
  );
}

/**
 * Validates a Paint Timing performance payload.
 *
 * Expected optional fields:
 * - paintTime?: number
 *
 * @param {object} payload - The performance payload.
 * @returns {boolean} True if valid.
 */
function isPaintPayload(payload) {
  return (
    typeof payload.paintTime === "number" ||
    payload.paintTime === undefined
  );
}

/**
 * Validates a Navigation Timing performance payload.
 *
 * Expected optional fields:
 * - type?: "navigate" | "reload" | "back_forward"
 *
 * @param {object} payload - The performance payload.
 * @returns {boolean} True if valid.
 */
function isNavigationPayload(payload) {
  return (
    payload.type === undefined ||
    ["navigate", "reload", "back_forward"].includes(payload.type)
  );
}
