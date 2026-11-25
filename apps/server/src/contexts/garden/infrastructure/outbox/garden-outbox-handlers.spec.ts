import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';
import { HabitCreated } from '@/contexts/forge/habit/contracts/habit-created.contract';
import { HabitPermanentlyDeleted } from '@/contexts/forge/habit/contracts/habit-permanently-deleted.contract';
import { HabitCheckedIn } from '@/contexts/forge/habit-check-in/contracts/habit-checked-in.contract';
import { HabitCheckInUndone } from '@/contexts/forge/habit-check-in/contracts/habit-check-in-undone.contract';
import { HabitRelapsed } from '@/contexts/forge/habit-relapse/contracts/habit-relapsed.contract';
import { HabitQuitStartChanged } from '@/contexts/forge/habit/contracts/habit-quit-start-changed.contract';
import { HabitLifecycleTransitioned } from '@/contexts/forge/habit/contracts/habit-lifecycle-transitioned.contract';
import { HabitTrashed } from '@/contexts/forge/habit/contracts/habit-trashed.contract';
import { HabitRestoredFromTrash } from '@/contexts/forge/habit/contracts/habit-restored-from-trash.contract';
import { HabitScheduleVersionStarted } from '@/contexts/forge/habit/contracts/habit-schedule-version-started.contract';
import { JournalEntrySealed } from '@/contexts/reflection/journal/contracts/journal-entry-sealed.contract';
import { RoutineHabitAdded } from '@/contexts/forge/routine/contracts/routine-habit-added.contract';
import { HabitRenamed } from '@/contexts/forge/habit/contracts/habit-renamed.contract';
import {
  MemoryCreated,
  MemoryPermanentlyDeleted,
  MemoryRedated,
  MemoryRestored,
  MemoryTrashed,
} from '@reflection/memory/contracts';

import type { GardenLedgerWriter } from '../../application/ports/garden-ledger-writer.port';

import { PlantCreatedHabitHandler } from './plant-created-habit.handler';
import { RecordHabitCheckInHandler } from './record-habit-check-in.handler';
import { RecordHabitCheckInUndoneHandler } from './record-habit-check-in-undone.handler';
import { RecordHabitRelapseHandler } from './record-habit-relapse.handler';
import { ReplantQuitHabitHandler } from './replant-quit-habit.handler';
import { RecordHabitLifecycleHandler } from './record-habit-lifecycle.handler';
import { HideTrashedHabitHandler } from './hide-trashed-habit.handler';
import { ShowRestoredHabitHandler } from './show-restored-habit.handler';
import { RecordHabitRhythmHandler } from './record-habit-rhythm.handler';
import { RenameHabitTreeHandler } from './rename-habit-tree.handler';
import { AssignHabitBedHandler } from './assign-habit-bed.handler';
import { RecordJournalSealedHandler } from './record-journal-sealed.handler';
import { RecordOnThisDayOpenedHandler } from './record-on-this-day-opened.handler';
import { OnThisDayItemOpened } from '@reflection/on-this-day/contracts/on-this-day-item-opened.contract';
import { UprootDeletedHabitHandler } from './uproot-deleted-habit.handler';
import { HangCreatedMemoryHandler } from './hang-created-memory.handler';
import { MoveRedatedMemoryHandler } from './move-redated-memory.handler';
import { HideTrashedMemoryHandler } from './hide-trashed-memory.handler';
import { ShowRestoredMemoryHandler } from './show-restored-memory.handler';
import { RemoveDeletedMemoryHandler } from './remove-deleted-memory.handler';

