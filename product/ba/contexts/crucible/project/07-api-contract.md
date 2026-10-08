# Projects V1 — API Contract

> **Status:** Candidate Baseline
>
> **Domain:** Crucible / Projects
>
> **Purpose:** Xác định API contract cho Projects V1 bao gồm endpoints, request/response shape, error semantics và lifecycle action endpoints, làm baseline cho implementation.

---

## 1. Related Documentation

### Domain Analysis

`06-domain-analysis.md`

Xác định:

- Project Aggregate;
- Project Cycle Entity;
- Intended Outcome Value Object;
- Domain Events;
- Lifecycle invariants.

### Product Specification

`05-product-specification.md`

Authoritative baseline cho behavior của Projects V1.

---

## 2. API Conventions

### 2.1. Base Path

```text
/projects
```

Không có versioning prefix.

Nhất quán với các module hiện tại trong codebase.

---

### 2.2. Authentication

Tất cả endpoints yêu cầu JWT authentication thông qua `JwtAuthGuard`.

User identity được extract từ JWT token, không được truyền trong request body.

---

### 2.3. HTTP Methods

```text
POST    → Create resource
GET     → Read resource
PUT     → Replace/update resource information
PATCH   → Lifecycle action
```

Lifecycle actions dùng `PATCH` với dedicated endpoint cho từng action.

---

### 2.4. Response Shape

Response là direct object, không có wrapper.

Nhất quán với HabitPresenter và MemoryPresenter trong codebase.

---

### 2.5. Revision Pattern

Mọi mutating request (update và lifecycle action) phải truyền `expectedRevision` trong request body.

Nếu `expectedRevision` không khớp với revision hiện tại của Project, server trả về conflict error.

---

### 2.6. Error Format

Có 2 shape khác nhau tùy nguồn gốc lỗi:

**Validation lỗi ở tầng DTO** (`class-validator`, ví dụ thiếu `title`, sai kiểu request body) — dùng shape mặc định của NestJS `ValidationPipe`:

```json
{
  "statusCode": 400,
  "message": "string hoặc string[]",
  "error": "Bad Request"
}
```

**Lỗi từ domain layer** (mọi `DomainException` — not found, revision conflict, invalid transition, deletion not allowed) — đi qua `DomainExceptionFilter` dùng chung của codebase, shape khác hẳn:

```json
{
  "statusCode": 409,
  "code": "INVALID_PROJECT_TRANSITION",
  "translationKey": "exceptions.project.transition.invalid",
  "message": "Cannot pause a Project in state PAUSED",
  "args": { "currentState": "PAUSED", "action": "pause" },
  "error": "InvalidProjectTransitionException",
  "timestamp": "2026-09-07T14:00:00.000Z"
}
```

`code` là giá trị ổn định, an toàn để client rẽ nhánh logic theo đó (ví dụ phân biệt `PROJECT_REVISION_CONFLICT` với `PROJECT_DELETION_NOT_ALLOWED` dù cả hai đều `statusCode: 409`). `error` là tên class exception, không phải HTTP reason phrase.

---

## 3. ProjectResponse

`ProjectResponse` là response shape được trả về bởi tất cả Project endpoints.

```typescript
interface OutcomeEntryResponse {
  // V1.1
  outcome: string;
  setAt: string; // ISO 8601
}

interface ProjectCycleResponse {
  id: string;
  cycleNumber: number;
  intendedOutcome: string | null; // entry mới nhất của outcomeHistory, giữ để tương thích V1
  outcomeHistory: OutcomeEntryResponse[]; // V1.1 — theo thứ tự được thêm vào (cũ → mới), có thể rỗng
  targetEndAt: string | null; // V1.1 — date-only "YYYY-MM-DD"
  closingNote: string | null; // V1.1 — luôn null khi Cycle đang mở
  startedAt: string; // ISO 8601
  endedAt: string | null; // ISO 8601
  endReason: 'STOPPED' | 'COMPLETED' | null;
}

interface ProjectResponse {
  id: string;
  title: string;
  description: string | null;
  lifecycleState: 'NOT_STARTED' | 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'COMPLETED';
  currentCycle: ProjectCycleResponse | null;
  revision: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

`currentCycle` là `null` khi Project đang `NOT_STARTED` hoặc chưa có Cycle.

~~Lifecycle history không thuộc V1 response shape.~~ **(V1.1)** Lịch sử các Cycle đã đóng không nằm trong `ProjectResponse` mà có endpoint riêng (§4.14). Timeline mức transition vẫn không thuộc response shape.

`intendedOutcome` được giữ lại (= outcome của entry cuối trong `outcomeHistory`) để client V1 hiện tại không vỡ khi deploy backend V1.1 trước client.

---

## 4. Endpoints

---

### 4.1. Create Project

```
POST /projects
```

#### Request Body

```typescript
interface CreateProjectDto {
  title: string; // required
  description?: string; // optional
}
```

#### Response

```
201 Created
ProjectResponse
```

#### Error Cases

| Status | Reason                        |
| ------ | ----------------------------- |
| 400    | title không hợp lệ hoặc thiếu |
| 401    | Unauthorized                  |

#### Behavior

- Project được tạo với state `NOT_STARTED`.
- Project chưa có current Cycle.
- `revision` khởi tạo là `1`.

---

### 4.2. List Projects

```
GET /projects
```

#### Query Parameters

```typescript
interface GetProjectsQueryDto {
  page?: number; // default: 1
  limit?: number; // default: 20
  search?: string; // filter by title
  state?: 'NOT_STARTED' | 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'COMPLETED';
}
```

#### Response

```
200 OK
PaginatedResponse<ProjectResponse>
```

```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

