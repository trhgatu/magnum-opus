import { IQuery } from '@nestjs/cqrs';

/** Mọi Habit đang rèn kèm trạng thái hôm nay, 7 ngày và chuỗi (BA habit v3). */
export class GetHabitOverviewQuery implements IQuery {
  constructor(public readonly ownerId: string) {}
}
