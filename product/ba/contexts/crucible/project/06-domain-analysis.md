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
- giữ intended outcome của Cycle;
- biết Cycle đang open hay closed.

**Project Cycle không chịu trách nhiệm:**

- enforce lifecycle transition của Project;
- biết state của Project ngoài Cycle boundary.

---

### 3.3. Intended Outcome

`Intended Outcome` là Value Object thuộc Project Cycle.

**Characteristics:**

- optional — Cycle có thể tồn tại mà không có Intended Outcome;
- mutable trong open Cycle;
- immutable sau khi Cycle đóng;
- không có identity riêng;
- equality dựa trên value.

Ví dụ:

```text
IntendedOutcome("Projects V1 đủ dùng hằng ngày")
```

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

Projects V1 raise các Domain Event sau khi lifecycle transition xảy ra thành công:

```text
ProjectCreated
ProjectStarted
ProjectPaused
ProjectResumed
ProjectStopped
ProjectCompleted
ProjectReopened
ProjectUpdated
ProjectCycleIntendedOutcomeSet
```

Domain Event được publish thông qua Outbox pattern, nhất quán với codebase hiện tại.

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
            ├── ProjectCycleId    (Value Object)
            ├── CycleNumber       (Value Object)
            ├── StartedAt         (timestamp)
            ├── EndedAt           (timestamp, nullable)
            ├── EndReason         (enum: STOPPED | COMPLETED, nullable)
            └── IntendedOutcome   (Value Object, optional)
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
project.setIntendedOutcome(outcome)
```

Mỗi method:

1. kiểm tra transition eligibility;
2. thay đổi state nếu hợp lệ;
3. tạo hoặc đóng Project Cycle tương ứng;
4. raise Domain Event;
5. throw exception nếu không hợp lệ.

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
ProjectStarted
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
ProjectPaused
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
ProjectResumed
```

---

### 5.4. stop()

```text
Precondition:
state ∈ {NOT_STARTED, ACTIVE, PAUSED}

Effect (if state == NOT_STARTED):
state → STOPPED
No Cycle created

Effect (if state ∈ {ACTIVE, PAUSED}):
state → STOPPED
Current Cycle closed (endedAt = now, endReason = STOPPED)

Event raised:
ProjectStopped
```

---

### 5.5. complete()

```text
Precondition:
state ∈ {ACTIVE, PAUSED}

Effect:
state → COMPLETED
Current Cycle closed (endedAt = now, endReason = COMPLETED)

Event raised:
ProjectCompleted
```

---

### 5.6. reopen()

```text
Precondition:
state ∈ {STOPPED, COMPLETED}

Effect:
state → ACTIVE
New Cycle created (startedAt = now)
New Cycle has no IntendedOutcome

Event raised:
ProjectReopened
```

---

### 5.7. setIntendedOutcome(outcome)

```text
Precondition:
state ∈ {ACTIVE, PAUSED}
Current Cycle exists and is open

Effect:
Current Cycle.intendedOutcome = outcome

Event raised:
ProjectCycleIntendedOutcomeSet
```

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

Codebase dùng Domain Event với Outbox pattern.

Hai concern này khác nhau:

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

Do đó Projects V1 sử dụng cả hai:

```text
Lifecycle action xảy ra
        ↓
Domain Event raised (notify handlers)
        +
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
```

`ProjectDeletionNotAllowedException` được throw khi delete được yêu cầu trong khi Project đã từng có ít nhất một Project Cycle (`cycles.length > 0`).

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
      └── intendedOutcome (optional)
```

Lifecycle history presentation chưa thuộc V1 query model.

Xem Product Specification mục 23.

---

## 13. Domain Event Payload Candidates

```text
ProjectCreated
├── projectId
├── title
├── description
└── occurredAt

ProjectStarted
├── projectId
├── cycleId
├── cycleNumber
└── occurredAt

ProjectPaused
├── projectId
├── cycleId
└── occurredAt

ProjectResumed
├── projectId
├── cycleId
└── occurredAt

ProjectStopped
├── projectId
├── cycleId (nullable)
└── occurredAt

ProjectCompleted
├── projectId
├── cycleId
└── occurredAt

ProjectReopened
├── projectId
├── previousCycleId
├── newCycleId
├── newCycleNumber
└── occurredAt

ProjectUpdated
├── projectId
├── title
├── description
└── occurredAt

ProjectCycleIntendedOutcomeSet
├── projectId
├── cycleId
└── occurredAt
```

Domain Event payload không cần chứa toàn bộ aggregate state.

Payload chỉ cần đủ để handler thực hiện concern của mình.

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
├── intended_outcome (nullable)
├── started_at
├── ended_at (nullable)
└── end_reason (nullable: STOPPED | COMPLETED)

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

| Invariant                                            | Enforced By                                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Lifecycle transition eligibility                     | Project.method()                                                                   |
| Single current Cycle                                 | Project Aggregate                                                                  |
| Cycle starts only on ACTIVE                          | Project.start() / Project.reopen()                                                 |
| Cycle ends only on STOP / COMPLETE                   | Project.stop() / Project.complete()                                                |
| Closed Cycle outcome is immutable                    | ProjectCycle.setOutcome()                                                          |
| Outcome only settable on open Cycle                  | Project.setIntendedOutcome()                                                       |
| Revision conflict detection                          | ProjectMutationService (preflight) + ProjectRepository.update() (compare-and-swap) |
| NOT_STARTED → STOPPED creates no Cycle               | Project.stop()                                                                     |
| Delete only allowed when cycles.length == 0          | Project.canBeDeleted()                                                             |
| Delete race-safe against concurrent lifecycle action | ProjectRepository.deletePermanently() (compare-and-swap)                           |

---

## 16. Open Design Decisions

Các quyết định sau chưa được chốt và thuộc Infrastructure / Technical Design:

- Schema chi tiết của từng table.
- Index strategy cho lifecycle transition queries.
- Archive behavior (delete đã được baseline: hard delete, chỉ khi `cycles.length == 0` — xem mục 5.8, 8.2, 10, 11).
- Cách persist Lifecycle Transition — cùng transaction với Project hay separate.
- Timeline / history read model nếu cần trong tương lai.
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
Domain Events → 9 events
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