#### Error Cases

| Status | Reason       |
| ------ | ------------ |
| 401    | Unauthorized |

---

### 4.3. Get Project Detail

```
GET /projects/:id
```

#### Path Parameters

```text
id: UUID
```

#### Response

```
200 OK
ProjectResponse
```

#### Error Cases

| Status | Reason                |
| ------ | --------------------- |
| 401    | Unauthorized          |
| 404    | Project không tồn tại |

---

### 4.4. Update Project

```
PUT /projects/:id
```

#### Path Parameters

```text
id: UUID
```

#### Request Body

```typescript
interface UpdateProjectDto {
  expectedRevision: number; // required
  title: string; // required
  description?: string; // optional
}
```

#### Response

```
200 OK
ProjectResponse
```

#### Error Cases

| Status | Reason                        |
| ------ | ----------------------------- |
| 400    | title không hợp lệ hoặc thiếu |
| 401    | Unauthorized                  |
| 404    | Project không tồn tại         |
| 409    | expectedRevision conflict     |

#### Behavior

- Chỉ update `title` và `description`.
- Lifecycle state không thay đổi.
- Current Cycle không thay đổi.
- `revision` tăng sau khi update thành công.

---

### 4.5. Start Project

```
PATCH /projects/:id/start
```

#### Path Parameters

```text
id: UUID
```

#### Request Body

```typescript
interface ProjectRevisionDto {
  expectedRevision: number; // required
}
```

#### Response

```
200 OK
ProjectResponse
```

#### Error Cases

| Status | Reason                      |
| ------ | --------------------------- |
| 409    | Project không ở NOT_STARTED |
| 401    | Unauthorized                |
| 404    | Project không tồn tại       |
| 409    | expectedRevision conflict   |

#### Behavior

- Project chuyển sang `ACTIVE`.
- `Cycle 1` được tạo với `startedAt = now`.
- `revision` tăng.

---

### 4.6. Pause Project

```
PATCH /projects/:id/pause
```

#### Path Parameters

```text
id: UUID
```

#### Request Body

```typescript
interface ProjectRevisionDto {
  expectedRevision: number;
}
```

#### Response

```
200 OK
ProjectResponse
```

#### Error Cases

| Status | Reason                    |
| ------ | ------------------------- |
| 409    | Project không ở ACTIVE    |
| 401    | Unauthorized              |
| 404    | Project không tồn tại     |
| 409    | expectedRevision conflict |

#### Behavior

- Project chuyển sang `PAUSED`.
- Current Cycle vẫn mở.
- `revision` tăng.

---

### 4.7. Resume Project

```
PATCH /projects/:id/resume
```

#### Path Parameters

```text
id: UUID
```

#### Request Body

```typescript
interface ProjectRevisionDto {
  expectedRevision: number;
}
```

#### Response

```
200 OK
ProjectResponse
```

#### Error Cases

| Status | Reason                    |
| ------ | ------------------------- |
| 409    | Project không ở PAUSED    |
| 401    | Unauthorized              |
| 404    | Project không tồn tại     |
| 409    | expectedRevision conflict |

#### Behavior

- Project chuyển sang `ACTIVE`.
- Cùng Current Cycle tiếp tục.
- `revision` tăng.

---

### 4.8. Stop Project

```
PATCH /projects/:id/stop
```

#### Path Parameters

```text
id: UUID
```

#### Request Body

