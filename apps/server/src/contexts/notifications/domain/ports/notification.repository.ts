import { NotificationEntity } from '../notification.entity';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface NotificationRepository {
  createIfAbsent(notification: NotificationEntity): Promise<boolean>;
  findByIdForOwner(
    id: string,
    userId: string,
  ): Promise<NotificationEntity | null>;
  update(notification: NotificationEntity): Promise<void>;
  findByUserId(
    userId: string,
    options: { page: number; limit: number },
  ): Promise<{
    items: NotificationEntity[];
    total: number;
    unreadCount: number;
  }>;
  markAllAsRead(userId: string): Promise<void>;
}
