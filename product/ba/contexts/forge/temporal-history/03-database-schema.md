# Forge Temporal History — Database Schema

> **Status:** Candidate / Draft
>
> **Domain:** Forge (Habit, Routine)
>
> **Purpose:** Prisma model, ràng buộc và migration (kèm backfill) cho 4 bảng lịch sử và cột `createdOn`, chia theo đúng 3 PR implementation.

---

## 1. Related Documentation

`02-domain-analysis.md` — quy tắc ghi (§3), quy tắc đọc (§4), bất biến (§5), backfill (§6).

---

## 2. PR 1 — Lifecycle History + `createdOn`

### 2.1. Prisma

```prisma
enum ForgeLifecycleAction {
  ARCHIVED
  RESTORED
}

model Habit {
  // ... các field hiện có giữ nguyên
  createdOn DateTime @map("created_on") @db.Date

  lifecycleTransitions HabitLifecycleTransition[]
}

model Routine {
  // ... các field hiện có giữ nguyên
  createdOn DateTime @map("created_on") @db.Date

  lifecycleTransitions RoutineLifecycleTransition[]
}

model HabitLifecycleTransition {
  id          String               @id @default(uuid())
  habitId     String               @map("habit_id")
  ownerId     String               @map("owner_id")
  action      ForgeLifecycleAction
  effectiveOn DateTime             @map("effective_on") @db.Date
  occurredAt  DateTime             @map("occurred_at")
  createdAt   DateTime             @default(now()) @map("created_at")

  habit Habit @relation(fields: [habitId, ownerId], references: [id, ownerId], onDelete: Cascade)

  @@index([habitId, effectiveOn, occurredAt])
  @@index([ownerId, effectiveOn])
  @@map("habit_lifecycle_transitions")
}

model RoutineLifecycleTransition {
  id          String               @id @default(uuid())
  routineId   String               @map("routine_id")
  ownerId     String               @map("owner_id")
  action      ForgeLifecycleAction
  effectiveOn DateTime             @map("effective_on") @db.Date
  occurredAt  DateTime             @map("occurred_at")
  createdAt   DateTime             @default(now()) @map("created_at")

  routine Routine @relation(fields: [routineId, ownerId], references: [id, ownerId], onDelete: Cascade)

  @@index([routineId, effectiveOn, occurredAt])
  @@index([ownerId, effectiveOn])
  @@map("routine_lifecycle_transitions")
}
```

**`onDelete: Cascade`** (khác `Restrict` của Project outcome history): Habit/Routine hiện không có thao tác xóa vĩnh viễn — chỉ bị xóa khi xóa cả User (cascade từ `User`). Khi đó lịch sử của chúng cũng không còn ý nghĩa. Nếu sau này có thao tác xóa Habit, quyết định này phải được xem lại.

**Quan hệ qua `[habitId, ownerId]`**: giống `HabitCheckIn` — bảo đảm ở tầng database rằng lịch sử luôn cùng owner với Habit.

### 2.2. Migration SQL (sửa tay sau `prisma migrate dev --create-only`)

`--create-only` sinh sẵn `ALTER TABLE ... ADD COLUMN "created_on" DATE NOT NULL` cho `habits`/`routines`. Câu đó **thất bại trên bảng đã có dữ liệu** (cột NOT NULL không có default). Vì vậy phải **thay thế** (không phải nối thêm) 2 câu `ADD COLUMN "created_on"` được sinh ra bằng khối dưới đây — thêm cột nullable, backfill, rồi mới `SET NOT NULL`. Các câu `CREATE TYPE`/`CREATE TABLE`/`CREATE INDEX`/`ADD CONSTRAINT` khác do Prisma sinh giữ nguyên; khối backfill transition (bước 2) đặt **sau** `CREATE TABLE` của 2 bảng transition.

Công thức ngày lịch dùng `users.time_zone` tại lúc migration — gần đúng cho owner đã đổi múi giờ sau khi tạo Habit/Routine (02-domain-analysis.md §6).

```sql
-- 1) createdOn: thêm nullable → backfill → NOT NULL
ALTER TABLE "habits"   ADD COLUMN "created_on" DATE;
ALTER TABLE "routines" ADD COLUMN "created_on" DATE;

UPDATE "habits" h
SET "created_on" = (h."created_at" AT TIME ZONE 'UTC' AT TIME ZONE u."time_zone")::date
FROM "users" u WHERE u."id" = h."owner_id";

UPDATE "routines" r
SET "created_on" = (r."created_at" AT TIME ZONE 'UTC' AT TIME ZONE u."time_zone")::date
FROM "users" u WHERE u."id" = r."owner_id";

ALTER TABLE "habits"   ALTER COLUMN "created_on" SET NOT NULL;
ALTER TABLE "routines" ALTER COLUMN "created_on" SET NOT NULL;

-- 2) Backfill ARCHIVED cho Habit/Routine đang archive (02 §6)
INSERT INTO "habit_lifecycle_transitions"
  ("id", "habit_id", "owner_id", "action", "effective_on", "occurred_at")
SELECT gen_random_uuid(), h."id", h."owner_id", 'ARCHIVED',
       (h."updated_at" AT TIME ZONE 'UTC' AT TIME ZONE u."time_zone")::date,
       h."updated_at"
FROM "habits" h JOIN "users" u ON u."id" = h."owner_id"
WHERE h."is_active" = false;

INSERT INTO "routine_lifecycle_transitions"
  ("id", "routine_id", "owner_id", "action", "effective_on", "occurred_at")
SELECT gen_random_uuid(), r."id", r."owner_id", 'ARCHIVED',
       (r."updated_at" AT TIME ZONE 'UTC' AT TIME ZONE u."time_zone")::date,
       r."updated_at"
FROM "routines" r JOIN "users" u ON u."id" = r."owner_id"
WHERE r."is_active" = false;
```