```typescript
interface ProjectClosingDto {
  // V1.1 — thay cho ProjectRevisionDto ở Stop/Complete
  expectedRevision: number;
  closingNote?: string | null; // V1.1 — tùy chọn, tối đa 2000 ký tự sau trim
}
```

Client V1 chỉ gửi `{ expectedRevision }` vẫn hợp lệ (`closingNote` vắng mặt = không có note).

#### Response

```
200 OK
ProjectResponse
```

#### Error Cases

| Status | Reason                                                                                                                              |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 409    | Project đang ở STOPPED hoặc COMPLETED                                                                                               |
| 400    | (V1.1) `closingNote` quá 2000 ký tự, hoặc `closingNote` không rỗng sau trim khi Project đang `NOT_STARTED` (`INVALID_CLOSING_NOTE`) |
| 401    | Unauthorized                                                                                                                        |
| 404    | Project không tồn tại                                                                                                               |
| 409    | expectedRevision conflict                                                                                                           |

#### Behavior

- Project chuyển sang `STOPPED`.
- Nếu có current Cycle: Cycle đóng với `endedAt = now`, `endReason = STOPPED`, `closingNote` = giá trị đã trim (chuỗi rỗng → `null`).
- Nếu Project đang `NOT_STARTED`: không có Cycle nào được tạo hoặc đóng; `closingNote` không rỗng → 400.
- `currentCycle` trong response là `null`.
- `revision` tăng.

---

### 4.9. Complete Project

```
PATCH /projects/:id/complete
```

#### Path Parameters

```text
id: UUID
```

#### Request Body

```typescript
interface ProjectClosingDto {
  // V1.1 — xem §4.8
  expectedRevision: number;
  closingNote?: string | null;
}
```

#### Response

```
200 OK
ProjectResponse
```

#### Error Cases

| Status | Reason                                                       |
| ------ | ------------------------------------------------------------ |
| 409    | Project không ở ACTIVE hoặc PAUSED                           |
| 400    | (V1.1) `closingNote` quá 2000 ký tự (`INVALID_CLOSING_NOTE`) |
| 401    | Unauthorized                                                 |
| 404    | Project không tồn tại                                        |
| 409    | expectedRevision conflict                                    |

#### Behavior

- Project chuyển sang `COMPLETED`.
- Current Cycle đóng với `endedAt = now`, `endReason = COMPLETED`, `closingNote` = giá trị đã trim (chuỗi rỗng → `null`).
- `currentCycle` trong response là `null`.
- `revision` tăng.

---

### 4.10. Reopen Project

```
PATCH /projects/:id/reopen
```

#### Path Parameters

```text
id: UUID
```

#### Request Body

```typescript
interface ProjectRevisionDto {
  expectedRevision: number;
}
```

#### Response

```
200 OK
ProjectResponse
```

#### Error Cases

| Status | Reason                                 |
| ------ | -------------------------------------- |
| 409    | Project không ở STOPPED hoặc COMPLETED |
| 401    | Unauthorized                           |
| 404    | Project không tồn tại                  |
| 409    | expectedRevision conflict              |

#### Behavior

- Project chuyển sang `ACTIVE`.
- New Cycle được tạo với `startedAt = now`.
- New Cycle có `intendedOutcome = null`.
- `currentCycle` trong response phản ánh new Cycle.
- `revision` tăng.

---

### 4.11. Set / Update Intended Outcome

```
PUT /projects/:id/cycle/outcome
```

#### Path Parameters

```text
id: UUID
```

#### Request Body

```typescript
interface SetIntendedOutcomeDto {
  expectedRevision: number; // required
  intendedOutcome: string; // required
}
```

#### Response

```
200 OK
ProjectResponse
```

#### Error Cases

| Status | Reason                             |
| ------ | ---------------------------------- |
| 409    | Project không ở ACTIVE hoặc PAUSED |
| 400    | intendedOutcome không hợp lệ       |
| 401    | Unauthorized                       |
| 404    | Project không tồn tại              |
| 409    | expectedRevision conflict          |

#### Behavior

- ~~Intended outcome của current Cycle được set hoặc update.~~ **(V1.1)** Một entry mới `{ outcome, setAt: now }` được thêm vào `outcomeHistory` của current Cycle; entry cũ không đổi.
- **(V1.1)** Nếu `intendedOutcome` (sau trim) trùng đúng outcome hiện tại: no-op — không thêm entry, `revision` không tăng, vẫn trả `200` với Project hiện tại.
- Lifecycle state không thay đổi.
- Current Cycle không thay đổi.
- `revision` tăng (trừ trường hợp no-op ở trên).

#### Note

