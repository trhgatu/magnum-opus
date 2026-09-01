import { Injectable } from '@nestjs/common';

import { TodayClock } from '../../application/ports/today-clock.port';

@Injectable()
export class SystemTodayClock implements TodayClock {
  public now(): Date {
    return new Date();
  }
}
