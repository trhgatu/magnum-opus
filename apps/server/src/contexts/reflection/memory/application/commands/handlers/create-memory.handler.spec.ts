import { MemoryDatePrecision } from '../../../domain/enums';
import {
  InvalidMemorySourceJournalException,
  MemorySourceJournalNotFoundException,
} from '../../../domain/exceptions';
import { MemorySourceJournalStatus } from '../../ports/memory-source-journal-reader.port';
import { CreateMemoryCommand } from '../create-memory.command';
import { CreateMemoryHandler } from './create-memory.handler';

describe('CreateMemoryHandler', () => {
  const memoryRepository = {
    create: jest.fn(),
  };
  const sourceJournalReader = {
    getStatusForOwner: jest.fn(),
  };
  const handler = new CreateMemoryHandler(
    memoryRepository as never,
    sourceJournalReader as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    memoryRepository.create.mockResolvedValue(undefined);
  });

  it('creates a standalone Memory without reading Journal', async () => {
    const result = await handler.execute(
      new CreateMemoryCommand({
        ownerId: 'owner-1',
        title: '  First bicycle  ',
        content: 'I learned to ride without help.',
      }),
    );

    const memory = result.getValue();

    expect(result.isSuccess).toBe(true);
    expect(memory.ownerId).toBe('owner-1');
    expect(memory.sourceJournalEntryId).toBeNull();
    expect(memory.title).toBe('First bicycle');
    expect(memory.occurredOn.value).toBeNull();
    expect(memory.occurredOn.precision).toBe(MemoryDatePrecision.UNKNOWN);
    expect(sourceJournalReader.getStatusForOwner).not.toHaveBeenCalled();
    expect(memoryRepository.create).toHaveBeenCalledWith(memory);
  });

  it('creates a Memory from an available owned Journal entry', async () => {
    sourceJournalReader.getStatusForOwner.mockResolvedValue(
      MemorySourceJournalStatus.AVAILABLE,
    );

    const result = await handler.execute(
      new CreateMemoryCommand({
        ownerId: 'owner-1',
        sourceJournalEntryId: 'journal-1',
        title: 'A turning point',
        content: 'The day everything became clear.',
        occurredOn: '2024-08-01',
        occurredOnPrecision: MemoryDatePrecision.MONTH,
      }),
    );

    const memory = result.getValue();

    expect(sourceJournalReader.getStatusForOwner).toHaveBeenCalledWith(
      'journal-1',
      'owner-1',
    );
    expect(memory.sourceJournalEntryId).toBe('journal-1');
    expect(memory.occurredOn.value).toBe('2024-08-01');
    expect(memory.occurredOn.precision).toBe(MemoryDatePrecision.MONTH);
    expect(memoryRepository.create).toHaveBeenCalledWith(memory);
  });

  it('rejects a Journal source that is not owned or does not exist', async () => {
    sourceJournalReader.getStatusForOwner.mockResolvedValue(
      MemorySourceJournalStatus.NOT_FOUND,
    );

    await expect(
      handler.execute(
        new CreateMemoryCommand({
          ownerId: 'owner-1',
          sourceJournalEntryId: 'journal-1',
          title: 'Private source',
          content: 'This must not cross ownership boundaries.',
        }),
      ),
    ).rejects.toBeInstanceOf(MemorySourceJournalNotFoundException);

    expect(memoryRepository.create).not.toHaveBeenCalled();
  });

  it('rejects a trashed Journal source', async () => {
    sourceJournalReader.getStatusForOwner.mockResolvedValue(
      MemorySourceJournalStatus.TRASHED,
    );

    await expect(
      handler.execute(
        new CreateMemoryCommand({
          ownerId: 'owner-1',
          sourceJournalEntryId: 'journal-1',
          title: 'Trashed source',
          content: 'A trashed entry is not an active source.',
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidMemorySourceJournalException);

    expect(memoryRepository.create).not.toHaveBeenCalled();
  });
});
