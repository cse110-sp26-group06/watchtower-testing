import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import BatchingEngine from './BatchingEngine.js';

/**
 * Comprehensive Unit Tests for BatchingEngine
 *
 * This test suite covers:
 * - Setup & Mocks
 * - Initialization Tests
 * - Enqueue Behavior
 * - Count-Based Flush
 * - Time-Based Flush
 * - Batch Envelope Structure
 * - flush(type) Behavior
 * - flushAll Behavior
 * - Stop Behavior
 * - Custom Threshold Overrides
 * - Edge Cases
 * - Concurrency / Ordering
 */

describe('BatchingEngine', () => {
  let engine;
  let mockSendFn;

  // Helper functions to generate realistic events
  const createErrorEvent = (id = 1) => ({
    event_type: 'error',
    timestamp: new Date().toISOString(),
    payload: {
      message: `Error ${id}: Null pointer exception`,
      type: 'TypeError',
      stack_trace: `Error: Null pointer exception\n    at Object.<anonymous> (file.js:10:15)\n    at processRequest (index.js:5:3)`,
      file: 'file.js',
      lineno: 10,
      colno: 15,
      severity: 'critical'
    }
  });

  const createLogEvent = (id = 1) => ({
    event_type: 'log',
    timestamp: new Date().toISOString(),
    payload: {
      level: 'info',
      message: `Log message ${id}`,
      file: 'app.js',
      lineno: 42,
      colno: 5
    }
  });

  const createPerformanceEvent = (entryType = 'resource', id = 1) => {
    const baseEvent = {
      event_type: 'performance',
      timestamp: new Date().toISOString(),
      payload: {
        name: `https://api.example.com/data-${id}`,
        entryType,
        time: 1000 + id * 10,
        duration: 50 + id
      }
    };

    // Add type-specific fields
    switch (entryType) {
    case 'resource':
      baseEvent.payload.responseStatus = 200;
      baseEvent.payload.transferSize = 1024 * (5 + id);
      baseEvent.payload.fetchStart = 1000;
      baseEvent.payload.responseEnd = 1050 + id;
      break;
    case 'paint':
      baseEvent.payload.paintTime = 100 + id;
      baseEvent.payload.presentationTime = 105 + id;
      break;
    case 'navigation':
      baseEvent.payload.type = 'navigate';
      baseEvent.payload.domContentLoadedEventEnd = 1200 + id;
      baseEvent.payload.loadEventEnd = 1500 + id;
      break;
    }

    return baseEvent;
  };

  // ========== SETUP & MOCKS ==========
  beforeEach(() => {
    vi.useFakeTimers();
    mockSendFn = vi.fn().mockResolvedValue({ status: 200 });
  });

  afterEach(async () => {
    vi.clearAllTimers();
    vi.useRealTimers();
    if (engine && engine.running) {
      await engine.stop();
    }
  });

  // ========== 1. SETUP & MOCKS ==========
  describe('1. Setup & Mocks', () => {
    it('should successfully mock sendFn and track calls', async () => {
      engine = new BatchingEngine({
        sendFn: mockSendFn,
        api_key: 'test-key',
        service: 'test-service',
        environment: 'test'
      });
      engine.start();

      engine.enqueue('error', createErrorEvent());
      vi.advanceTimersByTime(1000);

      expect(mockSendFn).toHaveBeenCalledOnce();
      const call = mockSendFn.mock.calls[0];
      expect(call[0]).toBe('error');
      expect(call[1]).toHaveProperty('events');
    });
  });

  // ========== 2. INITIALIZATION TESTS ==========
  describe('2. Initialization Tests', () => {
    describe('2.1 start() initializes internal state', () => {
      it('should initialize empty queues for all event types', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });

        engine.start();

        expect(engine.queues).toHaveProperty('error');
        expect(engine.queues).toHaveProperty('log');
        expect(engine.queues).toHaveProperty('performance');
        expect(engine.queues.error).toEqual([]);
        expect(engine.queues.log).toEqual([]);
        expect(engine.queues.performance).toEqual([]);
      });

      it('should initialize null timers for all event types', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });

        engine.start();

        expect(engine.timers).toHaveProperty('error');
        expect(engine.timers).toHaveProperty('log');
        expect(engine.timers).toHaveProperty('performance');
        expect(engine.timers.error).toBeNull();
        expect(engine.timers.log).toBeNull();
        expect(engine.timers.performance).toBeNull();
      });

      it('should set running to true', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });

        expect(engine.running).toBe(false);
        engine.start();
        expect(engine.running).toBe(true);
      });
    });

    describe('2.2 stop() clears timers', () => {
      it('should clear all timers after stop', async () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });

        engine.start();
        engine.enqueue('error', createErrorEvent());

        expect(engine.timers.error).not.toBeNull();

        await engine.stop();

        expect(engine.timers.error).toBeNull();
        expect(engine.timers.log).toBeNull();
        expect(engine.timers.performance).toBeNull();
      });

      it('should set running to false', async () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });

        engine.start();
        expect(engine.running).toBe(true);

        await engine.stop();
        expect(engine.running).toBe(false);
      });
    });
  });

  // ========== 3. ENQUEUE BEHAVIOR ==========
  describe('3. Enqueue Behavior', () => {
    describe('3.1 Enqueue pushes event into correct queue', () => {
      it('should enqueue error event into error queue', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        const event = createErrorEvent();
        engine.enqueue('error', event);

        expect(engine.queues.error).toHaveLength(1);
        expect(engine.queues.error[0]).toBe(event);
      });

      it('should enqueue log event into log queue', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        const event = createLogEvent();
        engine.enqueue('log', event);

        expect(engine.queues.log).toHaveLength(1);
        expect(engine.queues.log[0]).toBe(event);
      });

      it('should enqueue performance event into performance queue', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        const event = createPerformanceEvent('resource');
        engine.enqueue('performance', event);

        expect(engine.queues.performance).toHaveLength(1);
        expect(engine.queues.performance[0]).toBe(event);
      });
    });

    describe('3.2 Enqueue rejects invalid type', () => {
      it('should not enqueue with mismatched event_type', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        const event = createErrorEvent();
        engine.enqueue('log', event); // Mismatch: type is 'log' but event_type is 'error'

        expect(engine.queues.error).toHaveLength(0);
        expect(engine.queues.log).toHaveLength(0);
      });

      it('should not enqueue invalid event structure', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        engine.enqueue('error', { message: 'test' }); // Invalid: missing required fields

        expect(engine.queues.error).toHaveLength(0);
      });
    });

    describe('3.3 First enqueue starts a timer', () => {
      it('should start timer on first enqueue', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        expect(engine.timers.error).toBeNull();

        engine.enqueue('error', createErrorEvent());

        expect(engine.timers.error).not.toBeNull();
      });

      it('should not start timer before any enqueue', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        expect(engine.timers.error).toBeNull();
        expect(engine.timers.log).toBeNull();
        expect(engine.timers.performance).toBeNull();
      });
    });

    describe('3.4 Subsequent enqueues do NOT create new timers', () => {
      it('should not create new timer on second enqueue', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        engine.enqueue('error', createErrorEvent(1));
        const firstTimer = engine.timers.error;

        engine.enqueue('error', createErrorEvent(2));
        const secondTimer = engine.timers.error;

        expect(firstTimer).toBe(secondTimer);
        expect(engine.queues.error).toHaveLength(2);
      });
    });
  });

  // ========== 4. COUNT-BASED FLUSH ==========
  describe('4. Count-Based Flush', () => {
    describe('4.1 Flush triggers when maxCount reached', () => {
      it('should flush errors when maxCount (10) reached', async () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test',
          thresholds: {
            error: { maxTimeMs: 5000, maxCount: 10 },
            log: { maxTimeMs: 5000, maxCount: 50 },
            performance: { maxTimeMs: 5000, maxCount: 25 }
          }
        });
        engine.start();

        for (let i = 0; i < 10; i++) {
          engine.enqueue('error', createErrorEvent(i));
        }

        await vi.runAllTimersAsync();

        expect(mockSendFn).toHaveBeenCalledOnce();
        expect(engine.queues.error).toHaveLength(0);
      });

      it('should flush logs when maxCount (50) reached', async () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test',
          thresholds: {
            error: { maxTimeMs: 5000, maxCount: 10 },
            log: { maxTimeMs: 5000, maxCount: 50 },
            performance: { maxTimeMs: 5000, maxCount: 25 }
          }
        });
        engine.start();

        for (let i = 0; i < 50; i++) {
          engine.enqueue('log', createLogEvent(i));
        }

        await vi.runAllTimersAsync();

        expect(mockSendFn).toHaveBeenCalledOnce();
        expect(engine.queues.log).toHaveLength(0);
      });
    });

    describe('4.2 Flush triggers immediately (no timer wait)', () => {
      it('should flush synchronously when count threshold reached', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test',
          thresholds: {
            error: { maxTimeMs: 5000, maxCount: 3 },
            log: { maxTimeMs: 5000, maxCount: 50 },
            performance: { maxTimeMs: 5000, maxCount: 25 }
          }
        });
        engine.start();

        engine.enqueue('error', createErrorEvent(1));
        engine.enqueue('error', createErrorEvent(2));
        expect(mockSendFn).not.toHaveBeenCalled();

        engine.enqueue('error', createErrorEvent(3));
        expect(mockSendFn).toHaveBeenCalledOnce();
      });
    });

    describe('4.3 Timer is cleared after count-flush', () => {
      it('should clear timer after count-based flush', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test',
          thresholds: {
            error: { maxTimeMs: 5000, maxCount: 2 },
            log: { maxTimeMs: 5000, maxCount: 50 },
            performance: { maxTimeMs: 5000, maxCount: 25 }
          }
        });
        engine.start();

        engine.enqueue('error', createErrorEvent(1));
        expect(engine.timers.error).not.toBeNull();

        engine.enqueue('error', createErrorEvent(2));
        expect(engine.timers.error).toBeNull();
      });
    });
  });

  // ========== 5. TIME-BASED FLUSH ==========
  describe('5. Time-Based Flush', () => {
    describe('5.1 Flush triggers after maxTimeMs', () => {
      it('should flush error queue after 1000ms threshold', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test',
          thresholds: {
            error: { maxTimeMs: 1000, maxCount: 10 },
            log: { maxTimeMs: 5000, maxCount: 50 },
            performance: { maxTimeMs: 5000, maxCount: 25 }
          }
        });
        engine.start();

        engine.enqueue('error', createErrorEvent());
        expect(mockSendFn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1000);
        expect(mockSendFn).toHaveBeenCalledOnce();
      });

      it('should flush log queue after 3000ms threshold', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test',
          thresholds: {
            error: { maxTimeMs: 1000, maxCount: 10 },
            log: { maxTimeMs: 3000, maxCount: 50 },
            performance: { maxTimeMs: 5000, maxCount: 25 }
          }
        });
        engine.start();

        engine.enqueue('log', createLogEvent());
        vi.advanceTimersByTime(2999);
        expect(mockSendFn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(mockSendFn).toHaveBeenCalledOnce();
      });
    });

    describe('5.2 Timer resets after flush', () => {
      it('should clear timer after time-based flush', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test',
          thresholds: {
            error: { maxTimeMs: 1000, maxCount: 10 },
            log: { maxTimeMs: 5000, maxCount: 50 },
            performance: { maxTimeMs: 5000, maxCount: 25 }
          }
        });
        engine.start();

        engine.enqueue('error', createErrorEvent());
        expect(engine.timers.error).not.toBeNull();

        vi.advanceTimersByTime(1000);
        expect(engine.timers.error).toBeNull();
      });
    });

    describe('5.3 Timer does NOT flush early', () => {
      it('should not flush before time threshold reached', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test',
          thresholds: {
            error: { maxTimeMs: 1000, maxCount: 10 },
            log: { maxTimeMs: 5000, maxCount: 50 },
            performance: { maxTimeMs: 5000, maxCount: 25 }
          }
        });
        engine.start();

        engine.enqueue('error', createErrorEvent());
        vi.advanceTimersByTime(999);

        expect(mockSendFn).not.toHaveBeenCalled();
        expect(engine.queues.error).toHaveLength(1);
      });
    });
  });

  // ========== 6. BATCH ENVELOPE STRUCTURE ==========
  describe('6. Batch Envelope Structure', () => {
    describe('6.1 createBatch returns correct envelope', () => {
      it('should create batch with correct metadata and events', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-api-key',
          service: 'auth-service',
          environment: 'staging',
          thresholds: {
            error: { maxTimeMs: 1000, maxCount: 10 },
            log: { maxTimeMs: 5000, maxCount: 50 },
            performance: { maxTimeMs: 5000, maxCount: 25 }
          }
        });
        engine.start();

        const event1 = createLogEvent(1);
        const event2 = createLogEvent(2);

        engine.enqueue('log', event1);
        engine.enqueue('log', event2);

        const batch = engine.createBatch('log');

        expect(batch).toHaveProperty('api_key', 'test-api-key');
        expect(batch).toHaveProperty('service', 'auth-service');
        expect(batch).toHaveProperty('environment', 'staging');
        expect(batch).toHaveProperty('events');
        expect(batch.events).toHaveLength(2);
        expect(batch.events[0]).toBe(event1);
        expect(batch.events[1]).toBe(event2);
      });
    });

    describe('6.2 createBatch returns null for empty queue', () => {
      it('should return null when queue is empty', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        const batch = engine.createBatch('performance');
        expect(batch).toBeNull();
      });
    });
  });

  // ========== 7. FLUSH(TYPE) BEHAVIOR ==========
  describe('7. flush(type) Behavior', () => {
    describe('7.1 flush sends batch and clears queue', () => {
      it('should send batch and clear queue', async () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        engine.enqueue('log', createLogEvent(1));
        engine.enqueue('log', createLogEvent(2));

        await engine.flush('log');

        expect(mockSendFn).toHaveBeenCalledOnce();
        expect(engine.queues.log).toHaveLength(0);
      });
    });

    describe('7.2 flush does nothing on empty queue', () => {
      it('should not call sendFn when queue is empty', async () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        await engine.flush('error');

        expect(mockSendFn).not.toHaveBeenCalled();
      });
    });

    describe('7.3 flush clears active timer', () => {
      it('should clear timer when flushing', async () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        engine.enqueue('error', createErrorEvent());
        expect(engine.timers.error).not.toBeNull();

        await engine.flush('error');

        expect(engine.timers.error).toBeNull();
      });
    });
  });

  // ========== 8. FLUSHALL BEHAVIOR ==========
  describe('8. flushAll Behavior', () => {
    describe('8.1 flushAll flushes all non-empty queues', () => {
      it('should flush all three queues', async () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        engine.enqueue('error', createErrorEvent());
        engine.enqueue('log', createLogEvent());
        engine.enqueue('performance', createPerformanceEvent('resource'));

        await engine.flushAll();

        expect(mockSendFn).toHaveBeenCalledTimes(3);
        expect(engine.queues.error).toHaveLength(0);
        expect(engine.queues.log).toHaveLength(0);
        expect(engine.queues.performance).toHaveLength(0);
      });

      it('should only flush non-empty queues', async () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        engine.enqueue('error', createErrorEvent());

        await engine.flushAll();

        expect(mockSendFn).toHaveBeenCalledOnce();
      });
    });

    describe('8.2 flushAll clears all timers', () => {
      it('should clear all timers after flushAll', async () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        engine.enqueue('error', createErrorEvent());
        engine.enqueue('log', createLogEvent());
        engine.enqueue('performance', createPerformanceEvent('resource'));

        expect(engine.timers.error).not.toBeNull();
        expect(engine.timers.log).not.toBeNull();
        expect(engine.timers.performance).not.toBeNull();

        await engine.flushAll();

        expect(engine.timers.error).toBeNull();
        expect(engine.timers.log).toBeNull();
        expect(engine.timers.performance).toBeNull();
      });
    });
  });

  // ========== 9. STOP BEHAVIOR ==========
  describe('9. Stop Behavior', () => {
    describe('9.1 stop() prevents new timers from being scheduled', () => {
      it('should prevent enqueue after stop', async () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        await engine.stop();

        engine.enqueue('error', createErrorEvent());

        expect(engine.queues.error).toHaveLength(0);
        expect(engine.timers.error).toBeNull();
      });
    });

    describe('9.2 stop() optionally flushes all queues', () => {
      it('should flush all queues on stop', async () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        engine.enqueue('error', createErrorEvent());
        engine.enqueue('log', createLogEvent());
        engine.enqueue('performance', createPerformanceEvent('resource'));

        await engine.stop();

        expect(mockSendFn).toHaveBeenCalledTimes(3);
        expect(engine.queues.error).toHaveLength(0);
        expect(engine.queues.log).toHaveLength(0);
        expect(engine.queues.performance).toHaveLength(0);
      });
    });
  });

  // ========== 10. CUSTOM THRESHOLD OVERRIDES ==========
  describe('10. Custom Threshold Overrides', () => {
    describe('10.1 Custom maxCount respected', () => {
      it('should flush with custom maxCount of 2', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test',
          thresholds: {
            error: { maxTimeMs: 5000, maxCount: 2 },
            log: { maxTimeMs: 5000, maxCount: 50 },
            performance: { maxTimeMs: 5000, maxCount: 25 }
          }
        });
        engine.start();

        engine.enqueue('error', createErrorEvent(1));
        expect(mockSendFn).not.toHaveBeenCalled();

        engine.enqueue('error', createErrorEvent(2));
        expect(mockSendFn).toHaveBeenCalledOnce();
      });

      it('should respect different custom maxCount for each type', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test',
          thresholds: {
            error: { maxTimeMs: 5000, maxCount: 2 },
            log: { maxTimeMs: 5000, maxCount: 3 },
            performance: { maxTimeMs: 5000, maxCount: 25 }
          }
        });
        engine.start();

        engine.enqueue('error', createErrorEvent(1));
        engine.enqueue('error', createErrorEvent(2));
        expect(mockSendFn).toHaveBeenCalledOnce();

        mockSendFn.mockClear();

        engine.enqueue('log', createLogEvent(1));
        engine.enqueue('log', createLogEvent(2));
        expect(mockSendFn).not.toHaveBeenCalled();

        engine.enqueue('log', createLogEvent(3));
        expect(mockSendFn).toHaveBeenCalledOnce();
      });
    });

    describe('10.2 Custom maxTimeMs respected', () => {
      it('should flush with custom maxTimeMs of 100', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test',
          thresholds: {
            error: { maxTimeMs: 100, maxCount: 10 },
            log: { maxTimeMs: 5000, maxCount: 50 },
            performance: { maxTimeMs: 5000, maxCount: 25 }
          }
        });
        engine.start();

        engine.enqueue('error', createErrorEvent());
        vi.advanceTimersByTime(100);

        expect(mockSendFn).toHaveBeenCalledOnce();
      });

      it('should respect different custom maxTimeMs for each type', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test',
          thresholds: {
            error: { maxTimeMs: 100, maxCount: 10 },
            log: { maxTimeMs: 200, maxCount: 50 },
            performance: { maxTimeMs: 5000, maxCount: 25 }
          }
        });
        engine.start();

        engine.enqueue('error', createErrorEvent());
        engine.enqueue('log', createLogEvent());

        vi.advanceTimersByTime(100);
        expect(mockSendFn).toHaveBeenCalledOnce();

        vi.advanceTimersByTime(100);
        expect(mockSendFn).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ========== 11. EDGE CASES ==========
  describe('11. Edge Cases', () => {
    describe('11.1 Multiple flush triggers at same time', () => {
      it('should flush multiple queues independently when timers expire simultaneously', async () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test',
          thresholds: {
            error: { maxTimeMs: 1000, maxCount: 10 },
            log: { maxTimeMs: 1000, maxCount: 50 },
            performance: { maxTimeMs: 5000, maxCount: 25 }
          }
        });
        engine.start();

        engine.enqueue('error', createErrorEvent());
        engine.enqueue('log', createLogEvent());

        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();

        expect(mockSendFn).toHaveBeenCalledTimes(2);
        expect(engine.queues.error).toHaveLength(0);
        expect(engine.queues.log).toHaveLength(0);
      });
    });

    describe('11.2 Enqueue after flush restarts timer', () => {
      it('should restart timer after count-based flush', async () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test',
          thresholds: {
            error: { maxTimeMs: 1000, maxCount: 2 },
            log: { maxTimeMs: 5000, maxCount: 50 },
            performance: { maxTimeMs: 5000, maxCount: 25 }
          }
        });
        engine.start();

        engine.enqueue('error', createErrorEvent(1));
        engine.enqueue('error', createErrorEvent(2));
        expect(engine.timers.error).toBeNull();

        await vi.runAllTimersAsync();

        engine.enqueue('error', createErrorEvent(3));
        expect(engine.timers.error).not.toBeNull();
      });

      it('should restart timer after time-based flush', async () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test',
          thresholds: {
            error: { maxTimeMs: 1000, maxCount: 10 },
            log: { maxTimeMs: 5000, maxCount: 50 },
            performance: { maxTimeMs: 5000, maxCount: 25 }
          }
        });
        engine.start();

        engine.enqueue('error', createErrorEvent(1));
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
        expect(engine.timers.error).toBeNull();

        engine.enqueue('error', createErrorEvent(2));
        expect(engine.timers.error).not.toBeNull();
      });
    });

    describe('11.3 sendFn throws — engine should not crash', () => {
      it('should continue running even if sendFn throws', async () => {
        const throwingMockSendFn = vi
          .fn()
          .mockRejectedValue(new Error('Network error'));

        engine = new BatchingEngine({
          sendFn: throwingMockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        engine.enqueue('error', createErrorEvent());

        try {
          await engine.flush('error');
        } catch (e) {
          // Catch the error
        }

        expect(engine.running).toBe(true);

        // Switch to working mock for second enqueue
        engine.sendFn = vi.fn().mockResolvedValue({ status: 200 });

        engine.enqueue('error', createErrorEvent(2));
        expect(engine.queues.error).toHaveLength(2);
      });
    });

    describe('11.4 Events preserved until flush', () => {
      it('should preserve events until flush is called', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test',
          thresholds: {
            error: { maxTimeMs: 5000, maxCount: 10 },
            log: { maxTimeMs: 5000, maxCount: 50 },
            performance: { maxTimeMs: 5000, maxCount: 25 }
          }
        });
        engine.start();

        const event1 = createErrorEvent(1);
        const event2 = createErrorEvent(2);
        const event3 = createErrorEvent(3);

        engine.enqueue('error', event1);
        engine.enqueue('error', event2);
        engine.enqueue('error', event3);

        expect(engine.queues.error).toHaveLength(3);
        expect(engine.queues.error[0]).toBe(event1);
        expect(engine.queues.error[1]).toBe(event2);
        expect(engine.queues.error[2]).toBe(event3);
      });
    });

    describe('11.5 Performance event type validation (edge cases)', () => {
      it('should accept resource performance events', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        const resourceEvent = createPerformanceEvent('resource');
        engine.enqueue('performance', resourceEvent);

        expect(engine.queues.performance).toHaveLength(1);
      });

      it('should accept paint performance events', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        const paintEvent = createPerformanceEvent('paint');
        engine.enqueue('performance', paintEvent);

        expect(engine.queues.performance).toHaveLength(1);
      });

      it('should accept navigation performance events', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        const navEvent = createPerformanceEvent('navigation');
        engine.enqueue('performance', navEvent);

        expect(engine.queues.performance).toHaveLength(1);
      });

      it('should reject invalid performance entryType', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        const invalidEvent = {
          event_type: 'performance',
          timestamp: new Date().toISOString(),
          payload: {
            name: 'test',
            entryType: 'invalid_type',
            time: 100,
            duration: 50
          }
        };

        engine.enqueue('performance', invalidEvent);

        expect(engine.queues.performance).toHaveLength(0);
      });
    });

    describe('11.6 Large batches', () => {
      it('should handle large number of events in a single batch', () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test',
          thresholds: {
            error: { maxTimeMs: 5000, maxCount: 1000 },
            log: { maxTimeMs: 5000, maxCount: 1000 },
            performance: { maxTimeMs: 5000, maxCount: 1000 }
          }
        });
        engine.start();

        for (let i = 0; i < 100; i++) {
          engine.enqueue('log', createLogEvent(i));
        }

        expect(engine.queues.log).toHaveLength(100);

        vi.advanceTimersByTime(5000);

        expect(mockSendFn).toHaveBeenCalled();
      });
    });
  });

  // ========== 12. CONCURRENCY / ORDERING ==========
  describe('12. Concurrency / Ordering', () => {
    describe('12.1 Events flushed in FIFO order', () => {
      it('should preserve FIFO order when flushing', async () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        const eventA = createLogEvent(1);
        const eventB = createLogEvent(2);

        engine.enqueue('log', eventA);
        engine.enqueue('log', eventB);

        await engine.flush('log');

        const callArgs = mockSendFn.mock.calls[0];
        const batch = callArgs[1];

        expect(batch.events[0]).toBe(eventA);
        expect(batch.events[1]).toBe(eventB);
        expect(batch.events[0].payload.message).toBe('Log message 1');
        expect(batch.events[1].payload.message).toBe('Log message 2');
      });

      it('should maintain order across multiple flushes', async () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test',
          thresholds: {
            error: { maxTimeMs: 5000, maxCount: 2 },
            log: { maxTimeMs: 5000, maxCount: 50 },
            performance: { maxTimeMs: 5000, maxCount: 25 }
          }
        });
        engine.start();

        // First batch
        engine.enqueue('error', createErrorEvent(1));
        engine.enqueue('error', createErrorEvent(2));

        await vi.runAllTimersAsync();

        let callArgs = mockSendFn.mock.calls[0];
        let batch = callArgs[1];
        expect(batch.events[0].payload.message).toContain('Error 1');
        expect(batch.events[1].payload.message).toContain('Error 2');

        mockSendFn.mockClear();

        // Second batch
        engine.enqueue('error', createErrorEvent(3));
        engine.enqueue('error', createErrorEvent(4));

        await vi.runAllTimersAsync();

        callArgs = mockSendFn.mock.calls[0];
        batch = callArgs[1];
        expect(batch.events[0].payload.message).toContain('Error 3');
        expect(batch.events[1].payload.message).toContain('Error 4');
      });

      it('should maintain order with mixed event types', async () => {
        engine = new BatchingEngine({
          sendFn: mockSendFn,
          api_key: 'test-key',
          service: 'test-service',
          environment: 'test'
        });
        engine.start();

        const errorEvent = createErrorEvent(1);
        const logEvent = createLogEvent(1);

        engine.enqueue('error', errorEvent);
        engine.enqueue('log', logEvent);

        await engine.flush('error');
        await engine.flush('log');

        expect(mockSendFn).toHaveBeenCalledTimes(2);
        expect(mockSendFn.mock.calls[0][0]).toBe('error');
        expect(mockSendFn.mock.calls[1][0]).toBe('log');
      });
    });
  });
});
