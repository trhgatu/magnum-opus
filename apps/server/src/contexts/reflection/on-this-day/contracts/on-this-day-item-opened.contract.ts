import {
  defineIntegrationEvent,
  requireDate,
  requireString,
} from '@shared/application/integration-event';

export const OnThisDayItemOpened = defineIntegrationEvent(
  'reflection.on-this-day.item-opened.v1',
  (payload) => ({
    ownerId: requireString(payload, 'ownerId'),
    kind: requireString(payload, 'kind'),
    itemId: requireString(payload, 'itemId'),
    openedAt: requireDate(payload, 'openedAt'),
  }),
);
