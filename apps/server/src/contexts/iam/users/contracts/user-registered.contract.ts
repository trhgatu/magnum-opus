import {
  defineIntegrationEvent,
  requireString,
} from '@shared/application/integration-event';

export const UserRegistered = defineIntegrationEvent(
  'iam.user.registered.v1',
  (payload) => ({
    userId: requireString(payload, 'userId'),
    email: requireString(payload, 'email'),
    username: requireString(payload, 'username'),
  }),
);
