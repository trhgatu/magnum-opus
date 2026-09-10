# Habit V2 — Use Cases & Acceptance Criteria (Quit-Type Habit)

> **Status:** Implemented (Backend PR #96, Frontend PR #97)
>
> **Domain:** Forge / Habit

---

## UC-HAB2-001 — Create a Quit-Type Habit

**Main Flow:**

1. Người dùng chọn loại "Từ bỏ điều xấu" khi tạo Habit.
2. Nhập `title`, tùy chọn `description`, chỉnh `quitStartedAt` nếu muốn (mặc định hôm nay).
3. Hệ thống tạo Habit với `type = QUIT`, `isActive = true`, không có `frequency`.

**Exception Flow:** `quitStartedAt` là ngày trong tương lai → từ chối (`BR-HAB2-005`).

**Acceptance Criteria:**

```text
GIVEN người dùng chọn loại QUIT
WHEN họ tạo Habit không khai báo frequency
THEN Habit được tạo thành công, không yêu cầu frequency
```

---

## UC-HAB2-002 — Log a Relapse

**Preconditions:** Habit QUIT đang `ACTIVE`.

**Main Flow:**

1. Người dùng vào trang chi tiết Habit, bấm "Tôi đã tái phạm".
2. Hệ thống ghi 1 bản ghi relapse mới với thời điểm hiện tại.
3. "Ngày không tái phạm" hiển thị lại từ 0.

**Exception Flow:** Habit đang `ARCHIVED` → không cho phép ghi nhận (`BR-HAB2-006`).

**Acceptance Criteria:**

```text
GIVEN Habit QUIT đang ACTIVE, đã 12 ngày không tái phạm
WHEN người dùng bấm "Tôi đã tái phạm"
THEN "ngày không tái phạm" hiển thị lại 0, tính từ thời điểm vừa bấm
```

```text
GIVEN người dùng đã bấm "Tôi đã tái phạm" 1 lần trong ngày
WHEN họ bấm thêm 1 lần nữa trong CÙNG ngày đó
THEN hệ thống ghi thêm 1 bản ghi relapse mới (không từ chối, không gộp)
AND "ngày không tái phạm" vẫn hiển thị là 0 — vì bản ghi gần nhất theo
    BR-HAB2-004 (occurredAt lớn nhất, >= quitStartedAt) vẫn là 1 relapse
    xảy ra trong hôm nay, dù là bản ghi thứ mấy; công thức
    "hôm nay − relapse gần nhất" cho cùng kết quả 0 bất kể có 1 hay
    nhiều bản ghi trong ngày đó
```

---

## UC-HAB2-003 — View Progress Since Last Relapse

**Main Flow:** Người dùng mở trang chi tiết Habit QUIT bất kỳ lúc nào.

**Acceptance Criteria:**

```text
GIVEN Habit QUIT có quitStartedAt = 15/08, chưa từng relapse
WHEN người dùng xem chi tiết vào ngày 27/08
THEN hệ thống hiển thị "12 ngày không tái phạm"
```

```text
GIVEN Habit QUIT có quitStartedAt = 15/08, relapse gần nhất vào 20/08
WHEN người dùng xem chi tiết vào ngày 27/08
THEN hệ thống hiển thị "7 ngày không tái phạm" (tính từ 20/08, không phải
     từ 15/08)
```

**Edge case — quitStartedAt bị sửa lùi về sau một relapse đã ghi trước đó:**

```text
GIVEN Habit QUIT có 1 relapse đã ghi vào 15/08
WHEN người dùng sau đó sửa quitStartedAt thành 01/09
AND xem chi tiết vào ngày 05/09
THEN hệ thống hiển thị "4 ngày không tái phạm" (tính từ 01/09) — KHÔNG
     tính relapse ngày 15/08 vào công thức, KHÔNG ra số âm
     (BR-HAB2-004)
```

---

## UC-HAB2-004 — Filter Habit List by Type

**Main Flow:** Người dùng vào danh sách Habit, chọn bộ lọc "Đang từ bỏ" hoặc "Đang xây dựng".

**Acceptance Criteria:**

```text
GIVEN người dùng có 6 Habit BUILD và 2 Habit QUIT
WHEN họ lọc theo "Đang từ bỏ"
THEN chỉ 2 Habit QUIT được hiển thị
```

---

## UC-HAB2-005 — Attempt to Add a Quit-Type Habit to a Routine

**Exception Flow:** Người dùng cố thêm 1 Habit QUIT vào Routine → bị từ chối (`BR-HAB2-010`).

**Acceptance Criteria:**

```text
GIVEN Habit "Bỏ hút thuốc" thuộc loại QUIT
WHEN người dùng cố thêm nó vào 1 Routine
THEN request bị từ chối, Routine không đổi
```

---

## Next Step

```text
05. Product Specification (Habit V2)
```
