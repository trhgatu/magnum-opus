# Projects V1 — Domain Analysis

> **Status:** Analysis / Candidate Domain Baseline
>
> **Domain:** Crucible / Projects
>
> **Purpose:** Xác định domain model cần thiết để implement Projects V1 một cách faithful với Product Specification đã được baseline, bao gồm Aggregate boundary, Entity, Value Object, Domain Event và lifecycle invariant enforcement.

---

## 1. Related Documentation

### Product Specification

`05-product-specification.md`

Authoritative baseline cho behavior của Projects V1.

Domain Analysis phải derive từ Product Specification, không phải từ database convenience hoặc framework convention.

### Codebase Context

Server sử dụng:

- NestJS với DDD pattern;
- CQRS với Command / Query separation;
- Domain Event với Outbox pattern;
- Optimistic concurrency với revision field;
- Prisma làm persistence layer.

Projects V1 sẽ follow cùng pattern này.

---

## 2. Domain Analysis Principles

### DAP-PRJ-001 — Domain Model Derives from Behavior

Domain Model phải phản ánh behavior đã baseline trong Product Specification.

Không được thiết kế entity vì database schema thuận tiện.

Ví dụ:

```text
Sai:
Project có intendedOutcome field
vì dễ lưu trong projects table.

Đúng:
Intended Outcome thuộc Project Cycle
vì Product Specification baseline rõ điều đó.
```

---

### DAP-PRJ-002 — Aggregate Enforces Invariants

Aggregate là boundary của consistency.

Mọi lifecycle invariant phải được enforce bên trong Aggregate boundary, không phải ở application layer.

Ví dụ:

```text
Sai:
Application handler kiểm tra
"Project có đang ACTIVE không?"
trước khi gọi pause().

Đúng:
Project.pause() tự throw
InvalidProjectTransitionException
nếu state không phải ACTIVE.
```

---

### DAP-PRJ-003 — Cycle Is a First-Class Domain Concept

Project Cycle không phải derived concept.

Cycle là Entity riêng vì:

- Cycle có identity (phân biệt Cycle 1, Cycle 2, Cycle N);
- Cycle có data riêng (intended outcome);
- Cycle có lifecycle boundary (startedAt, endedAt);
- Cycle cần được reference trực tiếp khi query history.

---

### DAP-PRJ-004 — Lifecycle Transition Is Observable

Mỗi lifecycle transition phải được ghi nhận như một observable fact.

Điều này cho phép:

- lifecycle history được preserve;
- Cycle boundary được xác định;
- audit trail tồn tại độc lập với current state.

---

### DAP-PRJ-005 — Crucible Is Isolated in V1

Crucible context không có cross-context dependency trong V1.

Project không reference Journal, Memory hoặc bất kỳ Reflection entity nào.

Cross-context relationship sẽ được phân tích sau khi có user need cụ thể.

---

## 3. Domain Concepts

### 3.1. Project

`Project` là Aggregate Root của Crucible context.

Project đại diện cho identity của một deliberate effort xuyên thời gian.

**Responsibilities:**

- giữ Project information (title, description);
- giữ current lifecycle state;
- enforce lifecycle transition eligibility;
- raise Domain Events khi transition xảy ra;
- own boundary của Project Cycle collection.

**Project không chịu trách nhiệm:**

- lưu toàn bộ lifecycle history trực tiếp;
- enforce Cycle-level business rule;
- tự động quyết định completion.

Project cũng chịu trách nhiệm enforce delete eligibility: chỉ Project chưa từng có Project Cycle nào (current lẫn historical) mới cho phép delete. Việc thực thi hard delete (xóa record khỏi persistence) là trách nhiệm của Repository, không phải Aggregate — Aggregate chỉ xác nhận delete có hợp lệ hay không.

---

### 3.2. Project Cycle

`Project Cycle` là Entity thuộc Project Aggregate.

Project Cycle đại diện cho một continuous pursuit period của Project.

**Responsibilities:**

- giữ Cycle identity;
- giữ Cycle boundary (startedAt, endedAt);
- giữ ~~intended outcome~~ **lịch sử intended outcome (V1.1, append-only)** của Cycle;
- **(V1.1)** giữ `closingNote` (chỉ có khi Cycle đã đóng);
- **(V1.1)** giữ `targetEndAt` (tùy chọn);
- biết Cycle đang open hay closed;
- **(V1.1)** từ chối mọi thay đổi (thêm outcome entry, đổi targetEndAt) khi Cycle đã đóng.

