# Habit V2 — Database Schema (Quit-Type Habit)

> **Status:** Candidate / Draft
>
> **Domain:** Forge / Habit
>
> **Purpose:** Xác định thay đổi schema cho phần mở rộng QUIT-type — sửa `habits`, thêm bảng `habit_relapses` mới.

---

## 1. Enum mới

```prisma
enum HabitType {
  BUILD
  QUIT
}
```

---

## 2. Thay đổi trên `Habit`

```prisma
model Habit {
  id            String              @id @default(uuid())
  ownerId       String              @map("owner_id")
  title         String              @db.VarChar(200)
  description   String?             @db.Text
  type          HabitType           @default(BUILD) @map("type")        // MỚI
  frequencyType HabitFrequencyType? @map("frequency_type")               // ĐỔI: nullable
  frequencyDays Int[]               @default([]) @map("frequency_days")
  quitStartedAt DateTime?           @db.Date @map("quit_started_at")     // MỚI
  isActive      Boolean             @default(true) @map("is_active")
  revision      Int                 @default(1)
  createdAt     DateTime            @default(now()) @map("created_at")
  updatedAt     DateTime            @updatedAt @map("updated_at")

  owner        User            @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  checkIns     HabitCheckIn[]
  relapses     HabitRelapse[]                                            // MỚI
  routineLinks RoutineHabit[]

  @@unique([id, ownerId])
  @@index([ownerId, isActive])
  @@index([ownerId, type])                                               // MỚI
  @@map("habits")
}
```

**Giải thích thay đổi:**

- `type` mặc định `BUILD` — Habit cũ migrate vào sẽ tự động nhận giá trị này (`BR-HAB2-012`), không cần backfill script riêng nếu dùng default ở tầng migration.
- `frequencyType` chuyển từ bắt buộc sang **nullable** — phá vỡ giả định cũ "mọi Habit đều có frequency". Đây là thay đổi schema có rủi ro (xem §5). **Đã verify**: `PrismaTodayReader` (`prisma-today.reader.ts`) build query bằng `OR: [{frequencyType: 'DAILY'}, {frequencyType: 'WEEKLY', frequencyDays: {has: ...}}]` — đây là equality filter SQL thuần túy, `frequencyType = null` không khớp điều kiện nào nên bị loại tự nhiên khỏi kết quả, **không throw lỗi, không cần sửa query** để hỗ trợ `BR-HAB2-011`.

  Tuy nhiên `PrismaHabitMapper` (`prisma-habit.mapper.ts`) **có** cần sửa: `toDomain()` tra `domainFrequencyTypes[raw.frequencyType]` — với `raw.frequencyType = null` (Habit QUIT), lookup này ra `undefined`, rồi gọi `HabitFrequency.rehydrate(undefined, [])`. `HabitFrequency.rehydrate()` (`habit-frequency.value-object.ts:44-57`) kiểm tra `type !== WEEKLY` khi không phải `DAILY` → `undefined` rơi vào nhánh này và **throw `InvalidHabitFrequencyException`** — nghĩa là `toDomain()` sẽ crash khi đọc bất kỳ Habit QUIT nào từ DB, không phải âm thầm tạo ra giá trị sai kiểu. Tương tự `toPersistence()` tra `persistenceFrequencyTypes[props.frequencyType]` sẽ `undefined` nếu `frequencyType` domain là null cho QUIT-type. Đây là thay đổi implementation thực sự cần làm ở mapper (thêm nhánh xử lý `type = QUIT` tách biệt khỏi `frequency`, không gọi `HabitFrequency.rehydrate()` khi type = QUIT), nằm ngoài phạm vi "Aggregate Method Constraints" ở `06-domain-analysis.md` §4 (chỉ cover validation trong `create()`/`update()`, không cover persistence mapping).

- `quitStartedAt` chỉ có giá trị khi `type = QUIT`. Không enforce được bằng schema thuần túy (Prisma không hỗ trợ CHECK constraint điều kiện theo cột khác) — phải enforce ở tầng domain (`Habit.create()`).
- Index `[ownerId, type]` phục vụ filter theo loại (`FR-HAB2-004`).

