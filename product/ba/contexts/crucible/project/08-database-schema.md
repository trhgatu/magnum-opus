# Projects V1 — Database Schema

> **Status:** Candidate Baseline
>
> **Domain:** Crucible / Projects
>
> **Purpose:** Xác định Prisma schema cho Projects V1 bao gồm models, enums, constraints, indexes và migration approach, làm baseline cho implementation.

---

## 1. Related Documentation

### Domain Analysis

`06-domain-analysis.md`

Xác định:

- Project Aggregate Root;
- Project Cycle Entity;
- Intended Outcome Value Object;
- Lifecycle Transition persistent record.

### API Contract

`07-api-contract.md`

Xác định query patterns ảnh hưởng đến index strategy.

---

## 2. Schema Conventions

Nhất quán với schema hiện tại trong codebase:

```text
- id: String UUID, @default(uuid())
- Column names: snake_case via @map()
- Table names: snake_case plural via @@map()
- String fields: @db.VarChar(n) cho bounded, @db.Text cho unbounded
- Timestamps: createdAt @default(now()), updatedAt @updatedAt
- Revision: Int @default(1) cho optimistic concurrency
- Foreign key: onDelete: Cascade cho owned entities
- Enums: defined at top level, PascalCase
```

---

## 3. Enums

```prisma
enum ProjectLifecycleState {
  NOT_STARTED
  ACTIVE
  PAUSED
  STOPPED
  COMPLETED
}

enum ProjectCycleEndReason {
  STOPPED
  COMPLETED
}

enum ProjectLifecycleAction {
  START
  PAUSE
  RESUME
  STOP
  COMPLETE
  REOPEN
}
```

---

## 4. Models

### 4.1. Project

```prisma
model Project {
  id             String                 @id @default(uuid())
  ownerId        String                 @map("owner_id")
  title          String                 @db.VarChar(200)
  description    String?                @db.Text
  lifecycleState ProjectLifecycleState  @default(NOT_STARTED) @map("lifecycle_state")
  revision       Int                    @default(1)
  createdAt      DateTime               @default(now()) @map("created_at")
  updatedAt      DateTime               @updatedAt @map("updated_at")

  owner       User                        @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  cycles      ProjectCycle[]
  transitions ProjectLifecycleTransition[]

  @@unique([id, ownerId])
  @@index([ownerId, lifecycleState])
  @@index([ownerId, createdAt(sort: Desc)])
  @@map("projects")
}
```

**Giải thích:**

- `lifecycleState` dùng enum, default `NOT_STARTED`.
- `revision` default `1`, nhất quán với Habit và Memory.
- `@@unique([id, ownerId])` để support composite foreign key từ child models nếu cần.
- Index `[ownerId, lifecycleState]` cho query list theo state.
- Index `[ownerId, createdAt(sort: Desc)]` cho query list theo thứ tự tạo.

---

### 4.2. ProjectCycle

```prisma
model ProjectCycle {
  id              String                  @id @default(uuid())
  projectId       String                  @map("project_id")
  ownerId         String                  @map("owner_id")
  cycleNumber     Int                     @map("cycle_number")
  intendedOutcome String?                 @map("intended_outcome") @db.Text
  startedAt       DateTime                @map("started_at")
  endedAt         DateTime?               @map("ended_at")
  endReason       ProjectCycleEndReason?  @map("end_reason")
  createdAt       DateTime                @default(now()) @map("created_at")
  updatedAt       DateTime                @updatedAt @map("updated_at")

  project     Project                      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  transitions ProjectLifecycleTransition[]

  @@unique([projectId, cycleNumber])
  @@index([projectId, endedAt])
  @@map("project_cycles")
}
```

**Giải thích:**

- `cycleNumber` là sequential number trong scope của một Project. `@@unique([projectId, cycleNumber])` đảm bảo không có Cycle trùng số trong cùng Project.
- `intendedOutcome` là nullable — Cycle có thể tồn tại mà không có outcome.
- `startedAt` là required — Cycle luôn có điểm bắt đầu rõ ràng.
- `endedAt` là nullable — null khi Cycle đang mở.
- `endReason` là nullable — null khi Cycle đang mở, `STOPPED` hoặc `COMPLETED` khi đã đóng.
- `ownerId` được lưu để support query Cycle theo owner nếu cần sau này.
- Index `[projectId, endedAt]` cho query current Cycle (endedAt IS NULL).

> **(V1.1)** Model này được sửa ở §14: thêm `closingNote`, `targetEndAt`; `intendedOutcome` chuyển sang bảng `project_cycle_outcome_entries` rồi bị drop.

---

### 4.3. ProjectLifecycleTransition

