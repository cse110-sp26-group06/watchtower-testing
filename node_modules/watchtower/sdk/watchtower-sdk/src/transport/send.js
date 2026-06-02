import { sendErrorBatch, sendLogBatch, sendSpanBatch } from "../api/index.js";

/**
 * Routes a batch of events to the correct API endpoint based on event type.
 *
 * @param {"error" | "log" | "span"} type - The type of event batch being sent.
 * @param {Array<Object>} batch - The array of events to send.
 * @returns {Promise<any>} The result of the underlying API call.
 */
export const send = async (type, batch) => {
  const router = {
    error: sendErrorBatch,
    log: sendLogBatch,
    span: sendSpanBatch
  };

  const fn = router[type];

  if (!fn) {
    throw new Error(`Unknown event type: ${type}`);
  }

  return fn(batch);
};