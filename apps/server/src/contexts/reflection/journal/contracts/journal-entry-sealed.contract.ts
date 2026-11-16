import {
  defineIntegrationEvent,
  requireDate,
  requireString,
} from '@shared/application/integration-event';

export const JournalEntrySealed = defineIntegrationEvent(
  // "relection" sai chính tả nhưng đang nằm trong DB. Nhịp 1/3 của việc đổi
  // tên: vẫn ghi tên cũ để instance cũ chạy song song lúc deploy đọc được.
  // shortcut: nhịp 2 (đổi type + migration đổi tên row) làm ở PR sau, khi
  // bản này đã lên production.
  'relection.journal-entry.sealed.v1',
  (payload) => ({
    journalEntryId: requireString(payload, 'journalEntryId'),
    ownerId: requireString(payload, 'ownerId'),
    sealedAt: requireDate(payload, 'sealedAt'),
  }),
  ['reflection.journal-entry.sealed.v1'],
);
