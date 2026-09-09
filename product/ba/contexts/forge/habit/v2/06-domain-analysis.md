# Habit V2 — Domain Analysis (Quit-Type Habit)

> **Status:** Candidate / Draft
>
> **Domain:** Forge / Habit
>
> **Purpose:** Xác định domain model cho phần mở rộng QUIT-type — mở rộng `Habit` aggregate, thêm 1 entity mới cho relapse.

---

## 1. Related Documentation

`05-product-specification.md` (V2) — authoritative baseline.
`../v1/06-domain-analysis.md` (V1) — domain model BUILD-type, không đổi.

---

## 2. Domain Analysis Principles (bổ sung cho V2)

### DAP-HAB2-001 — Habit Stays One Aggregate, Polarity Changes Its Shape

`Habit` vẫn là 1 aggregate duy nhất (không tách thành 2 aggregate riêng cho BUILD/QUIT) — `type` là 1 field xác định tập field còn lại nào có ý nghĩa (`frequency` chỉ có với BUILD, `quitStartedAt` chỉ có với QUIT). Lý do: cả 2 loại vẫn chia sẻ cùng 1 danh sách, cùng cơ chế archive/restore, cùng danh tính "Habit" ở tầng sản phẩm — tách aggregate sẽ nhân đôi hạ tầng (repository, controller, DTO) một cách không cần thiết.

### DAP-HAB2-002 — Relapse Is a Separate Entity, Mirroring HabitCheckIn

Tương tự `HabitCheckIn` (đã tách khỏi `Habit` aggregate), relapse của QUIT-type là 1 entity/aggregate riêng — tạm gọi `HabitRelapse` — không phải 1 field/mảng bên trong `Habit`. Lý do giống hệt lý do V1 đã tách `HabitCheckIn`: mỗi lần relapse là 1 sự kiện có identity, có thời điểm riêng, và số lượng không giới hạn theo thời gian — không phù hợp nhồi vào 1 aggregate có vòng đời riêng như `Habit`.

### DAP-HAB2-003 — No Domain Event (nhất quán V1)

`HabitRelapse` không raise domain event — nhất quán `DAP-HAB-003` (Habit không có consumer bên ngoài).

---

## 3. Domain Concepts (mới)

### 3.1. Habit.type (Value/Enum mới trên aggregate đã có)

```text
HabitType = BUILD | QUIT
```

Xác lập lúc `create()`, bất biến sau đó (`BR-HAB2-008`).

### 3.2. HabitRelapse (Entity/Aggregate mới)

```text
HabitRelapse
├── HabitRelapseId    (Value Object, tương tự HabitCheckInId)
├── habitId
├── ownerId
├── occurredAt        (thời điểm relapse xảy ra)
└── createdAt
```

**Responsibilities:** ghi nhận 1 sự kiện tái phạm; không enforce gì thêm ngoài việc Habit liên quan phải `ACTIVE` và thuộc loại QUIT (kiểm tra ở application layer, tương tự cách `HabitCheckIn` kiểm tra Habit active qua `HabitCheckInContextService`).

**Không chịu trách nhiệm:** tính toán "ngày không tái phạm" (thuộc query/reader, không phải domain logic của entity này — tương tự `HabitCheckIn` không tự tính streak).

---

## 4. Aggregate Design (Habit, cập nhật)

```text
Habit (Aggregate Root, cập nhật)
├── HabitId
├── ownerId
├── title
├── description
├── type              (mới: BUILD | QUIT)
├── HabitFrequency?   (chỉ có ý nghĩa khi type = BUILD)
├── quitStartedAt?    (chỉ có ý nghĩa khi type = QUIT)
├── isActive
├── revision
├── createdAt / updatedAt
```

### Aggregate Method Constraints

`InvalidHabitTypeException` không tự nói rõ nó được ném ở đâu, khi nào — enforcement thật nằm ở 2 method sau:

```text
Habit.create(input):
  type = BUILD → input.frequency bắt buộc có, input.quitStartedAt
                 bắt buộc KHÔNG có
                 Vi phạm → InvalidHabitTypeException
  type = QUIT  → input.frequency bắt buộc KHÔNG có
                 Vi phạm → InvalidHabitTypeException
                 input.quitStartedAt: nếu không truyền, mặc định ngày
                 tạo (BR-HAB2-002) — không phải lỗi
                 input.quitStartedAt là ngày tương lai (BR-HAB2-005)
                 → InvalidQuitStartedAtException (KHÔNG dùng
                 InvalidHabitTypeException — hai lỗi khác bản chất:
                 field sai chỗ vs. giá trị field không hợp lệ)

Habit.update(input):
  type không nằm trong input — không có cách nào đổi type qua Update
  (BR-HAB2-008), nên không cần validate type ở đây
  Chỉ field thuộc type hiện tại của Habit mới được chấp nhận:
    Habit đang BUILD → input phải có frequency, KHÔNG được có
                        quitStartedAt
                        Vi phạm → InvalidHabitTypeException
    Habit đang QUIT  → input phải có quitStartedAt, KHÔNG được có
                        frequency
                        Vi phạm → InvalidHabitTypeException
                        input.quitStartedAt là ngày tương lai
                        (BR-HAB2-005) → InvalidQuitStartedAtException
                        (cùng lý do tách biệt như ở create, áp dụng vì
                        KD-HAB2-009 cho phép sửa quitStartedAt lúc ACTIVE)
```

