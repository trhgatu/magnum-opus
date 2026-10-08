# Forge Temporal History — Domain Analysis

> **Status:** Candidate / Draft
>
> **Domain:** Forge (Habit, Routine)
>
> **Purpose:** Định nghĩa 4 loại lịch sử, quy tắc ghi cho từng thao tác hiện có, quy tắc đọc "trạng thái tại ngày D", bất biến và cách backfill.

---

## 1. Related Documentation

`01-ba-overview.md` (tài liệu này là phần tiếp theo — đặc biệt KD-FTH-001..006). `03-database-schema.md` cho Prisma model và migration.

---

## 2. Domain Analysis Principles

### DAP-FTH-001 — One Calendar Date Type for Every Effective Date

Mọi mốc hiệu lực (`effectiveOn`, `effectiveFrom`/`effectiveTo`, `addedOn`/`removedOn`) là **ngày lịch date-only** của owner (`YYYY-MM-DD`, lưu `@db.Date`), chốt tại thời điểm ghi theo `User.timeZone` lúc đó (KD-FTH-003). Đây là cùng kiểu với `HabitCheckIn.date`, nên khi đọc chỉ cần so ngày với ngày — không quy đổi múi giờ lần nào nữa.

Ngày lịch "hôm nay" của owner được tính bằng đúng cách check-in đang dùng (`Clock` + `UserTimeZoneReader` → ngày lịch), ở **tầng application**, rồi truyền vào aggregate. Aggregate không tự biết múi giờ.

### DAP-FTH-002 — Half-Open Intervals Everywhere

Mọi khoảng hiệu lực là nửa mở `[from, to)`: bao gồm ngày `from`, không bao gồm ngày `to`. `to = null` nghĩa là "đang hiệu lực". Khoảng rỗng `[D, D)` hợp lệ và không khớp ngày nào (KD-FTH-006).

### DAP-FTH-003 — History Is Written in the Same Transaction as the Change

Aggregate ghi nhận thay đổi thành domain event (giống `Project`); repository ghi trạng thái hiện tại **và** dòng lịch sử trong cùng 1 `$transaction`, sau cùng kiểm tra `revision`. Nếu optimistic concurrency thất bại, cả hai cùng rollback — không bao giờ có lịch sử cho một thay đổi không xảy ra, hay thay đổi không có lịch sử.

### DAP-FTH-004 — History Is Derived From Domain Events, Not Table Diffs

`PrismaRoutineRepository` hiện ghi `RoutineHabit` bằng `deleteMany` + `createMany` (để giữ `order`). Lịch sử thành viên **không** được suy ra bằng cách so bảng trước/sau, mà từ event `RoutineHabitAdded` / `RoutineHabitRemoved` do aggregate phát ra. Sắp xếp lại (`reorderHabits`, `moveHabitUp/Down`) không phát event thành viên nên không tạo lịch sử.

---

## 3. History Concepts and Write Rules

### 3.1. HabitLifecycleTransition

```text
HabitLifecycleTransition
├── id
├── habitId, ownerId
├── action: ARCHIVED | RESTORED
├── effectiveOn   (ngày lịch owner lúc thao tác)
└── occurredAt    (instant thật — để sắp thứ tự trong cùng 1 ngày)
```

| Thao tác hiện có | Ghi gì                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| `CreateHabit`    | Không ghi transition. Ngày bắt đầu sống = ngày lịch của `Habit.createdAt` (lưu thành `createdOn`, §3.5). |
| `ArchiveHabit`   | 1 dòng `ARCHIVED`, `effectiveOn = hôm nay`                                                               |
| `RestoreHabit`   | 1 dòng `RESTORED`, `effectiveOn = hôm nay`                                                               |
| `UpdateHabit`    | Không ghi transition (xem §3.3 cho tần suất)                                                             |

Không có thao tác "gộp": archive rồi khôi phục trong cùng ngày để lại 2 dòng; trạng thái của ngày đó là trạng thái sau dòng có `occurredAt` muộn nhất (§4.1).

### 3.2. RoutineLifecycleTransition

Giống hệt §3.1, cho `Routine` (`routineId` thay cho `habitId`), ghi bởi `ArchiveRoutine` / `RestoreRoutine`. `CreateRoutine` không ghi transition; ngày bắt đầu sống = `Routine.createdOn`.

### 3.3. HabitScheduleVersion

```text
HabitScheduleVersion
├── id
├── habitId, ownerId
├── frequencyType: DAILY | WEEKLY
├── frequencyDays: int[]          (ISO weekday, giống Habit hiện tại)
├── effectiveFrom                 (ngày lịch, bao gồm)
└── effectiveTo | null            (ngày lịch, không bao gồm; null = đang dùng)
```

