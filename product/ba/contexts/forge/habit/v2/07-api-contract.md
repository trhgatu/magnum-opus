# Habit V2 — API Contract (Quit-Type Habit)

> **Status:** Candidate / Draft
>
> **Domain:** Forge / Habit
>
> **Purpose:** Xác định API contract cho phần mở rộng QUIT-type — thay đổi trên endpoint Habit đã có, cộng endpoint relapse mới.

---

## 1. Related Documentation

`06-domain-analysis.md` (V2). `../v1/07-api-contract.md` (V1) — endpoint BUILD-type không đổi.

---

## 2. HabitResponse (mở rộng)

```typescript
interface HabitResponse {
  id: string;
  title: string;
  description: string | null;
  type: 'BUILD' | 'QUIT'; // mới
  frequencyType: 'DAILY' | 'WEEKLY' | null; // null khi type = QUIT
  frequencyDays: number[]; // rỗng khi type = QUIT
  quitStartedAt: string | null; // ISO 8601 date, chỉ khi type = QUIT
  isActive: boolean;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Endpoint thay đổi (V1 mở rộng)

### 3.1. Create Habit — `POST /habits`

```typescript
interface CreateHabitDto {
  title: string;
  description?: string | null;
  type: 'BUILD' | 'QUIT'; // mới, bắt buộc

  // Bắt buộc khi type = BUILD, bị từ chối nếu gửi kèm type = QUIT
  frequencyType?: 'DAILY' | 'WEEKLY';
  frequencyDays?: number[];

  // Tùy chọn khi type = QUIT — mặc định là ngày tạo nếu không truyền
  // (BR-HAB2-002); bị từ chối nếu gửi kèm type = BUILD
  quitStartedAt?: string; // ISO 8601 date
}
```

| Status | Reason                                                                                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 400    | title không hợp lệ                                                                                                                                                                         |
| 400    | type = BUILD nhưng thiếu/sai frequency, hoặc kèm quitStartedAt (`INVALID_HABIT_TYPE`, domain: `InvalidHabitTypeException` — xem `06-domain-analysis.md` §4 "Aggregate Method Constraints") |
| 400    | type = QUIT nhưng kèm frequency (`INVALID_HABIT_TYPE`, cùng exception)                                                                                                                     |
| 400    | quitStartedAt là ngày trong tương lai (`INVALID_QUIT_STARTED_AT`, domain: `InvalidQuitStartedAtException` — `BR-HAB2-005`)                                                                 |
| 401    | Unauthorized                                                                                                                                                                               |

### 3.2. List Habits — `GET /habits`

```typescript
interface GetHabitsQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  type?: 'BUILD' | 'QUIT'; // mới, mặc định: cả 2 loại
  sortBy?: 'title' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}
```

### 3.3. Update Habit — `PUT /habits/:id`

```typescript
interface UpdateHabitDto {
  title: string;
  description: string | null;
  expectedRevision: number;

  // Chỉ áp dụng đúng theo type hiện tại của Habit (không đổi type qua endpoint này)
  frequencyType?: 'DAILY' | 'WEEKLY'; // bắt buộc nếu Habit là BUILD
  frequencyDays?: number[]; // bắt buộc nếu Habit là BUILD
  quitStartedAt?: string; // bắt buộc nếu Habit là QUIT
}
```

| Status | Reason                                                                                                                                                                       |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | field gửi lên không khớp type hiện tại của Habit (`INVALID_HABIT_TYPE`, domain: `InvalidHabitTypeException` — xem `06-domain-analysis.md` §4 "Aggregate Method Constraints") |
| 400    | Habit là QUIT và `quitStartedAt` gửi lên là ngày trong tương lai (`INVALID_QUIT_STARTED_AT`, domain: `InvalidQuitStartedAtException` — `BR-HAB2-005`)                        |
| 409    | Habit ARCHIVED, hoặc revision conflict                                                                                                                                       |

---

## 4. Endpoint mới

### 4.1. Log a Relapse — `POST /habits/:habitId/relapses`

```typescript
// không cần request body
```

```
201 Created
```

```typescript
interface HabitRelapseResponse {
  id: string;
  habitId: string;
  occurredAt: string; // ISO 8601 datetime
}
```

| Status | Reason                                                                     |
| ------ | -------------------------------------------------------------------------- |
| 401    | Unauthorized                                                               |
| 404    | Habit không tồn tại                                                        |
| 409    | Habit đang ARCHIVED, hoặc không phải loại QUIT (`HABIT_RELAPSE_FORBIDDEN`) |

**Behavior:** luôn tạo mới 1 bản ghi (`201`), không idempotent — gọi nhiều lần trong ngày tạo nhiều bản ghi riêng biệt (`BR-HAB2-003`).

### 4.2. Get Progress — `GET /habits/:habitId/progress`

```
200 OK
```

```typescript
interface HabitProgressResponse {
  habitId: string;
  since: string; // ISO 8601 date — mốc bắt đầu đếm
  sinceReason: 'RELAPSE' | 'QUIT_STARTED_AT';
  daysSince: number;
}
```

| Status | Reason                                                                     |
| ------ | -------------------------------------------------------------------------- |
| 401    | Unauthorized                                                               |
| 404    | Habit không tồn tại                                                        |
| 409    | Habit tồn tại nhưng không phải loại QUIT (`HABIT_PROGRESS_NOT_APPLICABLE`) |

---

## 5. Error Format

Nhất quán `DomainExceptionFilter` đã dùng toàn hệ thống (xem `../v1/07-api-contract.md` §1.6):

```json
{
  "statusCode": 409,
  "code": "HABIT_RELAPSE_FORBIDDEN",
  "translationKey": "exceptions.habit.relapse.forbidden",
  "message": "Cannot log a relapse for Habit \"...\": not ACTIVE or not QUIT-type",
  "args": { "habitId": "..." },
  "error": "HabitRelapseForbiddenException",
  "timestamp": "2026-09-08T00:00:00.000Z"
}
```

---

## 6. Endpoint Summary (mới/thay đổi)

| Method | Path                        | Action                                |
| ------ | --------------------------- | ------------------------------------- |
| `POST` | `/habits`                   | Create (mở rộng: type)                |
| `GET`  | `/habits`                   | List (mở rộng: filter type)           |
| `PUT`  | `/habits/:id`               | Update (mở rộng: field theo type)     |
| `POST` | `/habits/:habitId/relapses` | Log a relapse (mới)                   |
| `GET`  | `/habits/:habitId/progress` | Get progress since last relapse (mới) |

---

## 7. Out of Scope for V2 API

```text
- Danh sách lịch sử relapse (chỉ có "gần nhất" qua /progress)
- Đổi type qua API
- Endpoint riêng cho Today/Routine hiển thị QUIT-type (không áp dụng,
  xem KD-HAB2-005/006)
```

---

## 8. Next Step

```text
08. Database Schema (Habit V2)
```
