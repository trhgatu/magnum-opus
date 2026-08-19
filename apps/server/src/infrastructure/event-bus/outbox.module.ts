import { Module, Global } from '@nestjs/common';
import { OutboxPublisherService } from './outbox/outbox-publisher.service';
import { OutboxEventRouter } from './outbox/outbox-event.router';
import { NotificationsModule } from '@/contexts/notifications/notifications.module';
import { TimelineModule } from '@/contexts/reflection/timeline/timeline.module';

@Global()
@Module({
  imports: [NotificationsModule, TimelineModule],
  providers: [OutboxEventRouter, OutboxPublisherService],
  exports: [OutboxPublisherService],
})
export class OutboxModule {}
