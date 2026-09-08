# Habit V1 — API Contract

> **Status:** Baseline (Reverse-Engineered)
>
> **Domain:** Forge / Habit
>
> **Purpose:** Ghi lại API contract thật của Habit — endpoint, request/response shape, error semantics — đọc trực tiếp từ `HabitController`, DTO, và `HabitPresenter`.

---

## 1. API Conventions

### 1.1. Base Path

```text
/habits
```

### 1.2. Authentication

Tất cả endpoint yêu cầu JWT qua `JwtAuthGuard`. Owner identity lấy từ token, không nhận qua request body.

### 1.3. HTTP Methods

```text
POST    → Create
GET     → Read
PUT     → Update toàn bộ thông tin
PATCH   → Lifecycle action (archive/restore)
```

### 1.4. Response Shape

Direct object, không wrapper.

### 1.5. Revision Pattern

Update/Archive/Restore đều yêu cầu `expectedRevision` trong body.

### 1.6. Error Format

**Validation lỗi ở tầng DTO** (`class-validator`, ví dụ thiếu `title`) — shape mặc định `ValidationPipe`:

```json
{ "statusCode": 400, "message": "string | string[]", "error": "Bad Request" }
```

**Lỗi từ domain layer** (mọi `DomainException`) — đi qua `DomainExceptionFilter` dùng chung của codebase:

```json
{
  "statusCode": 409,
  "code": "INVALID_HABIT_TRANSITION",
  "translationKey": "exceptions.habit.transition.invalid",
  "message": "...",
  "args": {},
  "error": "InvalidHabitTransitionException",
  "timestamp": "2026-09-08T00:00:00.000Z"
}
```

---

## 2. HabitResponse

```typescript
interface HabitResponse {
  id: string;
  title: string;
  description: string | null;
  frequencyType: 'DAILY' | 'WEEKLY';
  frequencyDays: number[];
  isActive: boolean;
  revision: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

---

## 3. Endpoints

### 3.1. Create Habit

```
POST /habits
```

```typescript
interface CreateHabitDto {
  title: string; // required, ≤200 ký tự
  description?: string | null;
  frequencyType: 'DAILY' | 'WEEKLY';
  frequencyDays?: number[]; // 1-7, unique, bắt buộc nếu WEEKLY
}
```

`201 Created` → `HabitResponse`.

| Status | Reason                       |
| ------ | ---------------------------- |
| 400    | title/frequency không hợp lệ |
| 401    | Unauthorized                 |

---

### 3.2. List Habits

```
GET /habits
```

```typescript
interface GetHabitsQueryDto {
  page?: number; // default 1
  limit?: number; // default 10, tối đa 100
  search?: string;
  status?: 'ACTIVE' | 'ARCHIVED'; // default 'ACTIVE'
  sortBy?: 'title' | 'createdAt' | 'updatedAt'; // default 'updatedAt'
  sortOrder?: 'asc' | 'desc'; // default 'desc'
}
```

`200 OK` → `PaginatedResponse<HabitResponse>`.

---

### 3.3. Get Habit Detail

```
GET /habits/:id
```

`200 OK` → `HabitResponse`. `404 HABIT_NOT_FOUND` nếu không tồn tại hoặc không thuộc owner.

---

### 3.4. Update Habit

```
PUT /habits/:id
```

```typescript
interface UpdateHabitDto {
  title: string;
  description: string | null; // required key, giá trị có thể null
  frequencyType: 'DAILY' | 'WEEKLY';
  frequencyDays: number[]; // required (kể cả rỗng khi DAILY)
  expectedRevision: number;
}
```

`200 OK` → `HabitResponse`.

| Status | Reason                                                                  |
| ------ | ----------------------------------------------------------------------- |
| 400    | title/frequency không hợp lệ                                            |
| 401    | Unauthorized                                                            |
| 404    | Habit không tồn tại                                                     |
| 409    | Habit đang ARCHIVED (`INVALID_HABIT_TRANSITION`) hoặc revision conflict |

---

### 3.5. Archive Habit

```
PATCH /habits/:id/archive
```

```typescript
interface HabitRevisionDto {
  expectedRevision: number;
}
```

`200 OK` → `HabitResponse`. `409` nếu đã `ARCHIVED` hoặc revision conflict.

---

### 3.6. Restore Habit

```
PATCH /habits/:id/restore
```

`200 OK` → `HabitResponse`. `409` nếu đang `ACTIVE` hoặc revision conflict.

---

## 4. Endpoint Summary

| Method  | Path                  | Action  |
| ------- | --------------------- | ------- |
| `POST`  | `/habits`             | Create  |
| `GET`   | `/habits`             | List    |
| `GET`   | `/habits/:id`         | Detail  |
| `PUT`   | `/habits/:id`         | Update  |
| `PATCH` | `/habits/:id/archive` | Archive |
| `PATCH` | `/habits/:id/restore` | Restore |

---

## 5. Out of Scope for V1 API

```text
- Permanent delete endpoint
- Streak/check-in history endpoint (thuộc HabitCheckIn)
- Bulk lifecycle action
```

---

## 6. Next Step

```text
08. Database Schema
```
