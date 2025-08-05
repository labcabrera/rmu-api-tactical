import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { RealmDeletedUseCase } from '../../src/application/use-cases/realm/realm-deleted.use-case';
import { Logger } from '../../src/domain/ports/logger';
import { KafkaEventAdapter } from '../../src/infrastructure/adapters/inbound/events/kafka-event-adapter';
import { RealmDeletedEventListener } from '../../src/infrastructure/adapters/inbound/events/realm-deleted-event-listener';

// Mock logger for testing
class TestLogger implements Logger {
  private logs: string[] = [];

  info(message: string): void {
    this.logs.push(`INFO: ${message}`);
    console.log(`INFO: ${message}`);
  }

  error(message: string, error?: any): void {
    this.logs.push(`ERROR: ${message}`);
    console.error(`ERROR: ${message}`, error);
  }

  warn(message: string): void {
    this.logs.push(`WARN: ${message}`);
    console.warn(`WARN: ${message}`);
  }

  debug(message: string): void {
    this.logs.push(`DEBUG: ${message}`);
    console.debug(`DEBUG: ${message}`);
  }

  trace(message: string): void {
    this.logs.push(`TRACE: ${message}`);
    console.trace(`TRACE: ${message}`);
  }

  fatal(message: string, error?: any): void {
    this.logs.push(`FATAL: ${message}`);
    console.error(`FATAL: ${message}`, error);
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

describe('Kafka Event Adapter Integration Tests', () => {
  let kafkaAdapter: KafkaEventAdapter;
  let testLogger: TestLogger;
  let realmDeletedListener: RealmDeletedEventListener;
  let realmDeletedUseCase: RealmDeletedUseCase;

  beforeAll(() => {
    // Setup test dependencies
    testLogger = new TestLogger();
    realmDeletedUseCase = new RealmDeletedUseCase(testLogger);
    realmDeletedListener = new RealmDeletedEventListener(realmDeletedUseCase, testLogger);
    kafkaAdapter = new KafkaEventAdapter(testLogger);
  });

  afterAll(async () => {
    if (kafkaAdapter.isRunning()) {
      await kafkaAdapter.stop();
    }
  });

  describe('Event Listener Registration', () => {
    it('should register event listeners correctly', () => {
      kafkaAdapter.registerEventListener(realmDeletedListener);
      
      const logs = testLogger.getLogs();
      expect(logs).toContain(
        'INFO: Registered event listener for topic: internal.rmu-core.realm.deleted.v1 and event type: RealmDeleted'
      );
    });
  });

  describe('Lifecycle Management', () => {
    it('should handle start/stop lifecycle without Kafka broker', async () => {
      // This test will fail to connect to Kafka but should handle gracefully
      kafkaAdapter.registerEventListener(realmDeletedListener);
      
      // Clear previous logs
      testLogger.clearLogs();
      
      try {
        await kafkaAdapter.start();
        // If we get here, Kafka is available (unexpected in CI)
        expect(kafkaAdapter.isRunning()).toBe(true);
        await kafkaAdapter.stop();
        expect(kafkaAdapter.isRunning()).toBe(false);
      } catch (error) {
        // Expected behavior when Kafka is not available
        expect(kafkaAdapter.isRunning()).toBe(false);
        
        const logs = testLogger.getLogs();
        expect(logs.some(log => log.includes('Starting Kafka Event Adapter'))).toBe(true);
        expect(logs.some(log => log.includes('Failed to start Kafka Event Adapter'))).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle graceful shutdown correctly', async () => {
      testLogger.clearLogs();
      
      await kafkaAdapter.shutdown();
      
      const logs = testLogger.getLogs();
      expect(logs.some(log => log.includes('Initiating graceful shutdown'))).toBe(true);
    });
  });

  describe('Event Creation Factory', () => {
    it('should create RealmDeletedEvent from message data', () => {
      const messageData = {
        realmId: 'test-realm-123',
        realmName: 'Test Realm for Integration',
        deletedAt: '2025-08-05T12:00:00.000Z'
      };

      const event = RealmDeletedEventListener.createEventFromMessage(messageData);
      
      expect(event.realmId).toBe('test-realm-123');
      expect(event.realmName).toBe('Test Realm for Integration');
      expect(event.eventType).toBe('RealmDeleted');
      expect(event.aggregateId).toBe('test-realm-123');
      expect(event.deletedAt).toEqual(new Date('2025-08-05T12:00:00.000Z'));
    });
  });
});

// Test to verify Kafka configuration
describe('Kafka Configuration', () => {
  it('should read Kafka environment variables', () => {
    // These tests verify that the configuration is properly set up
    // In a real environment, these would be set
    
    // Mock environment variables for testing
    const originalEnv = process.env;
    
    process.env.RMU_KAFKA_BROKERS = 'localhost:9092,localhost:9093';
    process.env.RMU_KAFKA_PARTITION_COUNT = '3';
    process.env.RMU_KAFKA_REPLICATION_FACTOR = '2';
    
    // Verify that the adapter can be created with mocked environment
    const testLogger = new TestLogger();
    
    expect(() => {
      new KafkaEventAdapter(testLogger);
    }).not.toThrow();
    
    // Restore original environment
    process.env = originalEnv;
  });
});
