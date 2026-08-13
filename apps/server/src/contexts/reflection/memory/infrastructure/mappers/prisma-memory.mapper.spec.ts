import {
  Memory as PrismaMemory,
  MemoryDatePrecision as PrismaMemoryDatePrecision,
  MemoryState as PrismaMemoryState,
} from '@repo/database';

import { MemoryDatePrecision, MemoryState } from '../../domain/enums';

import { PrismaMemoryMapper } from './prisma-memory.mapper';

describe('PrismaMemoryMapper', () => {
  const createdAt = new Date('2026-08-01T10:00:00.000Z');
  const updatedAt = new Date('2026-08-02T10:00:00.000Z');

  const raw: PrismaMemory = {
    id: 'memory-id',
    ownerId: 'owner-id',
    sourceJournalEntryId: 'journal-id',
    title: 'The rainy construction site',
    content: 'I felt completely still.',
    occurredOn: new Date('2018-08-01T00:00:00.000Z'),
    occurredOnPrecision: PrismaMemoryDatePrecision.MONTH,
    state: PrismaMemoryState.ACTIVE,
    revision: 4,
    trashedAt: null,
    createdAt,
    updatedAt,
  };

  it('maps a Prisma record to the domain aggregate', () => {
    const memory = PrismaMemoryMapper.toDomain(raw);

    expect(memory.toPrimitives()).toEqual({
      id: 'memory-id',
      ownerId: 'owner-id',
      sourceJournalEntryId: 'journal-id',
      title: 'The rainy construction site',
      content: 'I felt completely still.',
      occurredOn: '2018-08-01',
      occurredOnPrecision: MemoryDatePrecision.MONTH,
      state: MemoryState.ACTIVE,
      revision: 4,
      trashedAt: null,
      createdAt,
      updatedAt,
    });

    expect(memory.getDomainEvents()).toEqual([]);
  });

  it('maps the domain aggregate back to persistence', () => {
    const memory = PrismaMemoryMapper.toDomain(raw);

    expect(PrismaMemoryMapper.toPersistence(memory)).toEqual(raw);
  });

  it('maps an unknown occurrence date', () => {
    const memory = PrismaMemoryMapper.toDomain({
      ...raw,
      occurredOn: null,
      occurredOnPrecision: PrismaMemoryDatePrecision.UNKNOWN,
    });

    expect(memory.occurredOn.value).toBeNull();
    expect(memory.occurredOn.precision).toBe(MemoryDatePrecision.UNKNOWN);
  });

  it.each([
    [PrismaMemoryState.ACTIVE, MemoryState.ACTIVE],
    [PrismaMemoryState.TRASHED, MemoryState.TRASHED],
  ])('maps Prisma state %s to domain state %s', (prismaState, domainState) => {
    const memory = PrismaMemoryMapper.toDomain({
      ...raw,
      state: prismaState,
      trashedAt:
        prismaState === PrismaMemoryState.TRASHED
          ? new Date('2026-08-03T10:00:00.000Z')
          : null,
    });

    expect(memory.state).toBe(domainState);
  });

  it.each([
    [
      PrismaMemoryDatePrecision.DAY,
      MemoryDatePrecision.DAY,
      new Date('2018-08-17T00:00:00.000Z'),
      '2018-08-17',
    ],
    [
      PrismaMemoryDatePrecision.MONTH,
      MemoryDatePrecision.MONTH,
      new Date('2018-08-01T00:00:00.000Z'),
      '2018-08-01',
    ],
    [
      PrismaMemoryDatePrecision.YEAR,
      MemoryDatePrecision.YEAR,
      new Date('2018-01-01T00:00:00.000Z'),
      '2018-01-01',
    ],
    [
      PrismaMemoryDatePrecision.UNKNOWN,
      MemoryDatePrecision.UNKNOWN,
      null,
      null,
    ],
  ])(
    'maps Prisma precision %s to domain precision %s',
    (prismaPrecision, domainPrecision, occurredOn, expectedValue) => {
      const memory = PrismaMemoryMapper.toDomain({
        ...raw,
        occurredOn,
        occurredOnPrecision: prismaPrecision,
      });

      expect(memory.occurredOn.value).toBe(expectedValue);
      expect(memory.occurredOn.precision).toBe(domainPrecision);
    },
  );
});
