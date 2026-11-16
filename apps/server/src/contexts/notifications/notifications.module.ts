import { NotificationsOutbox } from './infrastructure/outbox/notifications.outbox';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaNotificationRepository } from './infrastructure/repositories/prisma-notification.repository';
import { NotificationController } from './presentation/controllers/notification.controller';
import { MarkNotificationReadHandler } from './application/commands/handlers/mark-read.handler';
import { GetNotificationsHandler } from './application/queries/handlers/get-notifications.handler';
import { NOTIFICATION_REPOSITORY } from './domain/ports/notification.repository';
import { CreateNotificationService } from './application/services/create-notification.service';
import { WelcomeRegisteredUserHandler } from './infrastructure/outbox/welcome-registered-user.handler';
import { NotifyDeactivatedUserHandler } from './infrastructure/outbox/notify-deactivated-user.handler';
import { PushCreatedNotificationHandler } from './infrastructure/outbox/push-created-notification.handler';

const CommandHandlers = [MarkNotificationReadHandler];
const QueryHandlers = [GetNotificationsHandler];

@Module({
  imports: [CqrsModule],
  controllers: [NotificationController],
  providers: [
    NotificationsOutbox,
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: PrismaNotificationRepository,
    },
    ...CommandHandlers,
    ...QueryHandlers,
    CreateNotificationService,
    WelcomeRegisteredUserHandler,
    NotifyDeactivatedUserHandler,
    PushCreatedNotificationHandler,
  ],
  exports: [NOTIFICATION_REPOSITORY, CreateNotificationService],
})
export class NotificationsModule {}
