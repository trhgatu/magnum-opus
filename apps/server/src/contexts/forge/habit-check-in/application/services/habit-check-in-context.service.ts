import { Inject, Injectable } from '@nestjs/common';

import {
  HabitCheckInForbiddenException,
  HabitCheckInNotFoundException,
} from '../../domain/exceptions';
import { HabitCheckInDate } from '../../domain/value-objects';
import { CLOCK, type Clock } from '../ports/clock.port';
import {
  OWNED_HABIT_READER,
  type OwnedHabitReader,
} from '../ports/owned-habit-reader.port';
import {
  USER_TIME_ZONE_READER,
  type UserTimeZoneReader,
} from '../ports/user-time-zone-reader.port';

@Injectable()
export class HabitCheckInContextService {
  constructor(
    @Inject(OWNED_HABIT_READER)
    private readonly habitReader: OwnedHabitReader,
    @Inject(USER_TIME_ZONE_READER)
    private readonly timeZoneReader: UserTimeZoneReader,
    @Inject(CLOCK)
    private readonly clock: Clock,
  ) {}

  public async currentDateForOwnedHabit(
    habitId: string,
    ownerId: string,
    requireActive: boolean,
    requireBuildType = false,
  ): Promise<{ date: HabitCheckInDate; now: Date }> {
    const habit = await this.habitReader.findByIdForOwner(habitId, ownerId);
    if (!habit) {
      throw new HabitCheckInNotFoundException(habitId);
    }
    if (requireActive && !habit.isActive) {
      throw new HabitCheckInForbiddenException(habitId);
    }
    if (requireBuildType && habit.type !== 'BUILD') {
      throw new HabitCheckInForbiddenException(habitId);
    }

    const timeZone = await this.timeZoneReader.getForUser(ownerId);
    const now = this.clock.now();

    return {
      date: HabitCheckInDate.fromInstant(now, timeZone),
      now,
    };
  }

  public async ensureOwnedHabit(
    habitId: string,
    ownerId: string,
  ): Promise<void> {
    const habit = await this.habitReader.findByIdForOwner(habitId, ownerId);
    if (!habit) {
      throw new HabitCheckInNotFoundException(habitId);
    }
  }
}
