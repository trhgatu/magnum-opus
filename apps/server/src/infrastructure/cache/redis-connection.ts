import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

// ioredis 6 mặc định dùng RESP3. Giữ RESP2 như v5: không phải dịch vụ Redis
// managed nào cũng hỗ trợ RESP3, và hình dạng reply của vài lệnh đổi theo
// protocol. Chuyển sang RESP3 phải là một quyết định riêng, có kiểm chứng.
const REDIS_PROTOCOL = 2;

/**
 * Chỉ những trường mà hàm thật sự đặt. Kiểu hẹp này gán được cho cả
 * `RedisOptions` của ioredis (RedisService) lẫn của BullMQ — RedisOptions
 * đầy đủ của ioredis 6 cho `retryStrategy: null`, BullMQ 6 thì không.
 */
export type RedisConnectionOptions = Pick<
  RedisOptions,
  'host' | 'port' | 'username' | 'password' | 'tls' | 'protocol'
>;

export const buildRedisConnection = (
  configService: ConfigService,
): RedisConnectionOptions => {
  const connectionUrl = configService.get<string>('REDIS_URL')?.trim();
  if (connectionUrl) {
    const url = new URL(connectionUrl);
    if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
      throw new Error('REDIS_URL must use the redis or rediss protocol');
    }

    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 6379,
      username: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
      protocol: REDIS_PROTOCOL,
    };
  }

  return {
    protocol: REDIS_PROTOCOL,
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: Number(configService.get<number>('REDIS_PORT', 6380)),
    username: configService.get<string>('REDIS_USERNAME') || undefined,
    password: configService.get<string>('REDIS_PASSWORD') || undefined,
  };
};
