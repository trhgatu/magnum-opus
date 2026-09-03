import { MemoryDatePrecision, MemoryState } from '../../domain/enums';
import { Memory } from '../../domain/memory.aggregate';
import { MemoryId, MemoryOccurredOn } from '../../domain/value-objects';
import { MemoryPresenter } from './memory.presenter';

describe('MemoryPresenter', () => {
  it('maps an active Memory to the public response, serializing timestamps and hiding ownerId', () => {
    const memory = Memory.rehydrate({
      id: new MemoryId('memory-1'),
      ownerId: 'owner-1',
      sourceJournalEntryId: 'entry-1',
      title: 'A quiet afternoon',
      content: 'Light resting on the desk.',
      occurredOn: MemoryOccurredOn.rehydrate(
        '2026-08-10',
        MemoryDatePrecision.DAY,
      ),
      state: MemoryState.ACTIVE,
      revision: 2,
      trashedAt: null,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-02T00:00:00.000Z'),
    });

    const response = MemoryPresenter.toResponse(memory);

    expect(response).toEqual({
      id: 'memory-1',
      sourceJournalEntryId: 'entry-1',
      title: 'A quiet afternoon',
      content: 'Light resting on the desk.',
      occurredOn: '2026-08-10',
      occurredOnPrecision: MemoryDatePrecision.DAY,
      state: MemoryState.ACTIVE,
      revision: 2,
      trashedAt: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    });
    expect(response).not.toHaveProperty('ownerId');
  });

  it('serializes trashedAt when the Memory is in Trash', () => {
    const memory = Memory.rehydrate({
      id: new MemoryId('memory-1'),
      ownerId: 'owner-1',
      sourceJournalEntryId: null,
      title: 'A quiet afternoon',
      content: 'Light resting on the desk.',
      occurredOn: MemoryOccurredOn.unknown(),
      state: MemoryState.TRASHED,
      revision: 3,
      trashedAt: new Date('2026-08-03T00:00:00.000Z'),
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-03T00:00:00.000Z'),
    });

    const response = MemoryPresenter.toResponse(memory);

    expect(response.trashedAt).toBe('2026-08-03T00:00:00.000Z');
    expect(response.occurredOn).toBeNull();
    expect(response.occurredOnPrecision).toBe(MemoryDatePrecision.UNKNOWN);
  });
});
