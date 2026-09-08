# Habit V1 — Database Schema

> **Status:** Baseline (Reverse-Engineered)
>
> **Domain:** Forge / Habit
>
> **Purpose:** Ghi lại schema thật của bảng `habits`, đọc trực tiếp từ `schema.prisma`.

---

## 1. Enum

```prisma
enum HabitFrequencyType {
  DAILY
  WEEKLY
}
```

---

## 2. Model

```prisma
model Habit {
  id            String             @id @default(uuid())
  ownerId       String             @map("owner_id")
  title         String             @db.VarChar(200)
  description   String?            @db.Text
  frequencyType HabitFrequencyType @map("frequency_type")
  frequencyDays Int[]              @default([]) @map("frequency_days")
  isActive      Boolean            @default(true) @map("is_active")
  revision      Int                @default(1)
  createdAt     DateTime           @default(now()) @map("created_at")
  updatedAt     DateTime           @updatedAt @map("updated_at")

  owner        User           @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  checkIns     HabitCheckIn[]
  routineLinks RoutineHabit[]

  @@unique([id, ownerId])
  @@index([ownerId, isActive])
  @@map("habits")
}
```

**Giải thích:**

- `frequencyDays` là `Int[]` (mảng nguyên thủy Postgres) — không có bảng con riêng, vì đây chỉ là danh sách ISO weekday, không mang identity hay lịch sử.
- Không có `end` timestamp nào (không có `archivedAt`) — `isActive` là đủ, vì V1 không cần biết "archive lúc nào", chỉ cần biết "đang archive hay không". Khác `ProjectCycle.endedAt` (Crucible) vốn cần mốc thời gian thật vì có ý nghĩa lịch sử.
- `@@unique([id, ownerId])` — hỗ trợ composite FK từ bảng con nếu cần (nhất quán pattern chung).
- `@@index([ownerId, isActive])` — phục vụ query list mặc định (lọc theo owner + trạng thái).
- Quan hệ `checkIns`/`routineLinks` thuộc phạm vi tài liệu riêng của `HabitCheckIn`/`Routine`.

---

## 3. Index Strategy

| Index                     | Reason                                              |
| ------------------------- | --------------------------------------------------- |
| `[ownerId, isActive]`     | List Habit lọc theo owner + trạng thái (BR-HAB-015) |
| `@@unique([id, ownerId])` | Composite FK an toàn cho bảng con                   |

---

## 4. Out of Scope for V1 Schema

```text
- archivedAt timestamp
- Bảng lịch sử chỉnh sửa (audit trail)
- Soft delete field (không có permanent delete nên không cần)
```

---

## 5. Next Step

Bộ tài liệu Habit V1 hoàn tất (01–08). Bước tiếp theo theo yêu cầu: cải tiến module dựa trên baseline này.