Chỉ áp dụng cho Habit **BUILD** (Habit QUIT không có tần suất — `../habit/v2`). Loại Habit không đổi được sau khi tạo, nên một Habit hoặc luôn có, hoặc không bao giờ có phiên bản.

| Thao tác hiện có                            | Ghi gì                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `CreateHabit` (BUILD)                       | 1 phiên bản `[createdOn, null)` với tần suất ban đầu                       |
| `UpdateHabit` có đổi tần suất (hôm nay = D) | Đóng phiên bản đang mở: `effectiveTo = D`. Thêm phiên bản mới `[D, null)`. |
| `UpdateHabit` không đổi tần suất            | Không ghi gì (aggregate đã so `frequenciesEqual`)                          |
| `ArchiveHabit` / `RestoreHabit`             | Không đụng tới phiên bản — archive được thể hiện ở §3.1                    |

Đổi tần suất nhiều lần trong cùng ngày D: mỗi lần đóng phiên bản trước tại D, nên các phiên bản trung gian thành `[D, D)` (rỗng) và chỉ phiên bản cuối cùng có hiệu lực từ D (KD-FTH-006). `UpdateHabit` đã chặn Habit đang archive (`ensureActive`), nên không có trường hợp đổi tần suất khi Habit không sống.

### 3.4. RoutineHabitMembership

```text
RoutineHabitMembership
├── id
├── routineId, habitId, ownerId
├── addedOn                       (ngày lịch, bao gồm)
└── removedOn | null              (ngày lịch, không bao gồm; null = vẫn trong Routine)
```

`RoutineHabit` hiện tại giữ nguyên vai trò "thành viên hiện tại + thứ tự" (KD-FTH-004). `RoutineHabitMembership` là lịch sử song song.

| Thao tác hiện có                              | Ghi gì                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| `AddRoutineHabit` (hôm nay = D)               | 1 dòng `[D, null)`                                                       |
| `RemoveRoutineHabit` (hôm nay = D)            | Đóng dòng đang mở của cặp (routine, habit): `removedOn = D`              |
| `Reorder` / `MoveUp` / `MoveDown`             | Không ghi gì                                                             |
| `ArchiveRoutine` / `RestoreRoutine`           | Không đụng tới thành viên — thể hiện ở §3.2                              |
| `ArchiveHabit` (Habit đang nằm trong Routine) | Không đụng tới thành viên — Habit không sống thì tự không đến hạn (§4.4) |

Gỡ rồi thêm lại cùng ngày D: dòng cũ đóng tại D, dòng mới mở từ D → Habit vẫn là thành viên ngày D. Thêm rồi gỡ cùng ngày: dòng `[D, D)` rỗng.

### 3.5. Creation Date

Để mọi phép đọc chỉ dùng ngày lịch, `Habit` và `Routine` có thêm `createdOn` (ngày lịch owner của `createdAt`, ghi lúc tạo, không đổi). `createdAt` (instant) giữ nguyên.

---

## 4. Read Semantics — "Trạng thái tại ngày D"

Đây là hợp đồng cho mọi consumer (Chronicle 02 §5 dùng trực tiếp).

### 4.1. Habit sống vào ngày D

```text
aliveOn(habit, D) =
  D ≥ habit.createdOn
  VÀ (
    không có transition nào có effectiveOn ≤ D
    HOẶC transition mới nhất trong số đó (theo effectiveOn, rồi occurredAt)
         là RESTORED
  )
```

Hệ quả (KD-FTH-005):

- Archive ngày D → ngày D **không** sống (không bị tính là ngày đến hạn bị bỏ lỡ).
- Khôi phục ngày D → ngày D sống.
- Archive rồi khôi phục cùng ngày D → ngày D sống.

### 4.2. Routine sống vào ngày D

Giống §4.1 với `RoutineLifecycleTransition` và `Routine.createdOn`.

### 4.3. Tần suất của Habit vào ngày D

```text
scheduleOn(habit, D) = phiên bản có effectiveFrom ≤ D < effectiveTo
                       (effectiveTo = null coi như +∞)
```

Bất biến §5 bảo đảm có **tối đa 1** phiên bản khớp; với Habit BUILD và `D ≥ createdOn` thì có **đúng 1**.

### 4.4. Habit đến hạn vào ngày D

```text
dueOn(habit, D) =
  habit.type = BUILD
  VÀ aliveOn(habit, D)
  VÀ scheduleOn(habit, D).isDueOn(isoWeekday(D))
```

`isDueOn` dùng đúng logic `HabitFrequency.isDueOn` hiện có.

### 4.5. Habit là thành viên Routine vào ngày D

