import { isValidEvent } from "../types/isValidEvent.js";

/**
 * BatchingEngine
 *
 * Maintains separate queues for logs, errors, and performance.
 * Flushes queues based on time or count thresholds.
 * Sends batches to the backend via a provided send function.
 *
 * @class
 * @param {Object} options - Configuration options for the batching engine.
 * @param {Object} options.thresholds - Per-event-type flush thresholds.
 * @param {Function} options.sendFn - Function used to send batches to the backend.
 * @param {string} options.api_key - API key for authentication.
 * @param {string} options.service - Name of the service using the batching engine.
 * @param {string} options.environment - Environment (e.g., production, staging).
 */
class BatchingEngine {
  constructor({
    thresholds = {
      error: { maxTimeMs: 1000, maxCount: 10 },
      log:   { maxTimeMs: 3000, maxCount: 50 },
      performance:  { maxTimeMs: 2000, maxCount: 25 }
    },
    sendFn, api_key, service, environment
  }) {
    this.api_key = api_key; // API key for backend authentication
    this.service = service; // Service name for identifying the source of events
    this.environment = environment; // Environment context (e.g., production, staging)
    this.sendFn = sendFn; // Function to send batches to the backend
    this.thresholds = thresholds; // Flush thresholds for each event type

    this.queues = null; // Queues for storing events by type
    this.timers = null; // Timers for time-based flushing
    this.running = false; // Indicates whether the engine is running
  }

  /**
   * Adds an event to the appropriate queue and triggers flush checks.
   *
   * This method validates the event type, adds the event to the corresponding queue,
   * starts a timer if it's the first event in the queue, and flushes the queue if
   * the count threshold is reached.
   *
   * @method
   * @param {("log"|"error"|"performance")} type - The event type to enqueue.
   * @param {Object} event - The event payload to store in the queue.
   */
  enqueue(type, event) {
    if (!this.running) {
      return;
    }
    if (!isValidEvent(event)) {
      return;
    }
    if (type !== event.event_type) {
      return;
    }

    const queue = this.queues[type];
    queue.push(event);

    // Start timer if this is the first event in the queue
    if (queue.length === 1) {
      this.startTimer(type);
    }

    // Flush immediately if count threshold reached
    if (queue.length >= this.thresholds[type].maxCount) {
      this.flush(type).catch(() => {
        // Silently handle flush errors to prevent breaking enqueue
      });
    }
  }

  /**
   * Starts a time-based flush timer for a specific event type.
   *
   * This method schedules a timer to flush the queue after the maxTimeMs threshold
   * is reached. If a timer is already active for the event type, it does nothing.
   *
   * @method
   * @param {("log"|"error"|"performance")} type - The event type whose timer should be started.
   */
  startTimer(type) {
    // If timer already exists, do nothing
    if (this.timers[type]) {
      return;
    }

    const { maxTimeMs } = this.thresholds[type];

    this.timers[type] = setTimeout(() => {
      this.flush(type).catch(() => {
        // Silently handle flush errors to prevent breaking enqueue
      });
      this.timers[type] = null;
    }, maxTimeMs);
  }

  /**
   * Constructs a batch envelope for a specific event type.
   *
   * This method collects all events from the queue and creates a batch object
   * containing metadata (API key, service, environment) and the events.
   *
   * @method
   * @param {("log"|"error"|"performance")} type - The event type whose batch should be created.
   * @returns {Object|null} A batch envelope or null if no events exist.
   */
  createBatch(type) {
    const events = this.queues[type];
    if (events.length === 0) {
      return null;
    }
    
    return {
      api_key: this.api_key,
      service: this.service,
      environment: this.environment,
      events
    };
  }

  /**
   * Flushes a specific event queue and sends its batch to the backend.
   *
   * This method clears the timer for the event type, creates a batch from the
   * queue, sends the batch to the backend using the sendFn, and resets the queue.
   *
   * @method
   * @param {("log"|"error"|"performance")} type - The event type whose queue should be flushed.
   */
  async flush(type) {
    // Clear timer if active
    if (this.timers[type]) {
      clearTimeout(this.timers[type]);
      this.timers[type] = null;
    }

    const batch = this.createBatch(type);
    if (!batch) {
      return;
    }
      

    //const res = await this.sendFn(type, batch);
    //console.log(res.status);
    await this.sendFn(type, batch);

    this.queues[type] = [];
  }

  /**
   * Flushes all event queues regardless of thresholds.
   *
   * This method is used during shutdown, page unload, or manual flush triggers.
   * It ensures that all queues are flushed immediately.
   *
   * @method
   */
  async flushAll() {
    await this.flush("error");
    await this.flush("log");
    await this.flush("performance");
  }

  /**
   * Starts the batching engine and enables time-based flushing.
   *
   * This method initializes the internal state for queues and timers, and marks
   * the engine as running. It does not flush any events immediately.
   *
   * @method
   */
  start() {
    this.queues = {
      error: [],
      log: [],
      performance: []
    };

    this.timers = {
      error: null,
      log: null,
      performance: null
    };

    this.running = true;
  }

  /**
   * Stops the batching engine and clears all timers.
   *
   * This method prevents new events from being enqueued, clears all active timers,
   * and optionally flushes all queues to avoid losing data.
   *
   * @method
   */
  async stop() {
    this.running = false;

    // Clear timers
    ["error", "log", "performance"].forEach(type => {
      if (this.timers[type]) {
        clearTimeout(this.timers[type]);
        this.timers[type] = null;
      }
    });

    // Flush everything on stop
    await this.flushAll();
  }
}

export default BatchingEngine;
