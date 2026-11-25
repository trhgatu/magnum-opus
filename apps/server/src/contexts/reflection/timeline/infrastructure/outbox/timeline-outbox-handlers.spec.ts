import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';
import { JournalEntrySealed } from '@reflection/journal/contracts/journal-entry-sealed.contract';
import { MemoryCreated } from '@reflection/memory/contracts/memory-created.contract';

import type { TimelineWriter } from '../../application/ports/timeline-writer.port';

import { RecordJournalSealedHandler } from './record-journal-sealed.handler';
import { RecordMemoryCreatedHandler } from './record-memory-created.handler';

const timeline = {
  recordJournalSealed: jest.fn().mockResolvedValue(undefined),
  recordMemoryCreated: jest.fn().mockResolvedValue(undefined),
} as unknown as jest.Mocked<TimelineWriter>;
const at = new Date('2026-11-16T03:00:00.000Z');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('timeline outbox handlers', () => {
  it('bind to the Journal and Memory events', () => {
    expect(
      Reflect.getMetadata(OutboxHandler.KEY, RecordJournalSealedHandler),
    ).toBe(JournalEntrySealed);
    expect(
      Reflect.getMetadata(OutboxHandler.KEY, RecordMemoryCreatedHandler),
    ).toBe(MemoryCreated);
  });

  it('records a journal timeline entry when a Journal is sealed', async () => {
    await new RecordJournalSealedHandler(timeline).handle({
      eventId: 'event-id',
      occurredAt: at,
      payload: {
        journalEntryId: 'entry-id',
        ownerId: 'owner-id',
        sealedAt: at,
      },
    });

    expect(timeline.recordJournalSealed).toHaveBeenCalledWith(
      'owner-id',
      'entry-id',
      at,
    );
  });

  it('records a memory timeline entry when a Memory is created', async () => {
    await new RecordMemoryCreatedHandler(timeline).handle({
      eventId: 'event-id',
      occurredAt: at,
      payload: {
        memoryId: 'memory-id',
        ownerId: 'owner-id',
        memoryOccurredOn: null,
        precision: 'UNKNOWN',
      },
    });

    expect(timeline.recordMemoryCreated).toHaveBeenCalledWith(
      'owner-id',
      'memory-id',
      null,
    );
  });
});