```text
memberOn(routine, habit, D) = tồn tại dòng có addedOn ≤ D < removedOn
                              (removedOn = null coi như +∞)
```

### 4.6. Ghi chú về check-in trong ngày archive

Check-in chỉ tạo được cho hôm nay và chỉ khi Habit đang sống. Người dùng có thể check-in rồi archive trong cùng ngày D: dòng `HabitCheckIn` của ngày D vẫn tồn tại, nhưng theo §4.1 ngày D không sống nên không phải ngày đến hạn. Consumer **chỉ đếm check-in trên ngày đến hạn** — check-in đó bị bỏ qua. Chấp nhận: trường hợp hiếm, và ảnh hưởng tối đa 1 ngày.

---

## 5. Invariants

| Invariant                                                                    | Enforced By                                                            |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Mỗi Habit BUILD có đúng 1 phiên bản đang mở                                  | Partial unique index `(habitId) WHERE effectiveTo IS NULL` + aggregate |
| Các phiên bản của 1 Habit liền mạch, không chồng lấn, bắt đầu từ `createdOn` | Quy tắc ghi §3.3 (luôn đóng tại D rồi mở từ D)                         |
| Habit QUIT không có phiên bản nào                                            | Quy tắc ghi §3.3 + test                                                |
| Mỗi cặp (routine, habit) có tối đa 1 dòng thành viên đang mở                 | Partial unique index `(routineId, habitId) WHERE removedOn IS NULL`    |
| Dòng thành viên đang mở ⇔ có dòng `RoutineHabit` tương ứng                   | Ghi cùng transaction (DAP-FTH-003)                                     |
| `effectiveTo ≥ effectiveFrom`, `removedOn ≥ addedOn`                         | CHECK constraint                                                       |
| Lịch sử không bao giờ bị sửa/xóa, trừ đóng khoảng đang mở đúng 1 lần         | Không có update/delete path nào khác trong application layer           |
| Có lịch sử ⇔ thay đổi đã thực sự xảy ra                                      | Cùng transaction + `revision` (DAP-FTH-003)                            |

---

## 6. Backfill (dữ liệu có trước migration)

Migration chạy 1 lần, điền lịch sử gần đúng cho dữ liệu hiện có (ASM-FTH-002). "Ngày lịch" dưới đây = `(timestamp AT TIME ZONE users.time_zone)::date` của owner.

```text
Habit.createdOn / Routine.createdOn  = ngày lịch của createdAt          (chính xác)

HabitScheduleVersion (mỗi Habit BUILD)
  1 phiên bản [createdOn, null) với tần suất HIỆN TẠI                  (gần đúng:
                                                                         mất các lần
                                                                         đổi trước đó)

HabitLifecycleTransition (mỗi Habit có isActive = false)
  1 dòng ARCHIVED, effectiveOn = ngày lịch của updatedAt,              (gần đúng:
  occurredAt = updatedAt                                                 updatedAt là
                                                                         thay đổi cuối,
                                                                         thường chính
                                                                         là archive)

RoutineLifecycleTransition (mỗi Routine có isActive = false)
  như trên

RoutineHabitMembership (mỗi dòng RoutineHabit hiện có)
  1 dòng [addedOn, null) với addedOn = max(Routine.createdOn,          (gần đúng: không
                                           Habit.createdOn)              có ngày thêm
                                                                         thật; mất các
                                                                         lần gỡ trước đó)
```

Sai số chỉ ảnh hưởng tới quá khứ **trước** migration. Từ thời điểm migration trở đi, lịch sử chính xác.

---

## 7. Impact on Existing Behavior

```text
Today, check-in, relapse, Habit list/detail, Routine list/detail:
  KHÔNG đổi — vẫn đọc Habit.isActive, frequency hiện tại, RoutineHabit.

API contract (Habit, Routine):
  KHÔNG đổi request/response. Các command archive/restore/update/add/
  remove ghi thêm lịch sử bên trong, người dùng không thấy khác biệt.

Command handlers bị ảnh hưởng (cần tính "hôm nay" theo owner):
  CreateHabit, UpdateHabit, ArchiveHabit, RestoreHabit,
  CreateRoutine, ArchiveRoutine, RestoreRoutine,
  AddRoutineHabit, RemoveRoutineHabit
```

---

## 8. Out of Scope for Domain Analysis

```text
- Đọc lịch sử qua API cho người dùng (01 §6 Out of Scope).
- Gộp các phiên bản liền kề có cùng tần suất (vd đổi A→B→A ở 2 ngày
  khác nhau tạo 3 phiên bản) — đúng về ngữ nghĩa, không cần tối ưu.
- Sửa lịch sử backfill sai bằng tay — không có công cụ ở V1.
```
