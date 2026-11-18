import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';
import { HabitCreated } from '@/contexts/forge/habit/contracts/habit-created.contract';
import { HabitPermanentlyDeleted } from '@/contexts/forge/habit/contracts/habit-permanently-deleted.contract';

import type { GardenLedgerWriter } from '../../application/ports/garden-ledger-writer.port';

import { PlantCreatedHabitHandler } from './plant-created-habit.handler';
import { UprootDeletedHabitHandler } from './uproot-deleted-habit.handler';

const ledger = {
  plant: jest.fn().mockResolvedValue(undefined),
  uproot: jest.fn().mockResolvedValue(undefined),
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
});
