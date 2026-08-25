import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import {
  HabitCheckInReader,
  type HabitCheckInReadModel,
} from '../../application/ports/habit-check-in-reader.port';
import { HabitCheckInDate } from '../../domain/value-objects';

@Injectable()
export class PrismaHabitCheckInReader implements HabitCheckInReader {
  constructor(private readonly prisma: PrismaService) {}

  public async findForHabitInRange(
    habitId: string,
    ownerId: string,
    from: string,
    to: string,
  ): Promise<HabitCheckInReadModel[]> {
    const rows = await this.prisma.habitCheckIn.findMany({
      where: {
        habitId,
        ownerId,
        date: {
          gte: HabitCheckInDate.create(from).toPersistenceDate(),
          lte: HabitCheckInDate.create(to).toPersistenceDate(),
        },
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      habitId: row.habitId,
      date: row.date.toISOString().slice(0, 10),
      createdAt: row.createdAt,
    }));
  }
}
