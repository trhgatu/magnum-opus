import { DomainEvent } from '@shared/domain/events/domain-event';
import { runWithCorrelationId } from '@infrastructure/observability/correlation-context';

import {
  defineIntegrationEvent,
  requireString,
} from '@shared/application/integration-event';
import { OutboxEventHandler, publish } from './outbox-publication';
import { NonRetryableOutboxError } from './non-retryable-outbox-error';
import { OutboxRegistry } from './outbox-registry';

class ThingHappenedEvent extends DomainEvent {
  constructor(
    public readonly thingId: string,
    public readonly ownerId: string,
  ) {
    super();
  }
}

class OtherEvent extends DomainEvent {}

const ThingHappened = defineIntegrationEvent(
  'test.thing.happened.v1',
  (payload) => ({ thingId: requireString(payload, 'thingId') }),
);

const thingHappened = publish({
  event: ThingHappenedEvent,
  as: ThingHappened,
  aggregateId: (event) => event.thingId,
  toPayload: (event) => ({ thingId: event.thingId }),
});

const handler = (): jest.Mocked<OutboxEventHandler<unknown>> => ({
  handle: jest.fn().mockResolvedValue(undefined),
});

const createRegistry = () => new OutboxRegistry({} as never);

describe('OutboxRegistry', () => {
  describe('register', () => {
    it('rejects the same domain event published twice', () => {
      expect(() =>
        createRegistry().register(
          [thingHappened, thingHappened],
          [{ event: ThingHappened, handler: handler() }],
        ),
      ).toThrow('ThingHappenedEvent is published to the outbox twice');
    });

    it('rejects two domain events claiming the same persisted type', () => {
      const clash = publish({
        event: OtherEvent,
        as: ThingHappened,
        aggregateId: () => 'x',
        toPayload: () => ({}),
      });

      expect(() =>
        createRegistry().register(
          [thingHappened, clash],
          [{ event: ThingHappened, handler: handler() }],
        ),
      ).toThrow('Outbox event type test.thing.happened.v1 is registered twice');
    });

    it('rejects a handler for a type that nothing publishes', () => {
      expect(() =>
        createRegistry().register(
          [],
          [{ event: ThingHappened, handler: handler() }],
        ),
      ).toThrow('which nothing publishes');
    });

    it('rejects a published type without any handler', () => {
      expect(() => createRegistry().register([thingHappened], [])).toThrow(
        'Outbox event type test.thing.happened.v1 has no handler',
      );
    });
  });

  describe('serialize', () => {
    it('writes the persisted type, aggregate, payload and request correlation id', () => {
      const registry = createRegistry();
      registry.register(
        [thingHappened],
        [{ event: ThingHappened, handler: handler() }],
      );
      const event = new ThingHappenedEvent('thing-id', 'owner-id');

      const serialized = runWithCorrelationId('request-1', () =>
        registry.serialize(event),
      );

      expect(serialized).toEqual({
        id: event.eventId,
        type: 'test.thing.happened.v1',
        aggregateId: 'thing-id',
        payload: { thingId: 'thing-id' },
        occurredAt: event.occurredOn,
        correlationId: 'request-1',
      });
    });

    it('refuses a domain event no context publishes', () => {
      expect(() => createRegistry().serialize(new OtherEvent())).toThrow(
        'Unsupported domain event: OtherEvent',
      );
    });
  });

  describe('dispatch', () => {
    const occurredAt = new Date('2026-11-16T03:00:00.000Z');

    it('delivers the parsed message to every handler of the type', async () => {
      const first = handler();
      const second = handler();
      const registry = createRegistry();
      registry.register(
        [thingHappened],
        [
          { event: ThingHappened, handler: first },
          { event: ThingHappened, handler: second },
        ],
      );

      await registry.dispatch({
        id: 'event-id',
        type: 'test.thing.happened.v1',
        payload: { thingId: 'thing-id' },
        occurredAt,
      });

      const message = {
        eventId: 'event-id',
        occurredAt,
        payload: { thingId: 'thing-id' },
      };
      expect(first.handle).toHaveBeenCalledWith(message);
      expect(second.handle).toHaveBeenCalledWith(message);
    });

    it('fails so the outbox retries when one handler fails', async () => {
      const failing = handler();
      failing.handle.mockRejectedValue(new Error('down'));
      const registry = createRegistry();
      registry.register(
        [thingHappened],
        [
          { event: ThingHappened, handler: handler() },
          { event: ThingHappened, handler: failing },
        ],
      );

      await expect(
        registry.dispatch({
          id: 'event-id',
          type: 'test.thing.happened.v1',
          payload: { thingId: 'thing-id' },
          occurredAt,
        }),
      ).rejects.toThrow('down');
    });

    it('waits for every handler to finish before reporting a failure', async () => {
      const failing = handler();
      failing.handle.mockRejectedValue(new Error('down'));
      let slowFinished = false;
      const slow: OutboxEventHandler<unknown> = {
        handle: () =>
          new Promise<void>((resolve) =>
            setTimeout(() => {
              slowFinished = true;
              resolve();
            }, 20),
          ),
      };
      const registry = createRegistry();
      registry.register(
        [thingHappened],
        [
          { event: ThingHappened, handler: failing },
          { event: ThingHappened, handler: slow },
        ],
      );

      await expect(
        registry.dispatch({
          id: 'event-id',
          type: 'test.thing.happened.v1',
          payload: { thingId: 'thing-id' },
          occurredAt,
        }),
      ).rejects.toThrow('down');
      // Retry chỉ được lên lịch khi không còn handler nào đang chạy dở.
      expect(slowFinished).toBe(true);
    });

    it('rejects an unknown persisted type and a malformed payload', async () => {
      const registry = createRegistry();
      registry.register(
        [thingHappened],
        [{ event: ThingHappened, handler: handler() }],
      );

      await expect(
        registry.dispatch({
          id: 'e',
          type: 'unknown.v1',
          payload: {},
          occurredAt,
        }),
      ).rejects.toThrow('Unsupported outbox event type: unknown.v1');
      await expect(
        registry.dispatch({
          id: 'e',
          type: 'test.thing.happened.v1',
          payload: [],
          occurredAt,
        }),
      ).rejects.toThrow('Outbox event payload must be an object');
    });

    // Retry không chữa được payload hỏng: báo cho publisher bỏ cuộc ngay.
    it.each([
      ['an unknown type', { type: 'unknown.v1', payload: {} }],
      ['a non-object payload', { type: 'test.thing.happened.v1', payload: [] }],
      [
        'a payload the contract rejects',
        { type: 'test.thing.happened.v1', payload: {} },
      ],
    ])('marks %s as not retryable', async (_, row) => {
      const registry = createRegistry();
      registry.register(
        [thingHappened],
        [{ event: ThingHappened, handler: handler() }],
      );

      await expect(
        registry.dispatch({ id: 'e', occurredAt, ...row }),
      ).rejects.toBeInstanceOf(NonRetryableOutboxError);
    });

    it('keeps a handler failure retryable', async () => {
      const registry = createRegistry();
      const failing = handler();
      failing.handle.mockRejectedValue(new Error('smtp down'));
      registry.register(
        [thingHappened],
        [{ event: ThingHappened, handler: failing }],
      );

      const error: unknown = await registry
        .dispatch({
          id: 'e',
          type: 'test.thing.happened.v1',
          payload: { thingId: 't' },
          occurredAt,
        })
        .catch((e: unknown) => e);

      expect(error).toEqual(new Error('smtp down'));
      expect(error).not.toBeInstanceOf(NonRetryableOutboxError);
    });
  });

  describe('knownTypes', () => {
    it('lists every persisted type this build can read, old names included', () => {
      const registry = createRegistry();
      const Renamed = defineIntegrationEvent(
        'test.thing.renamed.v1',
        () => ({}),
        ['test.thing.old-name.v1'],
      );
      registry.register(
        [
          thingHappened,
          publish({
            event: OtherEvent,
            as: Renamed,
            aggregateId: () => 'a',
            toPayload: () => ({}),
          }),
        ],
        [
          { event: ThingHappened, handler: handler() },
          { event: Renamed, handler: handler() },
        ],
      );

      expect([...registry.knownTypes()].sort()).toEqual([
        'test.thing.happened.v1',
        'test.thing.old-name.v1',
        'test.thing.renamed.v1',
      ]);
    });
  });

  describe('legacy types', () => {
    class RenamedEvent extends DomainEvent {}
    const Renamed = defineIntegrationEvent(
      'test.renamed.v1',
      (payload) => ({ id: requireString(payload, 'id') }),
      ['test.renmaed.v1'],
    );
    const renamed = publish({
      event: RenamedEvent,
      as: Renamed,
      aggregateId: () => 'renamed-id',
      toPayload: () => ({ id: 'renamed-id' }),
    });

    it('writes the new type and still delivers rows stored under the old one', async () => {
      const renamedHandler = handler();
      const registry = createRegistry();
      registry.register(
        [renamed],
        [{ event: Renamed, handler: renamedHandler }],
      );

      expect(registry.serialize(new RenamedEvent()).type).toBe(
        'test.renamed.v1',
      );

      await registry.dispatch({
        id: 'event-id',
        type: 'test.renmaed.v1',
        payload: { id: 'renamed-id' },
        occurredAt: new Date(),
      });
      expect(renamedHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({ payload: { id: 'renamed-id' } }),
      );
    });

    it('rejects an old type that another event already uses', () => {
      const clash = defineIntegrationEvent('test.other.v1', () => ({}), [
        'test.renmaed.v1',
      ]);
      const clashing = publish({
        event: OtherEvent,
        as: clash,
        aggregateId: () => 'x',
        toPayload: () => ({}),
      });

      expect(() =>
        createRegistry().register(
          [renamed, clashing],
          [
            { event: Renamed, handler: handler() },
            { event: clash, handler: handler() },
          ],
        ),
      ).toThrow('Outbox event type test.renmaed.v1 is registered twice');
    });
  });
});
