import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { EventListenerBootstrap } from '../src/application/services/event-listener-bootstrap';
import { MockKafkaEventAdapter } from '../src/infrastructure/adapters/events/mock-kafka-event-adapter';
import { container } from '../src/shared/container';
import { TYPES } from '../src/shared/types';

describe('Realm Deleted Event Integration', () => {
  let bootstrap: EventListenerBootstrap;
  let kafkaAdapter: MockKafkaEventAdapter;

  beforeAll(async () => {
    bootstrap = container.get<EventListenerBootstrap>(TYPES.EventListenerBootstrap);
    kafkaAdapter = container.get<MockKafkaEventAdapter>(TYPES.KafkaEventAdapter) as MockKafkaEventAdapter;
    
    await bootstrap.initialize();
  });

  afterAll(async () => {
    await bootstrap.shutdown();
  });

  it('should register and handle realm deleted events', async () => {
    expect(kafkaAdapter.isRunning()).toBe(true);

    // Simulate a realm deleted event
    const mockEvent = {
      realmId: 'realm-123',
      realmName: 'Test Realm',
      deletedAt: new Date().toISOString()
    };

    // This should not throw any errors
    await expect(
      kafkaAdapter.simulateMessage('internal.rmu-core.realm.deleted.v1', mockEvent)
    ).resolves.not.toThrow();
  });

  it('should handle invalid topics gracefully', async () => {
    const mockEvent = {
      someData: 'test'
    };

    // Should not throw but should log a warning
    await expect(
      kafkaAdapter.simulateMessage('invalid.topic', mockEvent)
    ).resolves.not.toThrow();
  });
});
