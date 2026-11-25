import {
  defineIntegrationEvent,
  requireDate,
  requireString,
} from '@shared/application/integration-event';

// Contract của event không import gì ngoài helper chung (dependency-rules).
const ON_THIS_DAY_KINDS = ['MEMORY', 'JOURNAL'] as const;
type OnThisDayKind = (typeof ON_THIS_DAY_KINDS)[number];

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
