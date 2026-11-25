import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';
import { OutboxSerializer } from '@infrastructure/event-bus/outbox/outbox-publication';

import type { OnThisDayOpenings } from '../../application/ports/on-this-day-openings.port';
import type { OnThisDayItemOpenedEvent } from '../../domain/events/on-this-day-item-opened.event';

@Injectable()
export class PrismaOnThisDayOpeningsWriter implements OnThisDayOpenings {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxSerializer,
  ) {}

  async record(event: OnThisDayItemOpenedEvent): Promise<void> {
    await this.prisma.outboxEvent.create({
      data: this.outbox.serialize(event),
    });
  }
}