**Project Cycle không chịu trách nhiệm:**

- enforce lifecycle transition của Project;
- biết state của Project ngoài Cycle boundary.

---

### 3.3. Intended Outcome

`Intended Outcome` là Value Object thuộc Project Cycle.

**Characteristics:**

- optional — Cycle có thể tồn tại mà không có Intended Outcome;
- ~~mutable trong open Cycle;~~ **(V1.1)** không bị ghi đè — xem §3.3A;
- immutable sau khi Cycle đóng;
- không có identity riêng;
- equality dựa trên value.

Ví dụ:

```text
IntendedOutcome("Projects V1 đủ dùng hằng ngày")
```

---

### 3.3A. Intended Outcome Entry (V1.1)

**(Mới — V1.1, xem BR-PRJ-032/033)** Project Cycle không còn giữ một `IntendedOutcome` duy nhất, mà giữ một collection có thứ tự `IntendedOutcomeEntry[]`.

```text
IntendedOutcomeEntry   (Value Object)
├── sequence : integer           (1, 2, 3… trong phạm vi một Cycle — khóa thứ tự)
├── outcome  : IntendedOutcome   (VO §3.3 — validation giữ nguyên)
└── setAt    : timestamp         (business timestamp, chỉ để hiển thị)
```

**Characteristics:**

- append-only: Project Cycle chỉ expose thao tác thêm entry, không có sửa/xóa entry;
- thứ tự lịch sử được xác định bởi `sequence`, **không** bởi `setAt` — hai lần cập nhật có thể trùng `setAt` (cùng millisecond, hoặc entry backfill có `setAt` xấp xỉ), nên `setAt` không đủ làm khóa sắp xếp;
- entry mới nhận `sequence = sequence lớn nhất hiện có + 1` (entry đầu tiên là 1);
- current intended outcome = entry có `sequence` lớn nhất;
- thêm entry có `outcome` bằng đúng current outcome là no-op (không tạo entry, không tăng revision);
- toàn bộ collection immutable sau khi Cycle đóng;
- entry không có identity riêng ở tầng domain (VO) — persistence có thể gán id kỹ thuật.

Tại sao VO thay vì Entity: một entry không bao giờ thay đổi sau khi tạo và không được tham chiếu từ đâu khác, nên không cần identity domain — nhất quán với quyết định giữ `IntendedOutcome` là VO.

---

### 3.3B. Closing Note (V1.1)

`ClosingNote` là Value Object thuộc Project Cycle.

- optional;
- được gán đúng một lần, trong cùng thao tác đóng Cycle (`stop` / `complete`);
- Cycle đang mở không bao giờ có ClosingNote;
- validation: trim; chuỗi rỗng sau trim được coi là không có note (null); tối đa 2000 ký tự → vượt quá thì `InvalidClosingNoteException`.

---

### 3.3C. Target End Date (V1.1)

`targetEndAt` là ngày (date-only, không có giờ) thuộc Project Cycle — cùng quy ước date-only với `Habit.quitStartedAt`.

- optional;
- set / replace / clear khi Cycle đang mở;
- không lưu lịch sử;
- immutable sau khi Cycle đóng;
- không tham gia vào bất kỳ lifecycle rule nào (BR-PRJ-037) — "quá hạn" là phép so sánh ở tầng presentation với ngày hôm nay theo `User.timeZone`, không phải trạng thái domain.

---

### 3.4. Project Lifecycle State

`Project Lifecycle State` là Value Object biểu thị trạng thái hiện tại của Project.

```text
NOT_STARTED
ACTIVE
PAUSED
STOPPED
COMPLETED
```

Lifecycle State không tự thay đổi.

State chỉ thay đổi thông qua explicit lifecycle action được Project Aggregate enforce.

---

### 3.5. Lifecycle Transition

`Lifecycle Transition` là record của một lifecycle action đã xảy ra.

**Characteristics:**

- immutable sau khi được tạo;
- ghi nhận: fromState, toState, occurredAt;
- gắn với Project và Project Cycle tương ứng;
- là nguồn sự thật cho lifecycle history.

