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
  // shortcut: đọc tên sai cũ trong lúc deploy; xóa ở PR sau khi migration
  // 20261116120000_fix_journal_sealed_event_type đã chạy trên production.
  ['relection.journal-entry.sealed.v1'],
);