Endpoint này phục vụ cả hai flow:

```text
Define: current Cycle chưa có intendedOutcome
Update: current Cycle đã có intendedOutcome
```

~~Behavior phía server là idempotent về mặt semantics — chỉ current value được lưu.~~ **(V1.1)** Server lưu toàn bộ lịch sử; idempotent chỉ theo nghĩa gửi lại đúng giá trị hiện tại không tạo entry mới. Giữ nguyên method `PUT` và path để không vỡ client V1 — về mặt HTTP đây là "đặt outcome hiện tại", lịch sử là hệ quả phía server.

Không có endpoint sửa hay xóa một entry outcome (BR-PRJ-033).

---

### 4.12. Delete Project

```
DELETE /projects/:id
```

#### Path Parameters

```text
id: UUID
```

#### Query Parameters

```typescript
interface DeleteProjectQueryDto {
  expectedRevision: number; // required
}
```

#### Response

```
204 No Content
```

#### Error Cases

| Status | Reason                                       |
| ------ | -------------------------------------------- |
| 409    | Project đã từng có ít nhất một Project Cycle |
| 401    | Unauthorized                                 |
| 404    | Project không tồn tại                        |
| 409    | expectedRevision conflict                    |

#### Behavior

- Chỉ hợp lệ khi Project chưa từng có bất kỳ Project Cycle nào (current lẫn historical) — tương đương `NOT_STARTED`, hoặc `STOPPED` đạt được từ `NOT_STARTED → Stop` mà chưa từng Start.
- Project bị xóa vĩnh viễn (hard delete).
- Không có response body.
- Không thể khôi phục sau khi xóa.

#### Note

`expectedRevision` được truyền qua query parameter thay vì request body, nhất quán với `DELETE /memories/:id` (permanent delete) hiện có trong codebase — `DELETE` trong codebase hiện tại không mang request body cho revision.

---

### 4.13. Set / Clear Target End Date (V1.1)

```
PUT /projects/:id/cycle/target-end
```

#### Path Parameters

```text
id: UUID
```

#### Request Body

```typescript
interface SetTargetEndDto {
  expectedRevision: number; // required
  targetEndAt: string | null; // required — "YYYY-MM-DD", null để xóa
}
```

#### Response

```
200 OK
ProjectResponse
```

#### Error Cases

| Status | Reason                               |
| ------ | ------------------------------------ |
| 409    | Project không ở ACTIVE hoặc PAUSED   |
| 400    | `targetEndAt` không phải ngày hợp lệ |
| 401    | Unauthorized                         |
| 404    | Project không tồn tại                |
| 409    | expectedRevision conflict            |

#### Behavior

- `targetEndAt` của current Cycle được thay bằng giá trị mới (hoặc xóa nếu `null`). Không lưu lịch sử.
- Không kiểm tra ngày phải ở tương lai.
- Giá trị trùng giá trị hiện tại → no-op, `revision` không tăng.
- Lifecycle state không thay đổi; không có transition nào được kích hoạt.

---

### 4.14. List Closed Cycles (V1.1)

```
GET /projects/:id/cycles/closed
```

#### Path Parameters

```text
id: UUID
```

#### Response

```
200 OK
ProjectCycleResponse[]   — chỉ các Cycle đã đóng, sắp xếp mới nhất trước (cycleNumber giảm dần)
```

Mảng rỗng nếu Project chưa có Cycle nào đóng. Không phân trang — số Cycle của một Project được kỳ vọng nhỏ.

#### Error Cases

| Status | Reason                |
| ------ | --------------------- |
| 401    | Unauthorized          |
| 404    | Project không tồn tại |

#### Behavior

- Read-only, owner-scoped.
- Cycle đang mở (nếu có) không có trong kết quả — nó đã nằm ở `ProjectResponse.currentCycle`.

---

## 5. Error Semantics

### 5.1. Invalid Lifecycle Transition (409)

Khi người dùng thực hiện lifecycle action không hợp lệ với current state:

```json
{
  "statusCode": 409,
  "code": "INVALID_PROJECT_TRANSITION",
  "translationKey": "exceptions.project.transition.invalid",
  "message": "Cannot pause a Project in state PAUSED",
  "args": { "currentState": "PAUSED", "action": "pause" },
  "error": "InvalidProjectTransitionException",
  "timestamp": "2026-09-07T14:00:00.000Z"
}
```

`message` phải đủ rõ để người dùng hiểu tại sao action bị từ chối.

---

### 5.2. Revision Conflict (409)

Khi `expectedRevision` không khớp:

```json
{
  "statusCode": 409,
  "code": "PROJECT_REVISION_CONFLICT",
  "translationKey": "exceptions.project.revision.conflict",
  "message": "Project \"a1b2c3d4-...\" revision conflict (expected 3)",
  "args": { "projectId": "a1b2c3d4-...", "expectedRevision": 3 },
  "error": "ProjectRevisionConflictException",
  "timestamp": "2026-09-07T14:00:00.000Z"
}
```

---

### 5.3. Project Not Found (404)

```json
{
  "statusCode": 404,
  "code": "PROJECT_NOT_FOUND",
  "translationKey": "exceptions.project.not.found",
  "message": "Project with ID \"a1b2c3d4-...\" was not found",
  "args": { "projectId": "a1b2c3d4-..." },
  "error": "ProjectNotFoundException",
  "timestamp": "2026-09-07T14:00:00.000Z"
}
```

---

## 6. Endpoint Summary

| Method   | Path                             | Action                           |
| -------- | -------------------------------- | -------------------------------- |
| `POST`   | `/projects`                      | Create Project                   |
| `GET`    | `/projects`                      | List Projects                    |
| `GET`    | `/projects/:id`                  | Get Project Detail               |
| `PUT`    | `/projects/:id`                  | Update Project                   |
| `PATCH`  | `/projects/:id/start`            | Start Project                    |
| `PATCH`  | `/projects/:id/pause`            | Pause Project                    |
| `PATCH`  | `/projects/:id/resume`           | Resume Project                   |
| `PATCH`  | `/projects/:id/stop`             | Stop Project                     |
| `PATCH`  | `/projects/:id/complete`         | Complete Project                 |
| `PATCH`  | `/projects/:id/reopen`           | Reopen Project                   |
| `PUT`    | `/projects/:id/cycle/outcome`    | Set/Update Intended Outcome      |
| `PUT`    | `/projects/:id/cycle/target-end` | Set/Clear Target End Date (V1.1) |
| `GET`    | `/projects/:id/cycles/closed`    | List Closed Cycles (V1.1)        |
| `DELETE` | `/projects/:id`                  | Delete Project                   |

---

## 7. Contract Decisions

| Decision                 | Value                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| Base path                | `/projects`                                                                                |
| Auth                     | JWT via JwtAuthGuard                                                                       |
| Versioning               | None                                                                                       |
| Response shape           | Direct object                                                                              |
| Lifecycle endpoint style | Dedicated PATCH per action                                                                 |
| Revision field           | `expectedRevision` trong request body                                                      |
| Conflict status          | 409                                                                                        |
| Pagination               | `page` + `limit` query params                                                              |
| Outcome endpoint         | `PUT /projects/:id/cycle/outcome`                                                          |
| Delete endpoint          | `DELETE /projects/:id`, chỉ hợp lệ khi Project chưa từng có Project Cycle nào, hard delete |
| Closing note (V1.1)      | Field tùy chọn `closingNote` trong body của Stop/Complete — không có endpoint riêng        |
| Target end (V1.1)        | `PUT /projects/:id/cycle/target-end`, date-only, `null` để xóa                             |
| Cycle history (V1.1)     | `GET /projects/:id/cycles/closed`, không phân trang, mới nhất trước                        |
| Backward compatibility   | V1.1 chỉ thêm field/endpoint; giữ `intendedOutcome` trong response; client V1 không vỡ     |

---

## 8. Out of Scope for V1 API

- Lifecycle history endpoint (timeline mức transition)
- ~~Closed Cycle list endpoint~~ **Đã điều chỉnh (V1.1)** — §4.14
- Project analytics endpoint
- Bulk lifecycle action
- Webhook / realtime event
- Public project endpoint
- ~~Stop reason field~~ **Đã điều chỉnh (V1.1)** — `closingNote` tự do, tùy chọn (§4.8)
- Pause reason field
- ~~Completion note field~~ **Đã điều chỉnh (V1.1)** — `closingNote` tự do, tùy chọn (§4.9)
- Reopen reason field
- Edit / delete outcome entry — **(V1.1)** cố ý không có, BR-PRJ-033

---

## 9. Next Step

Phase tiếp theo:

**Projects V1 — Database Schema**

Database Schema cần xác định:

```text
- projects table
- project_cycles table
- project_lifecycle_transitions table
- Index strategy
- Foreign key constraints
- Nullable fields
- Enum types
```

Expected progression:

```text
06. Domain Analysis        ✓ done
07. API Contract           ✓ done
        ↓
08. Database Schema
        ↓
09. Implementation
        ↓
10. Verification
```