```prisma
model ProjectLifecycleTransition {
  id           String                  @id @default(uuid())
  projectId    String                  @map("project_id")
  cycleId      String?                 @map("cycle_id")
  action       ProjectLifecycleAction
  fromState    ProjectLifecycleState   @map("from_state")
  toState      ProjectLifecycleState   @map("to_state")
  occurredAt   DateTime                @map("occurred_at")
  createdAt    DateTime                @default(now()) @map("created_at")

  project Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  cycle   ProjectCycle? @relation(fields: [cycleId], references: [id], onDelete: SetNull)

  @@index([projectId, occurredAt(sort: Desc)])
  @@index([cycleId])
  @@map("project_lifecycle_transitions")
}
```

**Giải thích:**

- `cycleId` là nullable — transition `NOT_STARTED → STOPPED` xảy ra khi chưa có Cycle.
- `onDelete: SetNull` cho `cycleId` — nếu Cycle bị xóa (edge case), transition record vẫn tồn tại.
- `occurredAt` là business timestamp — thời điểm action thực sự xảy ra.
- `createdAt` là technical timestamp — thời điểm record được insert.
- Không có `updatedAt` — transition record là immutable.
- Index `[projectId, occurredAt(sort: Desc)]` cho query lifecycle history theo thứ tự thời gian.
- Index `[cycleId]` cho query transitions của một Cycle cụ thể.

---

## 5. Full Schema Addition

Đây là phần cần thêm vào `schema.prisma` hiện tại:

```prisma
// ─── Crucible / Projects ───────────────────────────────────────────────────

enum ProjectLifecycleState {
  NOT_STARTED
  ACTIVE
  PAUSED
  STOPPED
  COMPLETED
}

enum ProjectCycleEndReason {
  STOPPED
  COMPLETED
}

enum ProjectLifecycleAction {
  START
  PAUSE
  RESUME
  STOP
  COMPLETE
  REOPEN
}

model Project {
  id             String                @id @default(uuid())
  ownerId        String                @map("owner_id")
  title          String                @db.VarChar(200)
  description    String?               @db.Text
  lifecycleState ProjectLifecycleState @default(NOT_STARTED) @map("lifecycle_state")
  revision       Int                   @default(1)
  createdAt      DateTime              @default(now()) @map("created_at")
  updatedAt      DateTime              @updatedAt @map("updated_at")

  owner       User                         @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  cycles      ProjectCycle[]
  transitions ProjectLifecycleTransition[]

  @@unique([id, ownerId])
  @@index([ownerId, lifecycleState])
  @@index([ownerId, createdAt(sort: Desc)])
  @@map("projects")
}

model ProjectCycle {
  id              String                 @id @default(uuid())
  projectId       String                 @map("project_id")
  ownerId         String                 @map("owner_id")
  cycleNumber     Int                    @map("cycle_number")
  intendedOutcome String?                @map("intended_outcome") @db.Text
  startedAt       DateTime               @map("started_at")
  endedAt         DateTime?              @map("ended_at")
  endReason       ProjectCycleEndReason? @map("end_reason")
  createdAt       DateTime               @default(now()) @map("created_at")
  updatedAt       DateTime               @updatedAt @map("updated_at")

  project     Project                      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  transitions ProjectLifecycleTransition[]

  @@unique([projectId, cycleNumber])
  @@index([projectId, endedAt])
  @@map("project_cycles")
}

model ProjectLifecycleTransition {
  id         String                @id @default(uuid())
  projectId  String                @map("project_id")
  cycleId    String?               @map("cycle_id")
  action     ProjectLifecycleAction
  fromState  ProjectLifecycleState @map("from_state")
  toState    ProjectLifecycleState @map("to_state")
  occurredAt DateTime              @map("occurred_at")
  createdAt  DateTime              @default(now()) @map("created_at")

  project Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  cycle   ProjectCycle? @relation(fields: [cycleId], references: [id], onDelete: SetNull)

  @@index([projectId, occurredAt(sort: Desc)])
  @@index([cycleId])
  @@map("project_lifecycle_transitions")
}
```

Cần thêm relation `projects` vào model `User`:

```prisma
model User {
  // ... existing fields ...
  projects Project[]
  // ... existing fields ...
}
```

---

## 6. Index Strategy

