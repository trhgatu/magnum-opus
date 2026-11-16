// Hợp đồng công khai giữa các bounded context. Thuần TypeScript: không biết
// outbox, Prisma hay domain của nơi phát, để context nghe chỉ phụ thuộc vào đây.

export type OutboxPayload = Record<string, unknown>;

export interface IntegrationEvent<P> {
  readonly type: string;
  // Tên khác vẫn đọc được trong lúc đổi tên. Khi ghi luôn dùng `type`.
  // Đổi tên theo 3 nhịp, vì lúc deploy instance cũ còn chạy song song:
  // 1. thêm tên mới vào aliases; 2. đổi type sang tên mới, tên cũ vào aliases,
  // migration đổi tên row; 3. bỏ tên cũ khỏi aliases.
  readonly aliases: readonly string[];
  parse(payload: OutboxPayload): P;
}

export const defineIntegrationEvent = <P>(
  type: string,
  parse: (payload: OutboxPayload) => P,
  aliases: readonly string[] = [],
): IntegrationEvent<P> => ({ type, aliases, parse });

export type PayloadOf<E> = E extends IntegrationEvent<infer P> ? P : never;

export interface OutboxMessage<P> {
  eventId: string;
  occurredAt: Date;
  payload: P;
}

export const requireString = (payload: OutboxPayload, key: string): string => {
  const value = payload[key];
  if (typeof value !== 'string') {
    throw new Error(`Outbox payload property "${key}" must be a string`);
  }
  return value;
};

export const requireDate = (payload: OutboxPayload, key: string): Date => {
  const value = new Date(requireString(payload, key));
  if (Number.isNaN(value.getTime())) {
    throw new Error(`Outbox payload property "${key}" must be a valid date`);
  }
  return value;
};

export const requireBoolean = (
  payload: OutboxPayload,
  key: string,
): boolean => {
  const value = payload[key];
  if (typeof value !== 'boolean') {
    throw new Error(`Outbox payload property "${key}" must be a boolean`);
  }
  return value;
};
