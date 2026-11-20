import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';
import { HabitCreated } from '@/contexts/forge/habit/contracts/habit-created.contract';
import { HabitPermanentlyDeleted } from '@/contexts/forge/habit/contracts/habit-permanently-deleted.contract';
import { HabitCheckedIn } from '@/contexts/forge/habit-check-in/contracts/habit-checked-in.contract';
import { HabitCheckInUndone } from '@/contexts/forge/habit-check-in/contracts/habit-check-in-undone.contract';
import { HabitRelapsed } from '@/contexts/forge/habit-relapse/contracts/habit-relapsed.contract';
import { HabitQuitStartChanged } from '@/contexts/forge/habit/contracts/habit-quit-start-changed.contract';

import type { GardenLedgerWriter } from '../../application/ports/garden-ledger-writer.port';

import { PlantCreatedHabitHandler } from './plant-created-habit.handler';
import { RecordHabitCheckInHandler } from './record-habit-check-in.handler';
import { RecordHabitCheckInUndoneHandler } from './record-habit-check-in-undone.handler';
import { RecordHabitRelapseHandler } from './record-habit-relapse.handler';
import { ReplantQuitHabitHandler } from './replant-quit-habit.handler';
import { UprootDeletedHabitHandler } from './uproot-deleted-habit.handler';

const ledger = {
  plant: jest.fn().mockResolvedValue(undefined),
  uproot: jest.fn().mockResolvedValue(undefined),
  record: jest.fn().mockResolvedValue(undefined),
  replant: jest.fn().mockResolvedValue(undefined),
} as unknown as jest.Mocked<GardenLedgerWriter>;
const at = new Date('2026-11-18T03:00:00.000Z');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('garden outbox handlers', () => {
  it('bind to the Habit events', () => {
    expect(
      Reflect.getMetadata(OutboxHandler.KEY, PlantCreatedHabitHandler),
    ).toBe(HabitCreated);
    expect(
      Reflect.getMetadata(OutboxHandler.KEY, UprootDeletedHabitHandler),
    ).toBe(HabitPermanentlyDeleted);
    expect(
      Reflect.getMetadata(OutboxHandler.KEY, RecordHabitCheckInHandler),
    ).toBe(HabitCheckedIn);
    expect(
      Reflect.getMetadata(OutboxHandler.KEY, RecordHabitCheckInUndoneHandler),
    ).toBe(HabitCheckInUndone);
    expect(
      Reflect.getMetadata(OutboxHandler.KEY, RecordHabitRelapseHandler),
    ).toBe(HabitRelapsed);
    expect(
      Reflect.getMetadata(OutboxHandler.KEY, ReplantQuitHabitHandler),
    ).toBe(HabitQuitStartChanged);
  });

  it.each(['BUILD', 'QUIT'] as const)(
    'plants a %s Habit as a subject of the same variant on its start day',
    async (habitType) => {
      await new PlantCreatedHabitHandler(ledger).handle({
        eventId: 'event-id',
        occurredAt: at,
        payload: {
          habitId: 'habit-id',
          ownerId: 'owner-id',
          habitType,
          title: 'Morning walk',
          startedOn: new Date('2026-11-16T00:00:00.000Z'),
        },
      });

      expect(ledger.plant).toHaveBeenCalledWith({
        ownerId: 'owner-id',
        subjectKind: 'HABIT',
        subjectId: 'habit-id',
        variant: habitType,
        nameAtPlanting: 'Morning walk',
        plantedOn: new Date('2026-11-16T00:00:00.000Z'),
      });
    },
  );

  it('uproots the subject of a permanently deleted Habit', async () => {
    await new UprootDeletedHabitHandler(ledger).handle({
      eventId: 'event-id',
      occurredAt: at,
      payload: { habitId: 'habit-id', ownerId: 'owner-id' },
    });

    expect(ledger.uproot).toHaveBeenCalledWith('HABIT', 'habit-id');
  });

  // Một lần chăm ghi vào sổ của cây; event id chống ghi trùng khi outbox giao lại.
  it('records a check-in as TENDED on its date', async () => {
    await new RecordHabitCheckInHandler(ledger).handle(checkInMessage());

    expect(ledger.record).toHaveBeenCalledWith({
      subjectKind: 'HABIT',
      subjectId: 'habit-id',
      kind: 'TENDED',
      occurredOn: new Date('2026-11-16T00:00:00.000Z'),
      sourceEventId: 'event-id',
    });
  });

  it('records an undone check-in as UNTENDED on its date', async () => {
    await new RecordHabitCheckInUndoneHandler(ledger).handle(checkInMessage());

    expect(ledger.record).toHaveBeenCalledWith({
      subjectKind: 'HABIT',
      subjectId: 'habit-id',
      kind: 'UNTENDED',
      occurredOn: new Date('2026-11-16T00:00:00.000Z'),
      sourceEventId: 'event-id',
    });
  });

  // Mỗi lần tái phạm đều vào sổ; gộp một sẹo mỗi tuần là việc của lúc diễn giải (BR-GDN-004).
  it('records a relapse as a SCAR mark on its day', async () => {
    await new RecordHabitRelapseHandler(ledger).handle({
      eventId: 'event-id',
      occurredAt: at,
      payload: {
        habitId: 'habit-id',
        ownerId: 'owner-id',
        occurredOn: new Date('2026-11-16T00:00:00.000Z'),
      },
    });

    expect(ledger.record).toHaveBeenCalledWith({
      subjectKind: 'HABIT',
      subjectId: 'habit-id',
      kind: 'MARKED',
      mark: 'SCAR',
      occurredOn: new Date('2026-11-16T00:00:00.000Z'),
      sourceEventId: 'event-id',
    });
  });

  it('replants a QUIT Habit on its new start day', async () => {
    await new ReplantQuitHabitHandler(ledger).handle({
      eventId: 'event-id',
      occurredAt: at,
      payload: {
        habitId: 'habit-id',
        ownerId: 'owner-id',
        startedOn: new Date('2026-11-10T00:00:00.000Z'),
      },
    });

    expect(ledger.replant).toHaveBeenCalledWith(
      'HABIT',
      'habit-id',
      new Date('2026-11-10T00:00:00.000Z'),
    );
  });
});

function checkInMessage() {
  return {
    eventId: 'event-id',
    occurredAt: at,
    payload: {
      habitId: 'habit-id',
      ownerId: 'owner-id',
      date: new Date('2026-11-16T00:00:00.000Z'),
    },
  };
}
