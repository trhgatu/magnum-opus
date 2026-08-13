import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { NotificationEntity } from '../../domain/notification.entity';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../../domain/ports/notification.repository';

export interface CreateNotificationInput {
  id?: string;
  userId: string;
  title: string;
  content: string;
  type?: string;
}

@Injectable()
export class CreateNotificationService {
  private readonly logger = new Logger(CreateNotificationService.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
  ) {}

  public async execute(input: CreateNotificationInput): Promise<string> {
    const id = input.id ?? randomUUID();
    const notification = NotificationEntity.createNew({ ...input, id });
    const created = await this.notifications.createIfAbsent(notification);

    this.logger.log(
      created
        ? `Created notification ${id} for user ${input.userId}`
        : `Notification ${id} already exists; delivery is idempotent`,
    );
    return id;
  }
}