### Domain Exceptions mới

```text
InvalidHabitTypeException          (type không hợp lệ, hoặc field không
                                    khớp type — vd BUILD mà có
                                    quitStartedAt)
InvalidQuitStartedAtException      (quitStartedAt là ngày trong tương lai
                                    — BR-HAB2-005)
HabitRelapseForbiddenException     (relapse cho Habit không ACTIVE, hoặc
                                    không phải loại QUIT)
InvalidHabitRelapseIdException
HabitProgressNotApplicableException (xem progress cho Habit tồn tại
                                    nhưng không phải loại QUIT —
                                    `HABIT_PROGRESS_NOT_APPLICABLE`,
                                    409 — khác với 404 "Habit không
                                    tồn tại", xem 07-api-contract.md §4.2)
```

---

## 5. Repository (mới)

```text
HabitRelapseRepository (port)
└── create(relapse): Promise<void>
```

Chỉ có `create()` — không có `update()`/`delete()` (append-only, nhất quán `KD-HAB2-007`), và **không có method đọc nào** — nhất quán convention Repository/Reader đã tách biệt ở Crucible/Project (Repository chỉ phục vụ write-side; `findByIdForOwner`-kiểu chỉ tồn tại khi cần load-để-mutate, mà `HabitRelapse` không có mutation nào để load lại). Truy vấn "relapse gần nhất" thuộc về `HabitProgressReader` (§6), không lặp lại ở đây.

---

## 6. Query Model (mới)

```text
HabitProgressReader (port mới, hoặc mở rộng HabitReader hiện có)
└── getProgressFor(habitId, ownerId)
    → { sinceDate: Date, sinceReason: 'RELAPSE' | 'QUIT_STARTED_AT' }
```

`sinceDate` = `occurredAt` của relapse gần nhất **có `occurredAt >= quitStartedAt` hiện tại**, ngược lại (không có relapse nào thỏa, kể cả khi có relapse cũ hơn `quitStartedAt`) = `quitStartedAt` của Habit. Relapse cũ hơn `quitStartedAt` hiện tại bị bỏ qua — tránh trường hợp sửa `quitStartedAt` lùi về sau khiến "since" tính ra âm (`BR-HAB2-004`).

`HabitReader.findAllForOwner()` (V1) mở rộng thêm filter `type?: HabitType`.

---

## 6b. Tác động chéo sang context Routine (bắt buộc phải sửa)

`KD-HAB2-005` (QUIT-type không vào được Routine) không thể hiện thực chỉ trong Habit — enforcement thật của rule "Habit archived không thêm được vào Routine" hiện nằm ở **application handler** của Routine (`AddRoutineHabitHandler`), không phải bên trong aggregate `Routine.addHabit()`:

```text
AddRoutineHabitHandler.execute():
  1. Load Habit qua RoutineHabitReader.findByIdForOwner()
  2. if (!habit.isActive) → RoutineHabitInactiveException
  3. routine.addHabit(habitId)   ← aggregate chỉ thao tác mảng habitIds,
                                    không tự biết gì về Habit liên quan
```

`RoutineHabitReadModel` (`routine-habit-reader.port.ts`) hiện chỉ có `{ id, isActive }` — cần mở rộng thêm `type: HabitType` để `AddRoutineHabitHandler` kiểm tra được. Cần thêm bước 2b tương tự bước 2:

```text
2b. if (habit.type === 'QUIT') → HabitTypeNotAllowedInRoutineException (mới)
```

Đây là thay đổi thuộc **context Routine**, không chỉ context Habit — cần lưu ý khi lên kế hoạch implement, không chỉ đọc riêng tài liệu Habit V2 này.

---

## 7. Domain Invariant Summary (mới)

| Invariant                                    | Enforced By                                               |
| -------------------------------------------- | --------------------------------------------------------- |
| QUIT-type không có frequency                 | `Habit.create()` validation theo `type`                   |
| QUIT-type bắt buộc quitStartedAt             | `Habit.create()` validation theo `type`                   |
| Relapse chỉ ghi khi Habit ACTIVE + type QUIT | Application layer (tương tự `HabitCheckInContextService`) |
| Relapse append-only                          | `HabitRelapseRepository` không có update/delete           |
| Type bất biến                                | Không có method `changeType()` trên aggregate             |

---

## 8. Next Step

```text
07. API Contract (Habit V2)
08. Database Schema (Habit V2)
```
