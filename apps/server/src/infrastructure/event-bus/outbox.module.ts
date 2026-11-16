import { Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { OutboxPublisherService } from './outbox/outbox-publisher.service';
import { OutboxRegistry } from './outbox/outbox-registry';
import { OutboxSerializer } from './outbox/outbox-publication';

@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [
    OutboxRegistry,
    { provide: OutboxSerializer, useExisting: OutboxRegistry },
    OutboxPublisherService,
  ],
  exports: [OutboxSerializer, OutboxPublisherService],
})
export class OutboxModule {}
