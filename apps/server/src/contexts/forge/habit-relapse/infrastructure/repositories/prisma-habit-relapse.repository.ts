import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { HabitRelapse } from '../../domain/habit-relapse.aggregate';
import { HabitRelapseRepository } from '../../domain/ports/habit-relapse.repository';
import { PrismaHabitRelapseMapper } from '../mappers/prisma-habit-relapse.mapper';

@Injectable()
export class PrismaHabitRelapseRepository implements HabitRelapseRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async create(relapse: HabitRelapse): Promise<void> {
    await this.prisma.habitRelapse.create({
      data: PrismaHabitRelapseMapper.toPersistence(relapse),
    });
  }
}
