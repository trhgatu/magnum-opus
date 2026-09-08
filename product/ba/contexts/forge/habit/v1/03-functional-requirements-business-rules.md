# Habit V1 — Functional Requirements & Business Rules

> **Status:** Baseline (Reverse-Engineered)
>
> **Domain:** Forge / Habit
>
> **Purpose:** Xác định Functional Requirement và Business Rule của Habit, suy ngược từ code đã implement (domain layer, DTO validation, reader).

---

## 1. Related Documentation

`01-ba-overview.md`, `02-lifecycle-behavior-analysis.md`.

---

# 2. Functional Requirements

## 2.1. FR-HAB-001 — Create Habit

Hệ thống phải cho phép người dùng tạo một Habit với `title` (bắt buộc), `description` (tùy chọn), và `frequency` (bắt buộc).

### Traceability

```text
UN-HAB-001, UN-HAB-002
```

## 2.2. FR-HAB-002 — View Habits

Hệ thống phải cho phép người dùng xem danh sách Habit của mình, hỗ trợ tìm kiếm theo title/description, sắp xếp theo title/createdAt/updatedAt, và lọc theo trạng thái (đang hoạt động / đã tạm ngưng).

### Traceability

```text
UN-HAB-001
```

## 2.3. FR-HAB-003 — View Habit Detail

Hệ thống phải cho phép người dùng xem chi tiết một Habit cụ thể của chính họ.

## 2.4. FR-HAB-004 — Update Habit

Hệ thống phải cho phép người dùng cập nhật `title`, `description`, `frequency` của một Habit đang hoạt động.

### Traceability

```text
UN-HAB-005
```

## 2.5. FR-HAB-005 — Archive Habit

Hệ thống phải cho phép người dùng tạm ngưng theo dõi một Habit đang hoạt động.

### Traceability

```text
UN-HAB-004
```

## 2.6. FR-HAB-006 — Restore Habit

Hệ thống phải cho phép người dùng khôi phục một Habit đã tạm ngưng về trạng thái hoạt động.

### Traceability

```text
UN-HAB-004
```

---

# 3. Business Rules

## BR-HAB-001 — Initial State

Habit mới tạo luôn ở trạng thái `ACTIVE`, `revision = 1`.

## BR-HAB-002 — Explicit Lifecycle Transition

Lifecycle state chỉ thay đổi qua `Archive` hoặc `Restore`. Không có hành động nào khác (kể cả Update) được phép thay đổi `isActive`.

## BR-HAB-003 — Archive Eligibility

Chỉ Habit đang `ACTIVE` mới Archive được. Archive một Habit đã `ARCHIVED` là transition không hợp lệ.

## BR-HAB-004 — Restore Eligibility

Chỉ Habit đang `ARCHIVED` mới Restore được. Restore một Habit đang `ACTIVE` là transition không hợp lệ.

## BR-HAB-005 — Update Requires Active State

Chỉ Habit đang `ACTIVE` mới được Update. Muốn sửa một Habit đã archive, người dùng phải Restore trước.

## BR-HAB-006 — Update Is a No-Op When Nothing Changes

Nếu `title`, `description`, và `frequency` gửi lên giống hệt giá trị hiện tại, Update không tăng `revision`, không ghi nhận thay đổi nào.

## BR-HAB-007 — Title Constraints

`title` bắt buộc, sau khi trim không được rỗng, tối đa 200 ký tự (tính theo code point, không phải UTF-16 code unit).

## BR-HAB-008 — Description Is Optional

`description` tùy chọn; chuỗi rỗng hoặc chỉ có khoảng trắng được chuẩn hóa thành `null`.

## BR-HAB-009 — Frequency DAILY Carries No Days

Frequency `DAILY` không được kèm theo bất kỳ ngày nào — nếu có, đây là dữ liệu không hợp lệ.

## BR-HAB-010 — Frequency WEEKLY Requires At Least One Day

Frequency `WEEKLY` phải có ít nhất 1 ngày trong tuần được khai báo — không được để trống.

## BR-HAB-011 — Weekday Values Are Canonicalized

Ngày trong `WEEKLY` biểu diễn theo ISO weekday (1–7). Giá trị trùng lặp bị loại bỏ; danh sách được sắp xếp tăng dần trước khi lưu — hai lần khai báo cùng tập ngày (dù thứ tự nhập khác nhau) luôn cho ra cùng 1 giá trị canonical.

## BR-HAB-012 — Archived Habit Is Never Due

Bất kể frequency khai báo gì, một Habit đang `ARCHIVED` không bao giờ được xem là "đến hạn" vào bất kỳ ngày nào.

## BR-HAB-013 — Revision-Based Optimistic Concurrency

Mọi mutating request (Update, Archive, Restore) phải kèm `expectedRevision`. Nếu không khớp `revision` hiện tại, request bị từ chối (conflict) — cơ chế preflight check + compare-and-swap ở tầng persistence, nhất quán với Project.

## BR-HAB-014 — Habit Is Owner-Scoped

Mọi thao tác đọc/ghi Habit đều bị giới hạn theo `ownerId` của người thực hiện request — không có API nào truy cập Habit của người dùng khác.

## BR-HAB-015 — Default List View Shows Active Habits

Khi không chỉ định trạng thái lọc, danh sách Habit mặc định chỉ hiển thị Habit đang `ACTIVE`.

## BR-HAB-016 — Search Matches Title or Description

Tìm kiếm trong danh sách Habit khớp theo `title` hoặc `description`, không phân biệt hoa/thường (case-insensitive).

---

# 4. Valid Transition Summary

| Current State | Archive | Restore |
| ------------- | ------- | ------- |
| `ACTIVE`      | ✓       | —       |
| `ARCHIVED`    | —       | ✓       |

---

# 5. Out of Scope

Xem `01-ba-overview.md` §7.

---

# 6. Next Step

```text
04. Use Cases & Acceptance Criteria
```
