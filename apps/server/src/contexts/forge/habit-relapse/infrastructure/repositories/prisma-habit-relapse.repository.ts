import { Injectable } from '@nestjs/common';

import { OutboxSerializer } from '@infrastructure/event-bus/outbox/outbox-publication';
import { PrismaService } from '@infrastructure/database/prisma.service';

import { HabitRelapse } from '../../domain/habit-relapse.aggregate';
import { HabitRelapseRepository } from '../../domain/ports/habit-relapse.repository';
import { PrismaHabitRelapseMapper } from '../mappers/prisma-habit-relapse.mapper';

@Injectable()
export class PrismaHabitRelapseRepository implements HabitRelapseRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxSerializer,
  ) {}

  public async create(relapse: HabitRelapse): Promise<void> {
    const data = PrismaHabitRelapseMapper.toPersistence(relapse);
    const outboxEvents = relapse
      .getDomainEvents()
      .map((event) => this.outbox.serialize(event));

    await this.prisma.$transaction(async (transaction) => {
      await transaction.habitRelapse.create({ data });
      await transaction.outboxEvent.createMany({
        data: outboxEvents,
      });
    });
  }
}