const ledger = {
  plant: jest.fn().mockResolvedValue(undefined),
  uproot: jest.fn().mockResolvedValue(undefined),
  record: jest.fn().mockResolvedValue(undefined),
  replant: jest.fn().mockResolvedValue(undefined),
  hide: jest.fn().mockResolvedValue(undefined),
  show: jest.fn().mockResolvedValue(undefined),
  rename: jest.fn().mockResolvedValue(undefined),
  assignBed: jest.fn().mockResolvedValue(undefined),
  recordReflection: jest.fn().mockResolvedValue(undefined),
  hangLantern: jest.fn().mockResolvedValue(undefined),
  moveLantern: jest.fn().mockResolvedValue(undefined),
  hideLantern: jest.fn().mockResolvedValue(undefined),
  showLantern: jest.fn().mockResolvedValue(undefined),
  removeLantern: jest.fn().mockResolvedValue(undefined),
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
    expect(
      Reflect.getMetadata(OutboxHandler.KEY, RecordHabitLifecycleHandler),
    ).toBe(HabitLifecycleTransitioned);
    expect(
      Reflect.getMetadata(OutboxHandler.KEY, HideTrashedHabitHandler),
    ).toBe(HabitTrashed);
    expect(
      Reflect.getMetadata(OutboxHandler.KEY, ShowRestoredHabitHandler),
    ).toBe(HabitRestoredFromTrash);
    expect(
      Reflect.getMetadata(OutboxHandler.KEY, RecordHabitRhythmHandler),
    ).toBe(HabitScheduleVersionStarted);
    expect(Reflect.getMetadata(OutboxHandler.KEY, RenameHabitTreeHandler)).toBe(
      HabitRenamed,
    );
    expect(Reflect.getMetadata(OutboxHandler.KEY, AssignHabitBedHandler)).toBe(
      RoutineHabitAdded,
    );
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

  // Lưu trữ là nghỉ có chủ đích, khôi phục là mọc tiếp (BR-GDN-005).
  it.each([
    ['ARCHIVED', 'RESTED'],
    ['RESTORED', 'RESUMED'],
  ] as const)('records %s as %s on its effective day', async (action, kind) => {
    await new RecordHabitLifecycleHandler(ledger).handle({
      eventId: 'event-id',
      occurredAt: at,
      payload: {
        habitId: 'habit-id',
        ownerId: 'owner-id',
        action,
        effectiveOn: new Date('2026-11-16T00:00:00.000Z'),
      },
    });

    expect(ledger.record).toHaveBeenCalledWith({
      subjectKind: 'HABIT',
      subjectId: 'habit-id',
      kind,
      occurredOn: new Date('2026-11-16T00:00:00.000Z'),
      sourceEventId: 'event-id',
    });
  });

  // Nhịp quyết định tuần nào "có kỳ vọng" (BR-GDN-002).
  it('records a schedule version as RHYTHM_SET from its effective day', async () => {
    await new RecordHabitRhythmHandler(ledger).handle({
      eventId: 'event-id',
      occurredAt: at,
      payload: {
        habitId: 'habit-id',
        ownerId: 'owner-id',
        frequencyType: 'WEEKLY',
        frequencyDays: [1, 3, 5],
        effectiveFrom: new Date('2026-11-16T00:00:00.000Z'),
      },
    });

    expect(ledger.record).toHaveBeenCalledWith({
      subjectKind: 'HABIT',
      subjectId: 'habit-id',
      kind: 'RHYTHM_SET',
      detail: { type: 'WEEKLY', days: [1, 3, 5] },
      occurredOn: new Date('2026-11-16T00:00:00.000Z'),
      sourceEventId: 'event-id',
    });
  });

  // Cây đổi tên theo Habit (Q-GDN-10).
  it('renames the tree of a renamed Habit', async () => {
    await new RenameHabitTreeHandler(ledger).handle({
      eventId: 'event-id',
      occurredAt: at,
      payload: {
        habitId: 'habit-id',
        ownerId: 'owner-id',
        title: 'Evening walk',
      },
    });

    expect(ledger.rename).toHaveBeenCalledWith(
      'HABIT',
      'habit-id',
      'Evening walk',
    );
  });

  // Ngày niêm phong theo múi giờ tài khoản lúc niêm phong (BR-GDN-SB-002).
  it("records a sealed journal entry as REFLECTED on the owner's day", async () => {
    const timeZoneReader = {
      getForUser: jest.fn().mockResolvedValue('Asia/Ho_Chi_Minh'),
    };
    expect(
      Reflect.getMetadata(OutboxHandler.KEY, RecordJournalSealedHandler),
    ).toBe(JournalEntrySealed);

    await new RecordJournalSealedHandler(ledger, timeZoneReader).handle({
      eventId: 'event-id',
      occurredAt: at,
      payload: {
        journalEntryId: 'journal-id',
        ownerId: 'owner-id',
        // 17:30Z ngày 22 đã là ngày 23 ở Việt Nam.
        sealedAt: new Date('2026-11-22T17:30:00.000Z'),
      },
    });

    expect(timeZoneReader.getForUser).toHaveBeenCalledWith('owner-id');
    expect(ledger.recordReflection).toHaveBeenCalledWith({
      ownerId: 'owner-id',
      sourceRef: 'journal-id',
      occurredOn: new Date('2026-11-23T00:00:00.000Z'),
      sourceEventId: 'event-id',
    });
  });

  // Mở lại một mục của "Ngày này năm xưa" là một lần nhìn lại (BR-GDN-LT-003).
  it("records an opened on-this-day item as REFLECTED on the owner's day", async () => {
    const timeZoneReader = {
      getForUser: jest.fn().mockResolvedValue('Asia/Ho_Chi_Minh'),
    };
    expect(
      Reflect.getMetadata(OutboxHandler.KEY, RecordOnThisDayOpenedHandler),
    ).toBe(OnThisDayItemOpened);

    await new RecordOnThisDayOpenedHandler(ledger, timeZoneReader).handle({
      eventId: 'event-id',
      occurredAt: at,
      payload: {
        ownerId: 'owner-id',
        kind: 'MEMORY',
        itemId: 'memory-id',
        openedAt: new Date('2026-11-24T18:00:00.000Z'),
      },
    });

    expect(ledger.recordReflection).toHaveBeenCalledWith({
      ownerId: 'owner-id',
      sourceRef: 'memory-id',
      occurredOn: new Date('2026-11-25T00:00:00.000Z'),
      sourceEventId: 'event-id',
    });
  });

  it('puts a tree in the bed of the Routine its Habit joined', async () => {
    await new AssignHabitBedHandler(ledger).handle({
      eventId: 'event-id',
      occurredAt: at,
      payload: {
        routineId: 'routine-id',
        habitId: 'habit-id',
        ownerId: 'owner-id',
        routineTitle: 'Morning',
      },
    });

    expect(ledger.assignBed).toHaveBeenCalledWith('HABIT', 'habit-id', {
      id: 'routine-id',
      name: 'Morning',
    });
  });

  it('hides the tree of a trashed Habit and shows it again on restore', async () => {
    const message = {
      eventId: 'event-id',
      occurredAt: at,
      payload: { habitId: 'habit-id', ownerId: 'owner-id' },
    };

    await new HideTrashedHabitHandler(ledger).handle(message);
    await new ShowRestoredHabitHandler(ledger).handle(message);

    expect(ledger.hide).toHaveBeenCalledWith('HABIT', 'habit-id', at);
    expect(ledger.show).toHaveBeenCalledWith('HABIT', 'habit-id');
  });
});

