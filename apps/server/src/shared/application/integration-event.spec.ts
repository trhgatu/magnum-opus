import {
  defineIntegrationEvent,
  requireDate,
  requireString,
} from '@shared/application/integration-event';

describe('defineIntegrationEvent', () => {
  it('keeps the persisted type and parses the payload with the given reader', () => {
    const event = defineIntegrationEvent(
      'test.thing.happened.v1',
      (payload) => ({
        id: requireString(payload, 'id'),
      }),
    );

    expect(event.type).toBe('test.thing.happened.v1');
    expect(event.parse({ id: 'thing-id' })).toEqual({ id: 'thing-id' });
  });
});

describe('requireString', () => {
  it('returns a string property', () => {
    expect(requireString({ id: 'x' }, 'id')).toBe('x');
  });

  it('rejects a missing or non-string property', () => {
    expect(() => requireString({}, 'id')).toThrow(
      'Outbox payload property "id" must be a string',
    );
    expect(() => requireString({ id: 1 }, 'id')).toThrow('"id"');
  });
});

describe('requireDate', () => {
  it('reads an ISO string back into the same instant', () => {
    const at = new Date('2026-11-16T03:00:00.000Z');

    expect(requireDate({ at: at.toISOString() }, 'at')).toEqual(at);
  });
});
