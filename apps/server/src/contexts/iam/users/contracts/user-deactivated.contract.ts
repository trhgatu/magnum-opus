import {
  defineIntegrationEvent,
  requireString,
} from '@shared/application/integration-event';

export const UserDeactivated = defineIntegrationEvent(
  'iam.user.deactivated.v1',
  (payload) => ({
    userId: requireString(payload, 'userId'),
    email: requireString(payload, 'email'),
  }),
);
