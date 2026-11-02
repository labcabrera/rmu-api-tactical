import { afterEach, describe, expect, it } from 'vitest';
import { DomainEvent } from '../../../src/modules/shared/domain/events/domain-event.js';

const saved = process.env.RMU_KAFKA_CLIENT_ID;

afterEach(() => {
  if (saved === undefined) delete process.env.RMU_KAFKA_CLIENT_ID;
  else process.env.RMU_KAFKA_CLIENT_ID = saved;
});

// Spec 021, decision 10: the producer is the Kafka client id, with the API name as fallback.
describe('DomainEvent.producer', () => {
  it('is RMU_KAFKA_CLIENT_ID', () => {
    process.env.RMU_KAFKA_CLIENT_ID = 'rmu-api-tactical-1';
    expect(new DomainEvent('updated', {}).producer).toBe('rmu-api-tactical-1');
  });

  it('is rmu-api-tactical without it', () => {
    delete process.env.RMU_KAFKA_CLIENT_ID;
    expect(new DomainEvent('updated', {}).producer).toBe('rmu-api-tactical');
  });
});
