# Habit V1 — Use Cases & Acceptance Criteria

> **Status:** Baseline (Reverse-Engineered)
>
> **Domain:** Forge / Habit
>
> **Purpose:** Kiểm tra Functional Requirements/Business Rules qua các Use Case cụ thể.

---

## UC-HAB-001 — Create Habit

**Preconditions:** Người dùng đã đăng nhập.

**Main Flow:**

1. Người dùng nhập `title`, tùy chọn `description`, chọn `frequency` (DAILY hoặc WEEKLY kèm ngày).
2. Hệ thống tạo Habit mới với `isActive = true`, `revision = 1`.

**Exception Flow:**

- `title` vượt 200 ký tự → bị chặn ở tầng DTO (`@MaxLength(200)`) trước khi chạm domain — 400 dạng `ValidationPipe` chung (`{ statusCode, message, error: "Bad Request" }`), không phải `INVALID_HABIT_TITLE`.
- `title` rỗng hoặc chỉ chứa khoảng trắng — DTO không chặn được (chuỗi toàn khoảng trắng vẫn qua `@IsString()`), chạm tới domain và bị `Habit.normalizeTitle()` từ chối → 400 `INVALID_HABIT_TITLE` (đi qua `DomainExceptionFilter`, shape khác `ValidationPipe` dù cùng statusCode 400 — xem `07-api-contract.md` §1.6).
- `frequency` không hợp lệ (DAILY kèm ngày, hoặc WEEKLY không có ngày) → 400 `INVALID_HABIT_FREQUENCY`.

**Postconditions:** Habit tồn tại, `ACTIVE`, sẵn sàng xuất hiện trong danh sách và tổng hợp "hôm nay" nếu đến hạn.

**Acceptance Criteria:**

```text
GIVEN người dùng đã đăng nhập
WHEN họ tạo Habit với title hợp lệ và frequency hợp lệ
THEN Habit được tạo với state ACTIVE, revision 1
```

---

## UC-HAB-002 — View Habits

**Main Flow:**

1. Người dùng gọi danh sách Habit, tùy chọn kèm `search`, `sortBy`, `sortOrder`, `status`.
2. Hệ thống trả về Habit thuộc sở hữu người dùng, khớp điều kiện lọc, phân trang.

**Acceptance Criteria:**

```text
GIVEN người dùng có N Habit ACTIVE và M Habit ARCHIVED
WHEN họ gọi danh sách không truyền status
THEN chỉ N Habit ACTIVE được trả về (BR-HAB-015)
```

---

## UC-HAB-003 — View Habit Detail

**Exception Flow:** Habit không tồn tại hoặc thuộc người dùng khác → 404 `HABIT_NOT_FOUND`.

---

## UC-HAB-004 — Update Habit

**Preconditions:** Habit đang `ACTIVE`.

**Main Flow:**

1. Người dùng gửi `title`, `description`, `frequency`, `expectedRevision`.
2. Hệ thống cập nhật nếu có thay đổi thực sự, tăng `revision`.

**Exception Flow:**

- Habit đang `ARCHIVED` → 409 `INVALID_HABIT_TRANSITION`.
- `expectedRevision` không khớp → 409 `HABIT_REVISION_CONFLICT`.

**Acceptance Criteria:**

```text
GIVEN Habit đang ARCHIVED
WHEN người dùng cố Update
THEN request bị từ chối 409, Habit không đổi
```

---

## UC-HAB-005 — Archive Habit

**Preconditions:** Habit đang `ACTIVE`.

**Postconditions:** `isActive = false`, `revision` tăng, Habit không còn "đến hạn" ở bất kỳ ngày nào.

**Exception Flow:** Habit đã `ARCHIVED` → 409 `INVALID_HABIT_TRANSITION`.

---

## UC-HAB-006 — Restore Habit

**Preconditions:** Habit đang `ARCHIVED`.

**Postconditions:** `isActive = true`, `revision` tăng, Habit hoạt động và xuất hiện lại trong danh sách mặc định.

**Exception Flow:** Habit đang `ACTIVE` → 409 `INVALID_HABIT_TRANSITION`.

---

## Next Step

```text
05. Product Specification
```
