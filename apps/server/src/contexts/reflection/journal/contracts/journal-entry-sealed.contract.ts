import {
  defineIntegrationEvent,
  requireDate,
  requireString,
} from '@shared/application/integration-event';

export const JournalEntrySealed = defineIntegrationEvent(
  // Nhịp 2/3 của việc đổi tên "relection" → "reflection": từ bản này ghi tên
  // đúng. Tên cũ vẫn đọc được, vì instance cũ còn chạy lúc deploy vẫn ghi nó.
  // shortcut: nhịp 3 (chạy lại migration đổi tên rồi bỏ alias) làm ở PR sau,
  // khi bản này đã lên production.
  'reflection.journal-entry.sealed.v1',
  (payload) => ({
    journalEntryId: requireString(payload, 'journalEntryId'),
    ownerId: requireString(payload, 'ownerId'),
    sealedAt: requireDate(payload, 'sealedAt'),
  }),
  ['relection.journal-entry.sealed.v1'],
);