| Table                           | Index                                  | Reason                                                                   |
| ------------------------------- | -------------------------------------- | ------------------------------------------------------------------------ |
| `projects`                      | `[ownerId, lifecycleState]`            | List projects filtered by state                                          |
| `projects`                      | `[ownerId, createdAt DESC]`            | List projects sorted by creation                                         |
| `project_cycles`                | `[projectId, endedAt]`                 | Find current cycle (endedAt IS NULL)                                     |
| `project_cycles`                | `@@unique([projectId, cycleNumber])`   | Prevent duplicate cycle numbers                                          |
| `project_lifecycle_transitions` | `[projectId, occurredAt DESC]`         | Query lifecycle history                                                  |
| `project_lifecycle_transitions` | `[cycleId]`                            | Query transitions of a specific cycle                                    |
| `project_cycle_outcome_entries` | `@@unique([cycleId, sequence])` (V1.1) | Đọc lịch sử outcome theo thứ tự, lấy entry mới nhất, chặn trùng sequence |

---

## 7. Constraint Summary

| Constraint                             | Model                                     | Rule                                                            |
| -------------------------------------- | ----------------------------------------- | --------------------------------------------------------------- |
| `onDelete: Cascade`                    | ProjectCycle → Project                    | Khi Project bị xóa, Cycles bị xóa theo                          |
| `onDelete: Cascade`                    | ProjectLifecycleTransition → Project      | Khi Project bị xóa, Transitions bị xóa theo                     |
| `onDelete: SetNull`                    | ProjectLifecycleTransition → ProjectCycle | Khi Cycle bị xóa, cycleId trong Transition set null             |
| `onDelete: Restrict` (V1.1)            | ProjectCycleOutcomeEntry → ProjectCycle   | Không cho xóa Cycle còn outcome entry — giữ lịch sử append-only |
| `@@unique([cycleId, sequence])` (V1.1) | ProjectCycleOutcomeEntry                  | Thứ tự lịch sử outcome xác định trong một Cycle                 |
| `@@unique([projectId, cycleNumber])`   | ProjectCycle                              | Cycle number là unique trong scope của Project                  |
| `@@unique([id, ownerId])`              | Project                                   | Support composite FK nếu cần                                    |

---

## 8. Nullable Field Summary

| Field             | Model                      | Nullable | Reason                                                             |
| ----------------- | -------------------------- | -------- | ------------------------------------------------------------------ |
| `description`     | Project                    | Yes      | Optional project information                                       |
| `intendedOutcome` | ProjectCycle               | Yes      | Outcome là optional theo Product Spec — **V1.1: bị drop, xem §14** |
| `endedAt`         | ProjectCycle               | Yes      | Null khi Cycle đang mở                                             |
| `endReason`       | ProjectCycle               | Yes      | Null khi Cycle đang mở                                             |
| `closingNote`     | ProjectCycle               | Yes      | (V1.1) Tùy chọn; luôn null khi Cycle đang mở                       |
| `targetEndAt`     | ProjectCycle               | Yes      | (V1.1) Tùy chọn                                                    |
| `cycleId`         | ProjectLifecycleTransition | Yes      | Null khi NOT_STARTED → STOPPED                                     |

---

## 9. Current Cycle Query Pattern

Để lấy current Cycle của một Project:

```sql
SELECT *
FROM project_cycles
WHERE project_id = :projectId
  AND ended_at IS NULL
LIMIT 1
```

Hoặc trong Prisma:

```typescript
prisma.projectCycle.findFirst({
  where: {
    projectId,
    endedAt: null,
  },
});
```

Index `[projectId, endedAt]` support query này.

---

## 10. Migration Approach

Migration file sẽ được generate bởi Prisma CLI:

```bash
pnpm prisma migrate dev --name add_crucible_projects
```

Migration sẽ:

1. Tạo 3 enums mới: `ProjectLifecycleState`, `ProjectCycleEndReason`, `ProjectLifecycleAction`.
2. Tạo table `projects`.
3. Tạo table `project_cycles`.
4. Tạo table `project_lifecycle_transitions`.
5. Thêm foreign key constraints.
6. Tạo indexes.

Migration không thay đổi bất kỳ table hoặc enum hiện có ngoài việc thêm relation `projects` vào `users` table.

---

## 11. Design Decisions

