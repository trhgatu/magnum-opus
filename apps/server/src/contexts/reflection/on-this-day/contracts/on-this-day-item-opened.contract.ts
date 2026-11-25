import { ON_THIS_DAY_KINDS, type OnThisDayKind } from '@repo/contracts';
import {
  defineIntegrationEvent,
  requireDate,
  requireString,
} from '@shared/application/integration-event';

const isOnThisDayKind = (value: string): value is OnThisDayKind =>
  (ON_THIS_DAY_KINDS as readonly string[]).includes(value);

export const OnThisDayItemOpened = defineIntegrationEvent(
  'reflection.on-this-day.item-opened.v1',
  (payload) => {
    const kind = requireString(payload, 'kind');
    if (!isOnThisDayKind(kind)) {
      throw new Error(`Unknown on-this-day kind "${kind}"`);
    }
    return {
      ownerId: requireString(payload, 'ownerId'),
      kind,
      itemId: requireString(payload, 'itemId'),
      openedAt: requireDate(payload, 'openedAt'),
    };
  },
);
