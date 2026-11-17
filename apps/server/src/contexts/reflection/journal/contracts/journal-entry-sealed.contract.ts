import {
  defineIntegrationEvent,
  requireDate,
  requireString,
} from '@shared/application/integration-event';

export const JournalEntrySealed = defineIntegrationEvent(
  // Nhịp 2/3 của việc đổi tên "relection" → "reflection": từ bản này ghi tên
  // đúng. Tên cũ vẫn đọc được, vì instance cũ còn chạy lúc deploy vẫn ghi nó.
  // shortcut: nhịp 3 làm ở PR sau, khi bản này đã lên production: tạo thư mục
  // migration MỚI lặp lại câu UPDATE của 20261117090000 (Prisma không chạy lại
  // migration đã ghi nhận), rồi bỏ alias.
  'reflection.journal-entry.sealed.v1',
  (payload) => ({
    journalEntryId: requireString(payload, 'journalEntryId'),
    ownerId: requireString(payload, 'ownerId'),
    sealedAt: requireDate(payload, 'sealedAt'),
  }),
  ['relection.journal-entry.sealed.v1'],
);
