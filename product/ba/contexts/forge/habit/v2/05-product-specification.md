# Habit V2 — Product Specification (Quit-Type Habit)

> **Status:** Candidate / Draft
>
> **Domain:** Forge / Habit
>
> **Purpose:** Baseline hành vi tổng hợp của Habit V2 — authoritative reference cho Domain Analysis, API Contract, Database Schema ở các tài liệu sau.

---

## 1. Summary

```text
Habit (mở rộng V2)
├── type: BUILD | QUIT           (mới — bất biến sau khi tạo, BR-HAB2-008)
│
├── BUILD (= toàn bộ Habit V1, không đổi)
│   ├── frequency: DAILY | WEEKLY(days)
│   ├── check-in: idempotent theo ngày, xác nhận tích cực
│   ├── tham gia Today + Routine
│   └── lifecycle: ACTIVE ⇄ ARCHIVED
│
└── QUIT (mới)
    ├── quitStartedAt: ngày bắt đầu từ bỏ
    ├── (không có frequency)
    ├── relapse: append-only, ghi nhận tiêu cực, không idempotent
    ├── không tham gia Today, không tham gia Routine
    └── lifecycle: ACTIVE ⇄ ARCHIVED (dùng chung cơ chế BUILD)
```

---

## 2. Capability Baseline (phần mới của V2)

```text
Create QUIT   → title + description? + quitStartedAt? (mặc định ngày tạo
                nếu bỏ trống, BR-HAB2-002)                → ACTIVE
Log Relapse   → ghi 1 bản ghi mới, không giới hạn số lần/ngày → chỉ khi ACTIVE
View Progress → hôm nay − (relapse gần nhất có occurredAt >= quitStartedAt
                hiện tại, hoặc quitStartedAt nếu không có relapse nào
                thỏa — BR-HAB2-004)
Update QUIT   → title, description, quitStartedAt (không đổi type) → chỉ khi ACTIVE
Filter        → theo type (BUILD/QUIT), cùng danh sách /habits
```

---

## 3. Invariant Summary (phần mới của V2)

| Invariant                                                                                                                   | Enforced By                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QUIT-type không có frequency                                                                                                | Validation khi tạo/sửa Habit loại QUIT                                                                                                                                                                         |
| QUIT-type luôn có quitStartedAt sau khi tạo (không phải field chặn tạo — nếu bỏ trống thì mặc định ngày tạo, `BR-HAB2-002`) | `Habit.create()` áp default trước khi validate, không reject request thiếu field này                                                                                                                           |
| Relapse chỉ ghi khi Habit ACTIVE và type QUIT                                                                               | Tương tự `HABIT_CHECK_IN_FORBIDDEN` (`BR-HAB2-006`)                                                                                                                                                            |
| Relapse là append-only, không idempotent                                                                                    | Không có unique constraint theo ngày                                                                                                                                                                           |
| Progress tính từ relapse gần nhất có occurredAt >= quitStartedAt                                                            | Query `MAX(occurredAt) WHERE occurredAt >= quitStartedAt`, fallback `quitStartedAt` (`BR-HAB2-004`)                                                                                                            |
| QUIT-type không vào được Routine                                                                                            | Application handler (`AddRoutineHabitHandler`) kiểm tra `type` qua reader trước khi gọi `routine.addHabit()` — nhất quán cách guard `isActive` hiện tại đã làm, không phải check bên trong aggregate `Routine` |
| QUIT-type không xuất hiện trong Today                                                                                       | Hệ quả tự nhiên từ thiếu frequency, không cần enforce riêng                                                                                                                                                    |
| Type bất biến sau khi tạo                                                                                                   | Không có API đổi type                                                                                                                                                                                          |
| Habit cũ mặc định BUILD khi migrate                                                                                         | Migration script                                                                                                                                                                                               |

---

## 4. Out of Scope

Xem `01-ba-overview.md` §8.

---

## 5. Next Step (BA Boundary)

```text
06. Domain Analysis
07. API Contract
08. Database Schema
```
