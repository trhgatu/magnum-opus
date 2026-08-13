import type { RealtimeGateway } from './realtime.gateway';
import { SocketIoRealtimeAdapter } from './socket-io-realtime.adapter';

describe('SocketIoRealtimeAdapter', () => {
  it('delivers a user event through the gateway boundary', () => {
    const gateway = {
      emitToUser: jest.fn(),
      emitToAll: jest.fn(),
    } as unknown as jest.Mocked<RealtimeGateway>;
    const adapter = new SocketIoRealtimeAdapter(gateway);
    const payload = { id: 'notification-1' };

    adapter.sendToUser('user-1', 'notification_received', payload);

    expect(gateway.emitToUser).toHaveBeenCalledWith(
      'user-1',
      'notification_received',
      payload,
    );
  });

  it('broadcasts through the gateway boundary', () => {
    const gateway = {
      emitToUser: jest.fn(),
      emitToAll: jest.fn(),
    } as unknown as jest.Mocked<RealtimeGateway>;
    const adapter = new SocketIoRealtimeAdapter(gateway);

    adapter.broadcast('system_event', { ready: true });

    expect(gateway.emitToAll).toHaveBeenCalledWith('system_event', {
      ready: true,
    });
  });
});
