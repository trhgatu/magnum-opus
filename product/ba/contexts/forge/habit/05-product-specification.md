# Habit V1 — Product Specification

> **Status:** Baseline (Reverse-Engineered)
>
> **Domain:** Forge / Habit
>
> **Purpose:** Baseline hành vi tổng hợp của Habit V1 — authoritative reference cho Domain Analysis, API Contract, Database Schema ở các tài liệu sau.

---

## 1. Summary

```text
Habit
├── Identity: title, description (tùy chọn)
├── Frequency: DAILY | WEEKLY(days: ISO weekday[])
├── Lifecycle: ACTIVE ⇄ ARCHIVED (2 state, binary)
├── Concurrency: revision-based optimistic locking
└── Ownership: luôn scoped theo ownerId
```

Không có khái niệm Cycle, không có domain event, không có "hoàn thành" — khác hẳn `Project` (Crucible). Habit là cam kết lặp lại vô thời hạn; điểm dừng duy nhất có ý nghĩa là "tạm ngưng theo dõi" (Archive), luôn khôi phục được (Restore).

---

## 2. Capability Baseline

```text
Create  → title + description? + frequency         → ACTIVE, revision 1
Update  → title + description? + frequency          → chỉ khi ACTIVE, no-op nếu không đổi
Archive → ACTIVE → ARCHIVED
Restore → ARCHIVED → ACTIVE
View    → list (search/sort/filter) + detail, luôn owner-scoped
```

---

## 3. Invariant Summary

| Invariant                                        | Enforced By                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Chỉ ACTIVE mới Update/Archive được               | `Habit.ensureActive()` / `archive()` guard                                               |
| Chỉ ARCHIVED mới Restore được                    | `Habit.restore()` guard                                                                  |
| Frequency DAILY không có ngày, WEEKLY có ≥1 ngày | `HabitFrequency.create()`/`normalizeWeekdays()`                                          |
| Ngày trong tuần canonical (dedup + sort)         | `HabitFrequency.normalizeWeekdays()`                                                     |
| Archived Habit không bao giờ due                 | `Habit.isDueOn()` kiểm tra `isActive` trước                                              |
| Revision conflict detection                      | `HabitMutationService` (preflight) + `PrismaHabitRepository.update()` (compare-and-swap) |
| Title 1–200 ký tự sau trim                       | `Habit.normalizeTitle()`                                                                 |
| Owner-scoped mọi truy vấn                        | `findByIdForOwner()`/`findAllForOwner()` luôn nhận `ownerId`                             |

---

## 4. Out of Scope

Xem `01-ba-overview.md` §7.

---

## 5. Next Step (BA Boundary)

```text
06. Domain Analysis
07. API Contract
08. Database Schema
```
