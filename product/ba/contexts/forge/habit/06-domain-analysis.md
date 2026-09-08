# Habit V1 — Domain Analysis

> **Status:** Baseline (Reverse-Engineered)
>
> **Domain:** Forge / Habit
>
> **Purpose:** Xác định domain model của Habit — Aggregate, Value Object, Exception, Repository — suy ngược từ implementation thật.

---

## 1. Related Documentation

`05-product-specification.md` — authoritative baseline cho behavior.

### Codebase Context

Server dùng NestJS với DDD pattern, CQRS (Command/Query separation), optimistic concurrency qua `revision`, Prisma làm persistence layer — cùng convention với mọi context khác trong codebase.

---

## 2. Domain Analysis Principles

### DAP-HAB-001 — Aggregate Enforces Invariants

Mọi lifecycle invariant được enforce bên trong `Habit` aggregate, không phải application layer. Ví dụ: `Habit.archive()` tự throw `InvalidHabitTransitionException` nếu `isActive === false`, application handler không tự kiểm tra trước.

### DAP-HAB-002 — Frequency Is a First-Class Value Object

`HabitFrequency` không phải 2 field rời rạc (`frequencyType`, `frequencyDays`) ở tầng domain — nó là 1 Value Object đóng gói toàn bộ invariant (DAILY không ngày, WEEKLY ≥1 ngày, canonical hóa). Chỉ khi persist/present ra ngoài mới "bung" thành 2 field nguyên thủy (`toPrimitives()`).

### DAP-HAB-003 — No Domain Event

Habit không raise domain event nào (khớp `Routine` — cùng pattern). Lý do: chưa có consumer nào bên ngoài Habit cần được thông báo khi nó thay đổi. `HabitCheckIn` và `Today` đọc Habit trực tiếp qua query, không lắng nghe event.

### DAP-HAB-004 — Habit Has No Cycle Concept

Khác `Project` (Crucible), Habit không có khái niệm Cycle/pursuit period — nó không có điểm "hoàn thành". `isActive` là toàn bộ state cần theo dõi.

---

## 3. Domain Concepts

### 3.1. Habit (Aggregate Root)

**Responsibilities:**

- giữ identity (title, description);
- giữ frequency;
- giữ current lifecycle state (`isActive`);
- enforce lifecycle transition eligibility;
- tính toán "đến hạn hôm nay hay không" (`isDueOn`).

### 3.2. HabitFrequency (Value Object)

```text
HabitFrequency
├── type: DAILY | WEEKLY
└── days: number[] (ISO weekday 1–7, chỉ có ý nghĩa khi WEEKLY)
```

Immutable, equality theo value (`equals()`), tự enforce invariant khi `create()`/`rehydrate()`.

### 3.3. HabitId (Value Object)

UUID wrapper, sinh qua `HabitId.generate()` — static factory, không cần coordinator ID từ bên ngoài (khác `UserRepository.nextIdentity()` bên IAM).

---

## 4. Aggregate Design

```text
Habit (Aggregate Root)
├── HabitId          (Value Object)
├── title             (string)
├── description       (string | null)
├── HabitFrequency    (Value Object)
├── isActive          (boolean)
├── revision          (number, optimistic concurrency)
├── createdAt / updatedAt
```

### Aggregate Root Responsibilities

```text
habit.update({ title, description, frequency })
habit.archive()
habit.restore()
```

Mỗi method: kiểm tra eligibility → thay đổi state nếu hợp lệ → `trackChange()` (tăng revision, cập nhật `updatedAt`) → throw exception nếu không hợp lệ.

---

## 5. Domain Exceptions

```text
HabitNotFoundException
HabitRevisionConflictException
InvalidHabitTransitionException   (arg: trạng thái isActive hiện tại)
InvalidHabitTitleException
InvalidHabitFrequencyException
InvalidHabitIdException
```

---

## 6. Application Layer Orchestration

### 6.1. HabitMutationService

Cùng pattern `ProjectMutationService`/`RoutineMutationService`:

```text
1. Load Habit qua findByIdForOwner(habitId, ownerId)
   → not found → HabitNotFoundException
2. Preflight: habit.revision !== expectedRevision
   → HabitRevisionConflictException
3. Chạy input.mutate(habit) — bắt DomainException, trả Result.fail
4. No-op short-circuit: nếu revision không đổi sau bước 3 → Result.ok, KHÔNG ghi DB
5. Persist qua repository.update(habit, expectedRevision) — compare-and-swap
6. update() trả false (race) → vẫn HabitRevisionConflictException
```

Mỗi handler (Update/Archive/Restore) chỉ gọi `mutationService.mutate({...})` với 1 callback khác nhau.

`CreateHabitHandler` gọi trực tiếp `Habit.create()` + `repository.create()`, không qua mutation service (giống `CreateProjectHandler`/`CreateRoutineHandler`).

---

## 7. Repository

```text
HabitRepository (port)
├── create(habit): Promise<void>
├── update(habit, expectedRevision): Promise<boolean>
└── findByIdForOwner(id, ownerId): Promise<Habit | null>
```

Không có `deletePermanently()` — nhất quán `KD-HAB-002` (không có permanent delete trong V1).

---

## 8. Query Model

```text
HabitReader (port, tách biệt write-side Repository)
└── findAllForOwner(ownerId, { skip, take, isActive?, search?, sortBy?, sortOrder? })
    → { habits: Habit[], total: number }
```

`sortBy` giới hạn 3 field: `title`, `createdAt`, `updatedAt`. Search khớp `title` hoặc `description`, case-insensitive.

---

## 9. Domain Invariant Summary

Xem `05-product-specification.md` §3.

---

## 10. Next Step

```text
07. API Contract
08. Database Schema
```
