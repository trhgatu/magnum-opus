// Hợp đồng công khai giữa các bounded context. Thuần TypeScript: không biết
// outbox, Prisma hay domain của nơi phát, để context nghe chỉ phụ thuộc vào đây.

export type OutboxPayload = Record<string, unknown>;

export interface IntegrationEvent<P> {
  readonly type: string;
  // Tên cũ vẫn đọc được trong lúc chuyển đổi. Khi ghi luôn dùng `type`.
  readonly legacyTypes: readonly string[];
  parse(payload: OutboxPayload): P;
}

export const defineIntegrationEvent = <P>(
  type: string,
  parse: (payload: OutboxPayload) => P,
  legacyTypes: readonly string[] = [],
): IntegrationEvent<P> => ({ type, legacyTypes, parse });

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

export const requireDate = (payload: OutboxPayload, key: string): Date =>
  new Date(requireString(payload, key));
