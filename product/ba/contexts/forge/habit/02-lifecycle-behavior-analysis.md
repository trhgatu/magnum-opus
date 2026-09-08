# Habit V1 — Lifecycle & Behavior Analysis

> **Status:** Baseline (Reverse-Engineered)
>
> **Domain:** Forge / Habit
>
> **Purpose:** Xác định Habit lifecycle, ý nghĩa từng state, các transition hợp lệ, và ý nghĩa của Frequency — suy ngược từ `Habit` aggregate đã implement.

---

## 1. Related Documentation

`01-ba-overview.md` xác định Context, Problem Statement, User Need, V1 Scope.

---

## 2. Habit Lifecycle

```text
ACTIVE
   │
   ├── Archive ──→ ARCHIVED
   │
ARCHIVED
   │
   └── Restore ──→ ACTIVE
```

Chỉ 2 state, khác hẳn state machine 5-state của `Project` (Crucible). Không có state trung gian, không có khái niệm "Cycle".

---

## 3. Ý nghĩa từng state

### ACTIVE

Habit đang được theo dõi. Có thể:

- xuất hiện trong tổng hợp "hôm nay cần làm gì" (`Today`) nếu đến hạn theo frequency;
- nhận check-in (`HabitCheckIn`);
- được Update (title/description/frequency);
- được Archive.

### ARCHIVED

Habit tạm ngưng theo dõi. Không:

- xuất hiện trong tổng hợp "hôm nay" (dù frequency nói đến hạn — `isDueOn()` luôn trả `false` khi archived, xem §5);
- được Update (chỉ Habit đang ACTIVE mới sửa được — phải Restore trước);
- bị xóa hay mất dữ liệu — mọi thông tin (title, description, frequency, lịch sử check-in liên kết) được giữ nguyên, chỉ ẩn khỏi luồng hoạt động hằng ngày.

---

## 4. Valid Transitions

| Từ         | Hành động | Đến        |
| ---------- | --------- | ---------- |
| `ACTIVE`   | Archive   | `ARCHIVED` |
| `ARCHIVED` | Restore   | `ACTIVE`   |

Archive khi đang `ARCHIVED`, hoặc Restore khi đang `ACTIVE`, đều là transition không hợp lệ (`InvalidHabitTransitionException`).

---

## 5. Frequency — Value Object độc lập với Lifecycle

Frequency xác định Habit "đến hạn" vào ngày nào, tách biệt hoàn toàn khỏi lifecycle state:

```text
DAILY
→ đến hạn mọi ngày, không cần khai báo ngày cụ thể

WEEKLY([ngày...])
→ đến hạn vào đúng những ngày trong tuần đã khai báo
→ ngày biểu diễn theo ISO weekday (1 = Thứ Hai … 7 = Chủ Nhật)
→ phải khai báo ít nhất 1 ngày, không giới hạn tối đa 7
→ trùng lặp bị loại bỏ, thứ tự được chuẩn hóa tăng dần (canonical form)
```

`isDueOn(isoWeekday)` — hàm quyết định "hôm nay có đến hạn không":

```text
isDueOn(day) = isActive AND frequency.isDueOn(day)

frequency.isDueOn(day):
  DAILY  → luôn true
  WEEKLY → true nếu day nằm trong danh sách đã khai báo
```

Điểm quan trọng: **Habit đã archive không bao giờ "đến hạn"**, bất kể frequency nói gì — lifecycle state luôn được ưu tiên kiểm tra trước frequency.

---

## 6. Behavior không thuộc Lifecycle

Update (title/description/frequency) là hành động **không đổi lifecycle state** — chỉ hợp lệ khi Habit đang `ACTIVE`. Nếu không có gì thay đổi thực sự (title/description/frequency giống hệt giá trị hiện tại), Update là no-op — không tăng `revision`, không ghi `updatedAt` mới.

---

## 7. Next Step

```text
03. Functional Requirements & Business Rules
```
