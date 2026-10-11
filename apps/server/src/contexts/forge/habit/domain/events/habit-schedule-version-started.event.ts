import { DomainEvent } from '@shared/domain/events/domain-event';

import { HabitCalendarDate, HabitFrequency } from '../value-objects';

// Mở phiên bản tần suất mới [effectiveFrom, null) của Habit BUILD. Repository
// đóng phiên bản đang mở (nếu có) tại effectiveFrom rồi mới ghi phiên bản này.
export class HabitScheduleVersionStartedEvent extends DomainEvent {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
    public readonly frequency: HabitFrequency,
    public readonly effectiveFrom: HabitCalendarDate,
  ) {
    super();
  }
}