describe('lantern handlers (BR-GDN-LN-001..005)', () => {
  const occurredOn = new Date('2018-08-01T00:00:00.000Z');
  const memory = { memoryId: 'memory-id', ownerId: 'owner-id' };
  const message = <P>(payload: P) => ({
    eventId: 'event-id',
    occurredAt: at,
    payload,
  });

  it('bind to the Memory events', () => {
    expect(
      [
        HangCreatedMemoryHandler,
        MoveRedatedMemoryHandler,
        HideTrashedMemoryHandler,
        ShowRestoredMemoryHandler,
        RemoveDeletedMemoryHandler,
      ].map((handler) => Reflect.getMetadata(OutboxHandler.KEY, handler)),
    ).toEqual([
      MemoryCreated,
      MemoryRedated,
      MemoryTrashed,
      MemoryRestored,
      MemoryPermanentlyDeleted,
    ]);
  });

  it('hangs a lantern for a created memory', async () => {
    await new HangCreatedMemoryHandler(ledger).handle(
      message({ ...memory, memoryOccurredOn: occurredOn, precision: 'MONTH' }),
    );

    expect(ledger.hangLantern).toHaveBeenCalledWith({
      ...memory,
      occurredOn,
      precision: 'MONTH',
    });
  });

  it('hangs an undated lantern from an older event without a precision', async () => {
    await new HangCreatedMemoryHandler(ledger).handle(
      message({ ...memory, memoryOccurredOn: null, precision: null }),
    );

    expect(ledger.hangLantern).toHaveBeenCalledWith({
      ...memory,
      occurredOn: null,
      precision: 'UNKNOWN',
    });
  });

  it('moves the lantern when the memory is redated', async () => {
    const newYear = new Date('2018-01-01T00:00:00.000Z');

    await new MoveRedatedMemoryHandler(ledger).handle(
      message({ ...memory, memoryOccurredOn: newYear, precision: 'YEAR' }),
    );

    expect(ledger.moveLantern).toHaveBeenCalledWith({
      ...memory,
      occurredOn: newYear,
      precision: 'YEAR',
    });
  });

  it('hides, shows and removes the lantern with the memory', async () => {
    await new HideTrashedMemoryHandler(ledger).handle(message(memory));
    await new ShowRestoredMemoryHandler(ledger).handle(message(memory));
    await new RemoveDeletedMemoryHandler(ledger).handle(message(memory));

    expect(ledger.hideLantern).toHaveBeenCalledWith('memory-id', at);
    expect(ledger.showLantern).toHaveBeenCalledWith('memory-id');
    expect(ledger.removeLantern).toHaveBeenCalledWith('memory-id');
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