Lifecycle Transition không phải Domain Event.

Nó là persistent record.

Domain Event là signal để notify các handler khác.

---

### 3.6. Domain Events

Projects V1 raise một Domain Event duy nhất — `ProjectLifecycleTransitionedEvent` — sau khi một trong 6 lifecycle action (`Start`/`Pause`/`Resume`/`Stop`/`Complete`/`Reopen`) xảy ra thành công. `Update` và `SetIntendedOutcome` không raise Domain Event vì chúng không phải lifecycle transition (không có `fromState`/`toState`).

Domain Event này **không** đi qua Outbox pattern.

Lý do: Outbox tồn tại để đảm bảo delivery đáng tin cậy cho side-effect bất đồng bộ tới consumer _bên ngoài_ aggregate (gửi email, ghi Timeline, push realtime — xem `OutboxEventRouter`). Theo `DAP-PRJ-005`, Crucible không có cross-context dependency trong V1 — không có consumer nào cần được notify khi Project chuyển lifecycle state. Publish một event không ai consume qua Outbox sẽ khiến publisher throw lỗi liên tục (`No outbox route registered`).

Domain Event ở đây chỉ đóng vai trò tín hiệu **nội bộ, đồng bộ**: `Project` aggregate tự `addDomainEvent()`, và `PrismaProjectRepository.update()` `pullDomainEvents()` ngay trong cùng transaction đang ghi `project`/`project_cycles`, rồi map event thành 1 row `ProjectLifecycleTransition` và ghi trực tiếp — không có publisher, không có retry, không có bảng `outbox_events` nào được dùng.

Điều này nhất quán với precedent `Habit`/`Routine` trong codebase — cả hai đều raise **0 domain event** vì không có consumer nào tồn tại. Projects V1 raise đúng 1 event, nhưng chỉ để phục vụ chính nhu cầu ghi lịch sử của nó (§7), không phải để notify ai khác.

Nếu trong tương lai xuất hiện consumer thật (ví dụ Timeline cần biết khi Project complete), đây sẽ là lúc thêm domain event riêng cho từng action và route qua Outbox — một quyết định mới, không phải mặc định của V1.

---

## 4. Aggregate Design

### 4.1. Project Aggregate

```text
Project (Aggregate Root)
│
├── ProjectId         (Value Object)
├── Title             (Value Object)
├── Description       (Value Object, optional)
├── LifecycleState    (Value Object, enum)
├── Revision          (Value Object, optimistic concurrency)
│
└── ProjectCycles[]   (Entity collection)
      └── ProjectCycle
            ├── ProjectCycleId          (Value Object)
            ├── CycleNumber             (Value Object)
            ├── StartedAt               (timestamp)
            ├── EndedAt                 (timestamp, nullable)
            ├── EndReason               (enum: STOPPED | COMPLETED, nullable)
            ├── OutcomeEntries[]        (V1.1 — thay cho IntendedOutcome đơn của V1;
            │                            IntendedOutcomeEntry VO, append-only, có thể rỗng)
            ├── ClosingNote             (V1.1 — Value Object, nullable, chỉ khi đã đóng)
            └── TargetEndAt             (V1.1 — date, nullable)
```

---

### 4.2. Aggregate Boundary

Project Aggregate bao gồm:

```text
Project
ProjectCycle (owned by Project)
```

Project Aggregate không bao gồm:

```text
LifecycleTransition (separate persistence concern)
Goal (different context)
Journal (different context)
```

---

### 4.3. Aggregate Root Responsibilities

Project Aggregate Root chịu trách nhiệm enforce tất cả lifecycle invariant:

```text
project.start()
project.pause()
project.resume()
project.stop()
project.complete()
project.reopen()
```

Mỗi method trên:

1. kiểm tra transition eligibility;
2. thay đổi state nếu hợp lệ;
3. tạo hoặc đóng Project Cycle tương ứng;
4. raise `ProjectLifecycleTransitionedEvent` (xem §3.6);
5. throw exception nếu không hợp lệ.

`project.setIntendedOutcome(outcome)` cũng do Aggregate Root enforce (yêu cầu current Cycle đang mở), nhưng không phải lifecycle transition — không tạo/đóng Cycle, không raise event nào (xem §5.7).