`created_at`/`updated_at` của Prisma là `timestamp without time zone` lưu giờ UTC, nên phải gắn `AT TIME ZONE 'UTC'` trước rồi mới quy đổi sang múi giờ owner.

---

## 3. PR 2 — Habit Schedule History

### 3.1. Prisma

```prisma
model Habit {
  // ...
  scheduleVersions HabitScheduleVersion[]
}

model HabitScheduleVersion {
  id            String             @id @default(uuid())
  habitId       String             @map("habit_id")
  ownerId       String             @map("owner_id")
  frequencyType HabitFrequencyType @map("frequency_type")
  frequencyDays Int[]              @default([]) @map("frequency_days")
  effectiveFrom DateTime           @map("effective_from") @db.Date
  effectiveTo   DateTime?          @map("effective_to") @db.Date
  createdAt     DateTime           @default(now()) @map("created_at")

  habit Habit @relation(fields: [habitId, ownerId], references: [id, ownerId], onDelete: Cascade)

  @@index([habitId, effectiveFrom])
  @@index([ownerId, effectiveFrom])
  @@map("habit_schedule_versions")
}
```

### 3.2. Migration SQL (nối thêm sau phần `--create-only` sinh ra)

Prisma sinh `CREATE TABLE` và index thường; khối dưới đây nối thêm **sau** đó (bảng mới nên không có vấn đề NOT NULL như §2.2).

```sql
-- Bất biến 02 §5: tối đa 1 phiên bản đang mở / Habit; khoảng hợp lệ
CREATE UNIQUE INDEX "habit_schedule_versions_one_open_per_habit"
  ON "habit_schedule_versions" ("habit_id") WHERE "effective_to" IS NULL;

ALTER TABLE "habit_schedule_versions"
  ADD CONSTRAINT "habit_schedule_versions_valid_range"
  CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");

-- Backfill: 1 phiên bản [createdOn, null) với tần suất hiện tại (02 §6)
INSERT INTO "habit_schedule_versions"
  ("id", "habit_id", "owner_id", "frequency_type", "frequency_days",
   "effective_from", "effective_to")
SELECT gen_random_uuid(), h."id", h."owner_id", h."frequency_type",
       h."frequency_days", h."created_on", NULL
FROM "habits" h
WHERE h."type" = 'BUILD' AND h."frequency_type" IS NOT NULL;
```

Prisma schema không biểu diễn được partial unique index — index này chỉ tồn tại trong migration SQL, và phải được ghi chú bằng comment cạnh model trong `schema.prisma` để người sau không vô tình bỏ.

---

## 4. PR 3 — Routine Membership History

### 4.1. Prisma

```prisma
model Routine {
  // ...
  membershipHistory RoutineHabitMembership[]
}

model Habit {
  // ...
  routineMembershipHistory RoutineHabitMembership[]
}

model RoutineHabitMembership {
  id        String    @id @default(uuid())
  routineId String    @map("routine_id")
  habitId   String    @map("habit_id")
  ownerId   String    @map("owner_id")
  addedOn   DateTime  @map("added_on") @db.Date
  removedOn DateTime? @map("removed_on") @db.Date
  createdAt DateTime  @default(now()) @map("created_at")

  routine Routine @relation(fields: [routineId, ownerId], references: [id, ownerId], onDelete: Cascade)
  habit   Habit   @relation(fields: [habitId, ownerId], references: [id, ownerId], onDelete: Cascade)

  @@index([routineId, addedOn])
  @@index([habitId])
  @@map("routine_habit_memberships")
}
```

### 4.2. Migration SQL (nối thêm sau phần `--create-only` sinh ra)

Prisma sinh `CREATE TABLE` và index thường; khối dưới đây nối thêm **sau** đó (bảng mới nên không có vấn đề NOT NULL như §2.2).

```sql
CREATE UNIQUE INDEX "routine_habit_memberships_one_open_per_pair"
  ON "routine_habit_memberships" ("routine_id", "habit_id")
  WHERE "removed_on" IS NULL;

ALTER TABLE "routine_habit_memberships"
  ADD CONSTRAINT "routine_habit_memberships_valid_range"
  CHECK ("removed_on" IS NULL OR "removed_on" >= "added_on");

-- Backfill: mỗi RoutineHabit hiện có → 1 khoảng đang mở (02 §6)
INSERT INTO "routine_habit_memberships"
  ("id", "routine_id", "habit_id", "owner_id", "added_on", "removed_on")
SELECT gen_random_uuid(), rh."routine_id", rh."habit_id", rh."owner_id",
       GREATEST(r."created_on", h."created_on"), NULL
FROM "routine_habits" rh
JOIN "routines" r ON r."id" = rh."routine_id"
JOIN "habits"   h ON h."id" = rh."habit_id";
```

---

## 5. Verification Checklist (mỗi PR)

```text
- prisma validate + migrate dev chạy sạch trên DB có dữ liệu thật
  (không chỉ DB rỗng) để kiểm backfill.
- Sau migration: mọi Habit BUILD có đúng 1 phiên bản mở (PR 2); mọi
  RoutineHabit có đúng 1 dòng thành viên mở (PR 3).
- Test repository: thay đổi bị từ chối do revision → không có dòng
  lịch sử nào được ghi.
- Backend E2E: archive/restore/update/add/remove vẫn trả response như
  cũ (API không đổi).
```
