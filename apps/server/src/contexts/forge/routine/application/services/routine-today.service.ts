import { Inject, Injectable } from '@nestjs/common';

import { RoutineCalendarDate } from '../../domain/value-objects';
import { CLOCK, type Clock } from '../ports/clock.port';
import {
  USER_TIME_ZONE_READER,
  type UserTimeZoneReader,
} from '../ports/user-time-zone-reader.port';

// "Hôm nay" của owner được chốt ở tầng application theo User.timeZone hiện
// tại (giống check-in), aggregate chỉ nhận ngày lịch đã tính sẵn.
@Injectable()
export class RoutineTodayService {
  constructor(
    @Inject(USER_TIME_ZONE_READER)
    private readonly timeZoneReader: UserTimeZoneReader,
    @Inject(CLOCK)
    private readonly clock: Clock,
  ) {}

  public async todayForOwner(ownerId: string): Promise<RoutineCalendarDate> {
    const timeZone = await this.timeZoneReader.getForUser(ownerId);

    return RoutineCalendarDate.fromInstant(this.clock.now(), timeZone);
  }
}
