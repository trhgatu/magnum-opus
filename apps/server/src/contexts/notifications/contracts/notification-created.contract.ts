import {
  defineIntegrationEvent,
  requireBoolean,
  requireDate,
  requireString,
} from '@shared/application/integration-event';

export const NotificationCreated = defineIntegrationEvent(
  'notifications.notification.created.v1',
  (payload) => ({
    id: requireString(payload, 'id'),
    userId: requireString(payload, 'userId'),
    title: requireString(payload, 'title'),
    content: requireString(payload, 'content'),
    type: requireString(payload, 'type'),
    isRead: requireBoolean(payload, 'isRead'),
    createdAt: requireDate(payload, 'createdAt'),
  }),
);