---

## 3. Model mới: `HabitRelapse`

```prisma
model HabitRelapse {
  id         String   @id @default(uuid())
  habitId    String   @map("habit_id")
  ownerId    String   @map("owner_id")
  occurredAt DateTime @map("occurred_at")
  createdAt  DateTime @default(now()) @map("created_at")

  habit Habit @relation(fields: [habitId, ownerId], references: [id, ownerId], onDelete: Cascade)

  @@index([habitId, occurredAt(sort: Desc)])
  @@map("habit_relapses")
}
```

**Giải thích:**

- **Không có `@@unique`** trên `[habitId, date]` như `HabitCheckIn` — đây chính là điểm khác biệt cố ý, hiện thực hóa `KD-HAB2-007` (append-only, không idempotent theo ngày).
- `occurredAt` là `DateTime` đầy đủ (giờ:phút:giây), không phải `@db.Date` như `HabitCheckIn.date` — vì cần phân biệt được nhiều lần trong cùng 1 ngày, và query "bản ghi gần nhất" (`ORDER BY occurredAt DESC LIMIT 1`) cần độ chính xác đó.
- Index `[habitId, occurredAt DESC]` phục vụ trực tiếp truy vấn "lần relapse gần nhất" (`06-domain-analysis.md` §6).
- Không có `updatedAt` — bản ghi bất biến sau khi tạo (giống `HabitCheckIn`, giống `ProjectLifecycleTransition` bên Crucible).

---

## 4. Query Pattern: "Ngày không tái phạm"

```sql
SELECT occurred_at
FROM habit_relapses
WHERE habit_id = :habitId
  AND occurred_at >= :quitStartedAt   -- quit_started_at hiện tại của Habit
ORDER BY occurred_at DESC
LIMIT 1
```

Nếu không có kết quả (kể cả khi có relapse cũ hơn `quit_started_at`) → dùng `habits.quit_started_at` làm mốc.

Điều kiện `occurred_at >= quitStartedAt` là bắt buộc — nếu bỏ qua điều kiện này, một relapse cũ hơn `quit_started_at` hiện tại (do người dùng sửa `quit_started_at` lùi về sau) sẽ khiến phép tính "since" ra số âm (`BR-HAB2-004`).

---

## 5. Rủi ro Migration cần lưu ý

```text
- frequencyType chuyển từ NOT NULL sang NULLABLE: migration phải ALTER
  COLUMN, không mất dữ liệu hiện có (mọi Habit cũ đều có giá trị hợp lệ
  sẵn), nhưng đây là thay đổi schema có tính phá vỡ giả định cũ — cần
  review kỹ câu lệnh migration trước khi áp dụng production (tương tự
  quy trình đã áp dụng cho Crucible/Project).
- type mặc định BUILD cho toàn bộ Habit hiện có — set qua @default(BUILD)
  ở cột mới là đủ, Prisma tự backfill giá trị mặc định cho row cũ khi
  ALTER TABLE ADD COLUMN.
```

---

## 6. Index Strategy (mới)

| Index                                         | Reason                           |
| --------------------------------------------- | -------------------------------- |
| `[ownerId, type]`                             | Filter danh sách Habit theo loại |
| `[habitId, occurredAt DESC]` (habit_relapses) | Tìm relapse gần nhất             |

---

## 7. Out of Scope for V2 Schema

```text
- Bảng lưu "mức độ" relapse (chỉ có 1 loại sự kiện, không phân cấp)
- Soft delete cho HabitRelapse (không cần, chưa có nhu cầu xóa)
```

---

## 8. Next Step

Bộ tài liệu Habit V2 (quit-type) hoàn tất (01–08, candidate/draft) — không còn câu hỏi mở, toàn bộ đã chốt thành Known Decision (`01-ba-overview.md` §9, `KD-HAB2-001` đến `010`). Bước tiếp theo: review lại toàn bộ với người phụ trách sản phẩm trước khi implement.