| Decision                              | Value                        | Reason                                                                 |
| ------------------------------------- | ---------------------------- | ---------------------------------------------------------------------- |
| `startedAt` trong ProjectCycle        | Business timestamp, required | Cycle luôn có điểm bắt đầu rõ ràng                                     |
| `occurredAt` trong Transition         | Business timestamp, required | Phân biệt với `createdAt` kỹ thuật                                     |
| Không có `updatedAt` trong Transition | Intentional                  | Transition là immutable record                                         |
| `ownerId` trong ProjectCycle          | Denormalized                 | Hỗ trợ query theo owner mà không JOIN                                  |
| `intendedOutcome` là Text             | Unbounded                    | Outcome không giới hạn độ dài — V1.1: áp dụng cho `outcome` của entry  |
| `title` là VarChar(200)               | Bounded                      | Nhất quán với Habit, Memory, Routine                                   |
| `cycleId` nullable trong Transition   | Intentional                  | NOT_STARTED → STOPPED không có Cycle                                   |
| `closingNote` là VarChar(2000) (V1.1) | Bounded                      | Ngữ cảnh ngắn, không phải nơi viết nhật ký — dài hơn thì thuộc Journal |
| `targetEndAt` là `@db.Date` (V1.1)    | Date-only                    | Mốc theo ngày, cùng quy ước `Habit.quitStartedAt`; không có múi giờ    |
| Outcome history là bảng riêng (V1.1)  | 1-N, append-only             | Xem §14.3                                                              |

---

## 12. Delete Behavior

Projects V1 dùng hard delete, không phải soft delete — do đó `Project` model không có field `isDeleted`.

Delete chỉ hợp lệ khi Project chưa từng có bất kỳ `ProjectCycle` nào — current lẫn historical (xem `FR-PRJ-014`, `BR-PRJ-029`):

```sql
SELECT COUNT(*) FROM project_cycles WHERE project_id = :projectId
-- phải bằng 0
```

Vì điều kiện delete đảm bảo `project_cycles` rỗng cho Project đó, `onDelete: Cascade` đã khai báo sẵn ở mục 4.2 và 4.3 không cần xóa bất kỳ record con nào trong thực tế — nó chỉ tồn tại như một safety net, không phải cơ chế chính cho behavior này.

Không cần schema addition nào khác để hỗ trợ delete ngoài một `DELETE` operation trực tiếp trên bảng `projects`.

---

## 13. Out of Scope for V1 Schema

```text
- Archive state
- Lifecycle history read model / materialized view
- Full-text search index trên title/description
- Project tags hoặc labels
- Cross-context foreign key sang Reflection tables
```

---

## 14. V1.1 Schema Revision — Cycle Flexibility

Phục vụ FR-PRJ-015/016/017 và BR-PRJ-032 → BR-PRJ-037.

### 14.1. ProjectCycle (sau V1.1)

```prisma
model ProjectCycle {
  id          String                 @id @default(uuid())
  projectId   String                 @map("project_id")
  ownerId     String                 @map("owner_id")
  cycleNumber Int                    @map("cycle_number")
  // intendedOutcome đã bị drop — xem §14.4
  startedAt   DateTime               @map("started_at")
  endedAt     DateTime?              @map("ended_at")
  endReason   ProjectCycleEndReason? @map("end_reason")
  closingNote String?                @map("closing_note") @db.VarChar(2000)
  targetEndAt DateTime?              @map("target_end_at") @db.Date
  createdAt   DateTime               @default(now()) @map("created_at")
  updatedAt   DateTime               @updatedAt @map("updated_at")

  project        Project                      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  transitions    ProjectLifecycleTransition[]
  outcomeEntries ProjectCycleOutcomeEntry[]

  @@unique([projectId, cycleNumber])
  @@index([projectId, endedAt])
  @@map("project_cycles")
}
```

### 14.2. ProjectCycleOutcomeEntry (mới)

```prisma
model ProjectCycleOutcomeEntry {
  id        String   @id @default(uuid())
  cycleId   String   @map("cycle_id")
  sequence  Int
  outcome   String   @db.Text
  setAt     DateTime @map("set_at")
  createdAt DateTime @default(now()) @map("created_at")

  cycle ProjectCycle @relation(fields: [cycleId], references: [id], onDelete: Restrict)

  @@unique([cycleId, sequence])
  @@map("project_cycle_outcome_entries")
}
```

**Giải thích:**

