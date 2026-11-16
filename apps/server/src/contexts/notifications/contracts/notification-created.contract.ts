import {
  defineIntegrationEvent,
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
    isRead: payload.isRead === true,
    createdAt: requireDate(payload, 'createdAt'),
  }),
);