**(V1.1)** Tương tự cho `project.setTargetEndAt(date | null)` (§5.7A). `stop()` và `complete()` nhận thêm tham số tùy chọn `closingNote` (§5.4, §5.5).

---

## 5. Lifecycle Behavior Ownership

### 5.1. start()

```text
Precondition:
state == NOT_STARTED

Effect:
state → ACTIVE
Cycle 1 created (startedAt = now)

Event raised:
ProjectLifecycleTransitionedEvent (action = START)
```

---

### 5.2. pause()

```text
Precondition:
state == ACTIVE

Effect:
state → PAUSED
Current Cycle remains open

Event raised:
ProjectLifecycleTransitionedEvent (action = PAUSE)
```

---

### 5.3. resume()

```text
Precondition:
state == PAUSED

Effect:
state → ACTIVE
Current Cycle remains open

Event raised:
ProjectLifecycleTransitionedEvent (action = RESUME)
```

---

### 5.4. stop(closingNote?)

```text
Precondition:
state ∈ {NOT_STARTED, ACTIVE, PAUSED}
(V1.1) state == NOT_STARTED  ⟹  closingNote phải rỗng
       (nếu có → InvalidClosingNoteException, vì không có Cycle để gắn)

Effect (if state == NOT_STARTED):
state → STOPPED
No Cycle created

Effect (if state ∈ {ACTIVE, PAUSED}):
state → STOPPED
Current Cycle closed (endedAt = now, endReason = STOPPED,
                      closingNote = closingNote ?? null)   ← V1.1

Event raised:
ProjectLifecycleTransitionedEvent (action = STOP)
```

---

### 5.5. complete(closingNote?)

```text
Precondition:
state ∈ {ACTIVE, PAUSED}

Effect:
state → COMPLETED
Current Cycle closed (endedAt = now, endReason = COMPLETED,
                      closingNote = closingNote ?? null)   ← V1.1

Event raised:
ProjectLifecycleTransitionedEvent (action = COMPLETE)
```

---

### 5.6. reopen()

```text
Precondition:
state ∈ {STOPPED, COMPLETED}

Effect:
state → ACTIVE
New Cycle created (startedAt = now)
New Cycle has no IntendedOutcome (V1.1: OutcomeEntries rỗng,
                                   targetEndAt = null, closingNote = null)

Event raised:
ProjectLifecycleTransitionedEvent (action = REOPEN)
```

---

### 5.7. setIntendedOutcome(outcome)

```text
Precondition:
state ∈ {ACTIVE, PAUSED}
Current Cycle exists and is open

Effect (V1):
Current Cycle.intendedOutcome = outcome        ← superseded

Effect (V1.1):
if outcome == current outcome → no-op (không đổi revision)
else → Current Cycle.OutcomeEntries.append({
          sequence: last sequence + 1,   (1 nếu chưa có entry)
          outcome,
          setAt: now
        })

Event raised:
none — not a lifecycle transition (no fromState/toState), so nothing
for ProjectLifecycleTransitionedEvent to record (see §3.6)
```

---

### 5.7A. setTargetEndAt(date | null) (V1.1)

```text
Precondition:
state ∈ {ACTIVE, PAUSED}
Current Cycle exists and is open

Effect:
if date == current targetEndAt → no-op
else → Current Cycle.targetEndAt = date   (null = clear)

Event raised:
none — not a lifecycle transition
```

Không có validation "date phải ở tương lai" (BR-PRJ-036).

---

### 5.8. canBeDeleted()

```text
Precondition:
none

Returns:
true  if cycles.length == 0 (Project chưa từng có Project Cycle nào — current lẫn historical)
false otherwise
```

Điều kiện này không kiểm tra lifecycle state, mà kiểm tra trực tiếp `ProjectCycles[]` collection của Aggregate. Vì `ACTIVE`/`PAUSED` luôn có current Cycle và một `STOPPED`/`COMPLETED` đạt được sau Start/Reopen luôn có historical Cycle, kiểm tra `cycles.length == 0` tự nhiên đúng cho `NOT_STARTED` và cho `STOPPED` đạt được từ `NOT_STARTED → Stop` mà chưa từng Start.

