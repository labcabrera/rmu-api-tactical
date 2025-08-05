import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { RealmDeletedUseCase } from '../../src/application/use-cases/realm/realm-deleted.use-case';
import { DomainEvent } from '../../src/domain/events/domain-event';
import { RealmDeletedEvent } from '../../src/domain/events/realm-deleted.event';
import { EventAdapter } from '../../src/domain/ports/inbound/event-adapter';
import { EventListener } from '../../src/domain/ports/inbound/event-listener';
import { Logger } from '../../src/domain/ports/logger';
import { RealmDeletedEventListener } from '../../src/infrastructure/adapters/inbound/events/realm-deleted-event-listener';

// Mock implementations
class MockEventAdapter implements EventAdapter {
  private listeners: Map<string, EventListener<any>> = new Map();
  private running = false;

  registerEventListener<T extends DomainEvent>(listener: EventListener<T>): void {
    this.listeners.set(listener.getTopic(), listener);
  }

  async start(): Promise<void> {
    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  // Test helper method
  async triggerEvent(topic: string, event: any): Promise<void> {
    const listener = this.listeners.get(topic);
    if (listener) {
      await listener.handle(event);
    }
  }
}

class MockLogger implements Logger {
  info = jest.fn();
  error = jest.fn();
  warn = jest.fn();
  debug = jest.fn();
  trace = jest.fn();
  fatal = jest.fn();
}

describe('Realm Deleted Event Unit Tests', () => {
  let mockAdapter: MockEventAdapter;
  let mockLogger: MockLogger;
  let realmDeletedUseCase: RealmDeletedUseCase;
  let realmDeletedListener: RealmDeletedEventListener;

  beforeAll(async () => {
    mockAdapter = new MockEventAdapter();
    mockLogger = new MockLogger();
    realmDeletedUseCase = new RealmDeletedUseCase(mockLogger);
    realmDeletedListener = new RealmDeletedEventListener(realmDeletedUseCase, mockLogger);

    mockAdapter.registerEventListener(realmDeletedListener);
    await mockAdapter.start();
  });

  afterAll(async () => {
    await mockAdapter.stop();
  });

  it('should register and handle realm deleted events', async () => {
    expect(mockAdapter.isRunning()).toBe(true);

    // Create a realm deleted event
    const realmDeletedEvent = new RealmDeletedEvent(
      'realm-123',
      'Test Realm',
      new Date()
    );

    // Trigger the event
    await expect(
      mockAdapter.triggerEvent('internal.rmu-core.realm.deleted.v1', realmDeletedEvent)
    ).resolves.not.toThrow();

    // Verify the use case was called
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Processing realm deleted event for realm: realm-123')
    );
  });

  it('should handle event listener registration correctly', () => {
    expect(realmDeletedListener.getTopic()).toBe('internal.rmu-core.realm.deleted.v1');
    expect(realmDeletedListener.getEventType()).toBe('RealmDeleted');
  });

  it('should create event from message correctly', () => {
    const messageData = {
      realmId: 'realm-456',
      realmName: 'Another Realm',
      deletedAt: '2025-08-05T10:00:00.000Z'
    };

    const event = RealmDeletedEventListener.createEventFromMessage(messageData);
    
    expect(event.realmId).toBe('realm-456');
    expect(event.realmName).toBe('Another Realm');
    expect(event.eventType).toBe('RealmDeleted');
    expect(event.aggregateId).toBe('realm-456');
  });
});