- Không có `updatedAt` — entry là immutable record, cùng lý do với `ProjectLifecycleTransition` (§11).
- `sequence` (1, 2, 3… trong một Cycle) là **khóa thứ tự** của lịch sử — mọi truy vấn đọc lịch sử dùng `ORDER BY sequence`, entry hiện tại là `sequence` lớn nhất. Không sắp theo `setAt`, vì `setAt` có thể trùng (hai lần lưu cùng millisecond, hoặc entry backfill có `setAt` xấp xỉ ở §14.4).
- `@@unique([cycleId, sequence])` vừa đảm bảo thứ tự xác định, vừa là index phục vụ đọc lịch sử theo thứ tự và lấy entry mới nhất. Nếu hai request cùng append vào một Cycle, row thứ hai vi phạm unique — nhưng trường hợp này đã bị chặn trước bởi compare-and-swap trên `projects.revision` (§11 của Domain Analysis), unique chỉ là lớp bảo vệ cuối.
- `setAt` là business timestamp (thời điểm người dùng đặt outcome), chỉ để hiển thị; `createdAt` là technical timestamp — tách nhau để migration §14.4 có thể ghi `setAt` xấp xỉ mà không làm sai `createdAt`.
- `onDelete: Restrict` — xóa một Cycle còn entry sẽ bị DB từ chối, thay vì âm thầm xóa lịch sử theo (BR-PRJ-033). Repository hiện tại `upsert` Cycle và không bao giờ xóa Cycle, nên trong thực tế FK này không bị kích hoạt; nó là lớp chặn nếu sau này có code xóa Cycle. Xóa Project không bị ảnh hưởng: Project chỉ xóa được khi chưa từng có Cycle nào (BR-PRJ-029), nên không có entry nào để chặn.
- Không lưu `ownerId` — entry luôn được đọc qua Cycle, không có query theo owner trực tiếp.

### 14.3. Vì Sao Bảng Riêng Thay Vì JSONB

Khác với Chronicle snapshot (dữ liệu tính sẵn, đọc nguyên khối, không có quan hệ — nên JSONB hợp lý), outcome entry là một phần của aggregate đang được ghi liên tục và có invariant append-only. Bảng riêng cho phép:

- append đúng 1 row cho mỗi lần cập nhật, không phải đọc–sửa–ghi lại cả mảng JSON (tránh mất entry khi hai request ghi đồng thời);
- giữ kiểu dữ liệu và ràng buộc ở tầng DB thay vì chỉ ở tầng ứng dụng.

Repository chỉ **insert** entry mới chưa có trong DB; không bao giờ `UPDATE`/`DELETE` entry đã tồn tại — đây là nơi BR-PRJ-033 được giữ ở tầng persistence.

### 14.4. Migration

```bash
pnpm prisma migrate dev --name project_cycle_flexibility
```

Thứ tự:

1. Thêm cột `closing_note`, `target_end_at` vào `project_cycles` (nullable — không cần backfill).
2. Tạo bảng `project_cycle_outcome_entries`.
3. **Backfill:** với mỗi `project_cycles` có `intended_outcome IS NOT NULL`, insert đúng 1 entry:
   ```sql
   INSERT INTO project_cycle_outcome_entries (id, cycle_id, sequence, outcome, set_at, created_at)
   SELECT gen_random_uuid(), id, 1, intended_outcome, updated_at, now()
   FROM project_cycles
   WHERE intended_outcome IS NOT NULL;
   ```
   Mỗi Cycle V1 có tối đa 1 outcome nên entry backfill luôn là `sequence = 1`.
   `set_at = updated_at` là xấp xỉ — V1 không lưu thời điểm outcome được đặt, và các giá trị bị ghi đè trước đó đã mất từ V1, không khôi phục được. Đây là giới hạn đã biết, chấp nhận được.
4. Drop cột `intended_outcome` khỏi `project_cycles`.

Bước 3 và 4 phải nằm trong cùng migration file (Prisma sinh bước 1, 2, 4; bước 3 viết tay chèn vào trước bước 4) để không có thời điểm nào dữ liệu outcome cũ bị mất.

---

## 15. Next Step

Phase tiếp theo:

**Projects V1 — Implementation**

Implementation sẽ follow cấu trúc DDD hiện tại của codebase:

```text
crucible/
└── project/
    ├── project.module.ts
    ├── domain/
    │   ├── project.aggregate.ts
    │   ├── project-cycle.entity.ts
    │   ├── enums/
    │   │   ├── project-lifecycle-state.enum.ts
    │   │   ├── project-cycle-end-reason.enum.ts
    │   │   └── project-lifecycle-action.enum.ts
    │   ├── value-objects/
    │   │   ├── project-id.value-object.ts
    │   │   ├── project-title.value-object.ts
    │   │   └── intended-outcome.value-object.ts
    │   ├── exceptions/
    │   │   ├── project-not-found.exception.ts
    │   │   ├── invalid-project-transition.exception.ts
    │   │   └── project-revision-conflict.exception.ts
    │   └── ports/
    │       └── project.repository.ts
    ├── application/
    │   ├── commands/
    │   └── queries/
    ├── infrastructure/
    │   ├── mappers/
    │   ├── repositories/
    │   └── readers/
    └── presentation/
        ├── controllers/
        ├── dtos/
        └── presenters/
```

Expected progression:

```text
06. Domain Analysis        ✓ done
07. API Contract           ✓ done
08. Database Schema        ✓ done
        ↓
09. Implementation
        ↓
10. Verification
```