Project không tự xóa chính mình. `canBeDeleted()` chỉ xác nhận eligibility; Application layer gọi `ProjectRepository.deletePermanently(id, ownerId, expectedRevision)` khi eligibility hợp lệ. Xem mục 8.2 cho flow đầy đủ.

Không có Domain Event cho delete — Project không còn tồn tại sau delete nên không có aggregate nào để raise event từ đó. Nếu cần audit trail cho delete trong tương lai, đây sẽ là một quyết định riêng, không phải mặc định của V1.

---

## 6. Cycle Number Assignment

Cycle Number là sequential identifier trong scope của một Project.

```text
Cycle 1 → đầu tiên được tạo bởi Start hoặc Reopen đầu tiên
Cycle 2 → được tạo bởi Reopen tiếp theo
Cycle N → được tạo bởi Reopen thứ N-1
```

Cycle Number không global — nó chỉ có ý nghĩa trong context của một Project.

Cycle Number được assign bởi Project Aggregate khi tạo Cycle mới:

```text
newCycleNumber = closedCycles.length + 1
```

---

## 7. Lifecycle Transition Persistence

### 7.1. Why Both Event and Record

Product Specification yêu cầu lifecycle history được preserve.

Đây là hai concern khác nhau về bản chất:

```text
Domain Event
→ signal để notify handlers
→ có thể được consumed và discarded
→ không phải authoritative history record

Lifecycle Transition Record
→ persistent fact
→ không bị consume hay discard
→ là authoritative lifecycle history
```

Domain Event vẫn được dùng trong Projects V1, nhưng chỉ như cơ chế nội bộ để derive Lifecycle Transition Record — không đi qua Outbox, không notify handler nào bên ngoài aggregate (xem §3.6 vì sao Outbox không cần thiết ở đây):

```text
Lifecycle action xảy ra
        ↓
Domain Event raised (in-process signal)
        ↓
Repository pulls event trong cùng transaction
        ↓
Lifecycle Transition Record persisted (historical fact)
```

---

### 7.2. Lifecycle Transition Record

```text
ProjectLifecycleTransition
├── id
├── projectId
├── projectCycleId    (nullable — null nếu NOT_STARTED → STOPPED)
├── fromState
├── toState
├── occurredAt
└── action            (START | PAUSE | RESUME | STOP | COMPLETE | REOPEN)
```

`projectCycleId` là nullable vì transition `NOT_STARTED → STOPPED` xảy ra khi chưa có Cycle.

---

## 8. Application Layer Orchestration

Codebase hiện tại (Habit, Routine) không gọi trực tiếp `repository.save()` từ mỗi command handler. Thay vào đó, mỗi context có một **mutation service** dùng chung cho mọi lifecycle action, nhận một callback thực hiện đúng một domain method.

Projects V1 follow cùng pattern này qua `ProjectMutationService`.

### 8.1. ProjectMutationService

```text
ProjectMutationService.mutate(input: {
  projectId: string
  ownerId: string
  expectedRevision: number
  mutate: (project: Project) => void
}): Promise<Result<Project, DomainException>>
```

Flow:

```text
1. Load Project qua findByIdForOwner(projectId, ownerId)
   → not found → ProjectNotFoundException

2. Preflight check
   Project.revision !== expectedRevision
   → ProjectRevisionConflictException
   (fail nhanh trước khi chạy domain logic)

3. Chạy input.mutate(project)
   → nếu domain method throw DomainException, bắt lại và trả Result.fail
   → domain method tự enforce lifecycle invariant (ví dụ project.pause()
     tự throw InvalidProjectTransitionException nếu state không phải ACTIVE)

4. No-op short-circuit
   Nếu project.revision vẫn == expectedRevision sau bước 3
   (domain method không thực sự đổi gì)
   → trả Result.ok(project) mà KHÔNG ghi DB

5. Persist qua repository.update(project, expectedRevision)
   → compare-and-swap ở tầng Prisma:
     UPDATE projects SET ... WHERE id = ? AND owner_id = ? AND revision = ?
   → trả về boolean (true nếu đúng 1 row bị update)

6. Nếu update() trả false (race xảy ra giữa bước 2 và bước 5)
   → vẫn trả ProjectRevisionConflictException
```

