import {
  defineIntegrationEvent,
  requireDate,
  requireString,
} from '@shared/application/integration-event';

export const JournalEntrySealed = defineIntegrationEvent(
  'reflection.journal-entry.sealed.v1',
  (payload) => ({
    journalEntryId: requireString(payload, 'journalEntryId'),
    ownerId: requireString(payload, 'ownerId'),
    sealedAt: requireDate(payload, 'sealedAt'),
  }),
);
