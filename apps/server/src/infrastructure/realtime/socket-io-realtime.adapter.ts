import { Injectable } from '@nestjs/common';

import type { IRealtimePort } from '@shared/application/ports/realtime.port';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class SocketIoRealtimeAdapter implements IRealtimePort {
  constructor(private readonly gateway: RealtimeGateway) {}

  public sendToUser(userId: string, event: string, payload: unknown): void {
    this.gateway.emitToUser(userId, event, payload);
  }

  public broadcast(event: string, payload: unknown): void {
    this.gateway.emitToAll(event, payload);
  }
}