Mỗi command handler cho Start/Pause/Resume/Stop/Complete/Reopen/SetIntendedOutcome chỉ gọi `mutationService.mutate({...})` với một `mutate` callback khác nhau — không tự enforce transition eligibility ở application layer, không tự gọi repository trực tiếp.

### 8.2. Delete Does Not Use ProjectMutationService

Delete không phải một domain mutation — nó loại bỏ Aggregate khỏi persistence, không đổi state của nó. Do đó Delete có handler riêng, theo đúng pattern của `DeleteMemoryHandler` (permanent delete) hiện có trong codebase:

```text
1. Load Project qua findByIdForOwner(projectId, ownerId)
   → not found → ProjectNotFoundException

2. Preflight check
   Project.revision !== expectedRevision
   → ProjectRevisionConflictException

3. Eligibility check
   !project.canBeDeleted()
   → ProjectDeletionNotAllowedException

4. Persist qua repository.deletePermanently(projectId, ownerId, expectedRevision)
   → compare-and-swap DELETE ở tầng Prisma, trả về boolean

5. Nếu deletePermanently() trả false (race xảy ra giữa bước 2 và bước 4 —
   ví dụ một request khác vừa Start Project ngay trước khi DELETE chạy)
   → vẫn trả ProjectRevisionConflictException
```

Việc yêu cầu `expectedRevision` cho Delete (đã baseline ở `07-api-contract.md` mục 4.12) không phải chi tiết trang trí — nó là điều kiện bắt buộc để tránh race giữa Delete và một lifecycle action khác xảy ra đồng thời trên cùng Project.

---

## 9. Concurrency Control

Projects V1 follow revision-based optimistic concurrency, nhất quán với Habit và Routine trong codebase.

```text
Project
└── revision: number
```

Cơ chế đầy đủ được mô tả ở mục 8 (`ProjectMutationService`, `Delete Does Not Use ProjectMutationService`): một preflight check ở application layer, cộng với một compare-and-swap thật ở tầng persistence (`WHERE revision = expectedRevision`) để đóng race giữa preflight và write.

Revision tăng sau mỗi successful state change được persist. Domain method có thể no-op (không tăng revision) khi mutate không thực sự đổi gì — trường hợp này `ProjectMutationService` bỏ qua DB write.

---

## 10. Domain Exceptions

```text
ProjectNotFoundException
ProjectRevisionConflictException
InvalidProjectTransitionException
InvalidProjectTitleException
ProjectCycleNotFoundException
InvalidIntendedOutcomeException
ProjectDeletionNotAllowedException
InvalidClosingNoteException          (V1.1)
```

`ProjectDeletionNotAllowedException` được throw khi delete được yêu cầu trong khi Project đã từng có ít nhất một Project Cycle (`cycles.length > 0`).

**(V1.1)** `InvalidClosingNoteException` được throw khi `closingNote` vượt 2000 ký tự, hoặc khi Stop từ `NOT_STARTED` kèm một `closingNote` không rỗng (không có Cycle để gắn).

`setTargetEndAt` dùng đúng chuỗi guard mà `setIntendedOutcome` đang dùng trong implementation hiện tại (`project.aggregate.ts`): state ngoài `ACTIVE`/`PAUSED` → `InvalidProjectTransitionException` (qua `ensureState`); `ProjectCycleNotFoundException` chỉ là nhánh phòng thủ khi không tìm thấy Cycle mở. Không cần exception mới.

`InvalidProjectTransitionException` được throw khi lifecycle action không hợp lệ với current state.

Ví dụ:

```text
project.pause() khi state == PAUSED
→ InvalidProjectTransitionException
```

---

## 11. Repository

Nhất quán với `HabitRepository`, `RoutineRepository`, `MemoryRepository` hiện có trong codebase — không có `save()` chung chung, không có `findById()` không scope owner.

```text
ProjectRepository (port)
├── create(project: Project): Promise<void>
├── update(project: Project, expectedRevision: number): Promise<boolean>
├── findByIdForOwner(id: string, ownerId: string): Promise<Project | null>
└── deletePermanently(id: string, ownerId: string, expectedRevision: number): Promise<boolean>
```

**Giải thích từng method:**

