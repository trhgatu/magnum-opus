# Habit V1 — BA Overview

> **Status:** Baseline (Reverse-Engineered)
>
> **Domain:** Forge / Habit
>
> **Purpose:** Xác định Context, Problem Statement, User Need, Product Objective, V1 Scope và Out of Scope của Habit — làm baseline tài liệu cho một module **đã tồn tại và đang chạy production**, chưa từng có BA doc trước đây.

---

## 0. Ghi chú về nguồn gốc tài liệu

Tài liệu này được viết theo chiều **ngược** so với quy trình BA chuẩn (Analysis → Domain Model → Implementation). Habit đã được implement, kiểm thử (247 test case), và chạy production từ trước — tài liệu này **suy ngược lại** Problem Statement/Business Rule/API Contract từ code đã có, không phải thiết kế mới.

Những phần suy được trực tiếp từ code (Business Rule, Domain Model, API Contract, Database Schema) có độ tin cậy cao. Những phần thuộc về ý định sản phẩm (Problem Statement, User Need, Out of Scope) được xác nhận lại với người phụ trách sản phẩm tại thời điểm viết tài liệu (2026-09-08).

---

## 1. Context

Habit thuộc bounded context **Forge** — nơi rèn những hành động nhỏ, lặp lại thành nhịp sống có chủ ý (cùng context với Routine, HabitCheckIn, Today).

Habit là đơn vị nhỏ nhất trong Forge: một việc cụ thể mà người dùng muốn lặp lại đều đặn theo một tần suất xác định trước (hằng ngày, hoặc các ngày cụ thể trong tuần).

---

## 2. Problem Statement

Người dùng có những việc muốn xây thành nếp — không phải việc làm một lần rồi xong (khác `Project` ở Crucible, vốn có điểm bắt đầu/kết thúc rõ ràng), cũng không phải ghi chép tự do (khác `JournalEntry` ở Reflection). Họ cần một cách để:

- định danh rõ ràng một việc lặp lại cụ thể;
- xác định việc đó lặp lại theo tần suất nào (mỗi ngày, hay chỉ những ngày cụ thể trong tuần);
- biết hôm nay việc đó có "đến hạn" hay không;
- tạm ngưng theo dõi một việc mà không mất lịch sử, và tiếp tục lại sau đó.

---

## 3. User Needs

```text
UN-HAB-001 — Represent a Repeating Commitment
Người dùng cần định danh một việc cụ thể mà họ muốn lặp lại đều đặn.

UN-HAB-002 — Declare a Frequency
Người dùng cần xác định Habit lặp lại mỗi ngày, hay chỉ vào những ngày cụ
thể trong tuần.

UN-HAB-003 — Know What Is Due Today
Người dùng cần biết, tại một ngày cụ thể, Habit nào đang "đến hạn" theo
tần suất đã khai báo.

UN-HAB-004 — Pause Without Losing Identity
Người dùng cần tạm ngưng theo dõi một Habit (ví dụ không còn phù hợp giai
đoạn hiện tại) mà không phải xóa nó, và có thể khôi phục lại sau.

UN-HAB-005 — Revise a Commitment
Người dùng cần chỉnh sửa tên, mô tả, hoặc tần suất của một Habit đang hoạt
động khi nhu cầu thực tế thay đổi.
```

---

## 4. Product Objective

Cho phép người dùng định danh, cấu hình tần suất, và quản lý vòng đời (đang theo dõi / đã tạm ngưng) của những việc họ muốn lặp lại thành nếp — làm nền tảng dữ liệu cho các module tiêu thụ khác trong Forge (`Today` — tổng hợp việc đến hạn hôm nay; `HabitCheckIn` — xác nhận đã thực hiện; `Routine` — gộp nhiều Habit thành một trình tự).

---

## 5. Desired Outcomes

```text
Người dùng có thể tạo một Habit trong vài giây, không cần điền thông tin
không cần thiết.

Người dùng luôn biết chính xác Habit nào cần làm hôm nay, dựa trên tần
suất đã khai báo.

Người dùng có thể tạm ngưng một Habit không còn phù hợp mà không sợ mất
dữ liệu, và khôi phục lại khi cần.
```

---

## 6. V1 Scope

```text
SC-HAB-001 — Create Habit (title, description tùy chọn, frequency)
SC-HAB-002 — View Habits (list, có search/sort/filter theo trạng thái)
SC-HAB-003 — View Habit Detail
SC-HAB-004 — Update Habit (title, description, frequency)
SC-HAB-005 — Archive Habit
SC-HAB-006 — Restore Habit
```

---

## 7. Out of Scope

```text
- Streak / chuỗi ngày liên tiếp đã thực hiện — thuộc phạm vi HabitCheckIn,
  không phải Habit tự thân.
- Reminder / notification nhắc nhở.
- Gamification (điểm, huy hiệu, xếp hạng).
- Nhiều tần suất phức tạp hơn daily/weekly (vd: "mỗi 2 tuần", "ngày N của
  tháng").
- Habit dùng chung / chia sẻ giữa nhiều người dùng.
- Xóa vĩnh viễn (permanent delete) — V1 chỉ có archive/restore, không có
  khái niệm xóa.
- Lịch sử chỉnh sửa (audit trail của những lần Update).
- Liên kết trực tiếp Habit với Project hoặc JournalEntry.
```

---

## 8. Known Decisions

```text
KD-HAB-001 — Lifecycle Is Binary By Design
Habit chỉ có 2 trạng thái: đang hoạt động (ACTIVE) và đã tạm ngưng
(ARCHIVED) — không có state machine nhiều bước như Project. Đây là quyết
định có chủ đích: Habit không có khái niệm "hoàn thành" hay "Cycle" vì
bản chất là một cam kết lặp lại vô thời hạn, không có điểm kết thúc tự
nhiên. "Tạm ngưng" (archive) là hành động duy nhất có ý nghĩa khi người
dùng không còn muốn theo dõi nó nữa.

KD-HAB-002 — No Permanent Delete
Nhất quán với KD-HAB-001: vì không có điểm kết thúc "hoàn thành", cũng
không có nhu cầu xóa vĩnh viễn trong V1 — archive là đủ.

KD-HAB-003 — Frequency Is a Value Object, Not Configuration Flags
Frequency (DAILY hoặc WEEKLY kèm danh sách ngày) được model như một Value
Object thống nhất, không phải các field rời rạc — đảm bảo tính hợp lệ
(WEEKLY luôn có ít nhất 1 ngày, DAILY không có ngày nào) được enforce tại
một chỗ duy nhất.
```

---

## 9. Open Analysis

```text
- Có cần Habit hỗ trợ tần suất phức tạp hơn (monthly, custom interval)
  trong tương lai không — hiện chưa có user need xác nhận.
- Có cần một trạng thái "tạm dừng có thời hạn" (snooze đến ngày X) khác
  với archive vô thời hạn không.
```

---

## 10. Next Step

```text
02. Lifecycle & Behavior Analysis
```
