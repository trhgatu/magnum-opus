import {
  defineIntegrationEvent,
  requireBoolean,
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

describe('payload readers reject malformed values', () => {
  it('rejects a string that is not a date', () => {
    expect(() => requireDate({ at: 'yesterday' }, 'at')).toThrow(
      'Outbox payload property "at" must be a valid date',
    );
  });

  it('reads a boolean and rejects anything else', () => {
    expect(requireBoolean({ isRead: false }, 'isRead')).toBe(false);
    expect(() => requireBoolean({ isRead: 'false' }, 'isRead')).toThrow(
      'Outbox payload property "isRead" must be a boolean',
    );
  });
});