- `create()` — insert Project mới, gọi một lần duy nhất từ `CreateProjectHandler`.
- `update()` — compare-and-swap: implementation build một Prisma `updateMany` với `WHERE id = ? AND ownerId = ? AND revision = expectedRevision`, trả `true` khi đúng 1 row bị update. Đây là cơ chế enforce optimistic concurrency thật, không phải một so sánh in-memory.
- `findByIdForOwner()` — luôn scope theo `ownerId`. Không có phiên bản không scope owner, tránh việc một layer phía trên vô tình bỏ sót owner check.
- `deletePermanently()` — cũng compare-and-swap (`DELETE ... WHERE id = ? AND ownerId = ? AND revision = ?`), cùng lý do với `update()`: Delete phải an toàn trước race với một lifecycle action khác xảy ra đồng thời.

Project không cần một method sinh ID riêng trên Repository (khác với `UserRepository.nextIdentity()` bên IAM). Nhất quán với Habit/Routine — context gần Crucible nhất về bản chất (aggregate cá nhân, không cần ID điều phối từ nơi khác) — `Project` tự sinh ID qua `ProjectId.generate()` (static factory trên Value Object), gọi trực tiếp từ `Project.create()`.

Repository chỉ persist Project Aggregate.

`ProjectLifecycleTransition` có thể được persist bởi một separate writer nếu cần tách concern.

Quyết định technical cụ thể thuộc Infrastructure Design.

---

## 12. Query Model

CQRS pattern tách write model (Aggregate) và read model.

Projects V1 cần các read model sau:

```text
ProjectListItem
├── projectId
├── title
├── description
├── lifecycleState
└── currentCycleIntendedOutcome (optional)

ProjectDetail
├── projectId
├── title
├── description
├── lifecycleState
├── revision
└── currentCycle (optional)
      ├── cycleId
      ├── cycleNumber
      ├── startedAt
      ├── intendedOutcome (optional — entry có sequence lớn nhất)
      ├── outcomeHistory[]   (V1.1 — { outcome, setAt }, sắp theo sequence tăng dần)
      └── targetEndAt        (V1.1, optional)
```

~~Lifecycle history presentation chưa thuộc V1 query model.~~

**(V1.1)** Thêm read model cho lịch sử Cycle (UC-PRJ-014):

```text
ClosedCycleHistoryItem
├── cycleId
├── cycleNumber
├── startedAt
├── endedAt
├── endReason        (STOPPED | COMPLETED)
├── outcomeHistory[] ({ outcome, setAt }, sắp theo sequence tăng dần)
├── closingNote      (nullable)
└── targetEndAt      (nullable)
```

`ClosedCycleHistoryItem` là read model ở mức khái niệm. Trên wire, endpoint tương ứng (`GET /projects/:id/cycles/closed`, `07-api-contract.md` §4.14) dùng lại `ProjectCycleResponse` để client chỉ có một kiểu cycle: `cycleId` được serialize thành `id`, và response có thêm `intendedOutcome` (suy ra từ entry cuối của `outcomeHistory`). Hai shape mang cùng một thông tin, không phải hai hợp đồng khác nhau.

Trả về dạng danh sách các Cycle đã đóng của một Project, mới nhất trước. Đây là read model riêng (không nhồi vào `ProjectDetail`) để trang detail không phải tải toàn bộ lịch sử khi người dùng chưa mở phần lịch sử.

Xem Product Specification mục 23.

---

## 13. Domain Event Payload

Projects V1 dùng một event class duy nhất cho cả 6 lifecycle action (xem §3.6 vì sao không tách 9 event riêng như candidate ban đầu):

```text
ProjectLifecycleTransitionedEvent
├── projectId
├── cycleId    (nullable — null khi NOT_STARTED → STOPPED)
├── action     (START | PAUSE | RESUME | STOP | COMPLETE | REOPEN)
├── fromState
├── toState
└── occurredOn  (kế thừa từ DomainEvent base class)
```

Payload chỉ cần đủ để derive đúng 1 row `ProjectLifecycleTransition` — không cần chứa toàn bộ aggregate state, vì event này không có handler nào khác tiêu thụ ngoài chính repository ghi lịch sử.

---

## 14. Persistence Model Candidates

Domain Analysis không quyết định schema cuối cùng.

Các candidate table cần được thiết kế ở Infrastructure Design:

```text
projects
├── id
├── title
├── description
├── lifecycle_state
├── revision
├── created_at
└── updated_at

project_cycles
├── id
├── project_id
├── cycle_number
├── [DROPPED V1.1] intended_outcome    ← chỉ tồn tại ở V1; V1.1 chuyển sang bảng entry bên dưới rồi drop cột
├── started_at
├── ended_at (nullable)
├── end_reason (nullable: STOPPED | COMPLETED)
├── closing_note (nullable)            ← V1.1
└── target_end_at (nullable, date)     ← V1.1

project_cycle_outcome_entries          ← V1.1
├── id
├── cycle_id
├── sequence
├── outcome
└── set_at

project_lifecycle_transitions
├── id
├── project_id
├── project_cycle_id (nullable)
├── action
├── from_state
├── to_state
└── occurred_at
```

Schema trên là candidate, không phải final decision.

---

## 15. Domain Invariant Summary

| Invariant                                            | Enforced By                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Lifecycle transition eligibility                     | Project.method()                                                                                  |
| Single current Cycle                                 | Project Aggregate                                                                                 |
| Cycle starts only on ACTIVE                          | Project.start() / Project.reopen()                                                                |
| Cycle ends only on STOP / COMPLETE                   | Project.stop() / Project.complete()                                                               |
| Closed Cycle outcome is immutable                    | Project.setIntendedOutcome() (từ chối khi Cycle đã đóng) + ProjectCycle (V1.1: chỉ expose append) |
| Outcome only settable on open Cycle                  | Project.setIntendedOutcome()                                                                      |
| Revision conflict detection                          | ProjectMutationService (preflight) + ProjectRepository.update() (compare-and-swap)                |
| NOT_STARTED → STOPPED creates no Cycle               | Project.stop()                                                                                    |
| Delete only allowed when cycles.length == 0          | Project.canBeDeleted()                                                                            |
| Delete race-safe against concurrent lifecycle action | ProjectRepository.deletePermanently() (compare-and-swap)                                          |
| Outcome entries append-only (V1.1)                   | ProjectCycle (không expose sửa/xóa entry)                                                         |
| Closed Cycle rejects new outcome entry (V1.1)        | ProjectCycle / Project.setIntendedOutcome()                                                       |
| closingNote only set when closing (V1.1)             | Project.stop() / Project.complete()                                                               |
| No closingNote on NOT_STARTED → STOPPED (V1.1)       | Project.stop()                                                                                    |
| targetEndAt only settable on open Cycle (V1.1)       | Project.setTargetEndAt()                                                                          |
| targetEndAt never drives lifecycle (V1.1)            | Không có code path nào đọc targetEndAt trong lifecycle method                                     |

---

## 16. Open Design Decisions

Các quyết định sau chưa được chốt và thuộc Infrastructure / Technical Design:

- Schema chi tiết của từng table.
- Index strategy cho lifecycle transition queries.
- Archive behavior (delete đã được baseline: hard delete, chỉ khi `cycles.length == 0` — xem mục 5.8, 8.2, 10, 11).
- ~~Timeline / history read model nếu cần trong tương lai.~~ **(V1.1)** History ở mức Cycle đã có read model (`ClosedCycleHistoryItem`, §12); timeline mức transition vẫn mở.
- Cross-context reference pattern khi Crucible link với Reflection.
- Authorization — ai có thể thực hiện lifecycle action.
- Concurrency behavior khi hai request đồng thời thực hiện transition.

---

## 17. Next Step

Phase tiếp theo:

**Projects V1 — API Contract & Interface Design**

Domain Analysis đã xác định:

```text
Project → Aggregate Root
ProjectCycle → Entity
IntendedOutcome → Value Object
LifecycleState → Value Object
LifecycleTransition → Persistent Record
Domain Event → 1 event (in-process, no Outbox)
```

API Contract cần xác định:

```text
Endpoints
Request / Response shape
Error semantics
Lifecycle action endpoints
Query endpoints
```

Expected progression:

```text
06. Domain Analysis              ✓ done
        ↓
07. API Contract
        ↓
08. Database Schema
        ↓
09. Implementation
        ↓
10. Verification
```
