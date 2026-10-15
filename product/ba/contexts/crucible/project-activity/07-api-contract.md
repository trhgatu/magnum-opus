# Crucible — Project Activity Evidence — API Contract

> **Status:** Contract Candidate
>
> **Domain:** Crucible / Projects / Activity Evidence
>
> **Purpose:** Định nghĩa endpoint, request/response và mã lỗi của Phase 1 (GitHub), phục vụ các bề mặt sản phẩm ở `06` §6 → §10.

---

## 1. Related Documentation

| File                                           | Vai trò                                        |
| ---------------------------------------------- | ---------------------------------------------- |
| `03-integration-architecture.md`               | Module sở hữu từng endpoint, luồng đồng bộ, DB |
| `04-functional-requirements-business-rules.md` | FR/BR mà từng endpoint hiện thực               |
| `06-product-specification.md`                  | Bề mặt sản phẩm và câu chữ dùng response này   |
| `../project/07-api-contract.md`                | Quy ước API chung; endpoint Project không đổi  |

---

## 2. API Conventions

Kế thừa nguyên `../project/07-api-contract.md` §2: không versioning prefix, JWT bắt buộc (`JwtAuthGuard`), user identity lấy từ JWT, response là object trực tiếp không wrapper, hai dạng lỗi (validation của `ValidationPipe` và `DomainExceptionFilter` có `code` ổn định).

Khác biệt của capability này:

| Quy ước              | Giá trị                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Base paths           | `/integrations/github` (module `integrations/github`); `/projects/:id/activity` (module `crucible/project-activity`) |
| Revision             | **Không** dùng `expectedRevision`. Nguồn và kết nối không thuộc Project aggregate; các thao tác là idempotent        |
| Thời điểm            | ISO 8601 UTC (`2026-10-12T10:00:00.000Z`)                                                                            |
| Ngày                 | `YYYY-MM-DD`, theo múi giờ ghi trong response                                                                        |
| Định danh repository | Chuỗi chứa id số của GitHub (`"1321967504"`), không phải tên                                                         |
| Thông tin xác thực   | Chỉ xuất hiện trong request body của `PUT /integrations/github`; không bao giờ có trong response hay log             |

Module `project` hiện có **không** có endpoint mới và không có response nào thay đổi (DEC-PAC-001). Client ghép dữ liệu hoạt động với dữ liệu Project theo `projectId` / `cycleId`.

---

## 3. Response Types

Đặt ở `packages/contracts/src/integration/github.ts` và `packages/contracts/src/project-activity/activity.ts`.

### 3.1. GitHubConnectionResponse

```typescript
type GitHubConnectionStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

interface GitHubConnectionResponse {
  accountLogin: string; // "trhgatu"
  status: GitHubConnectionStatus;
  expiresAt: string | null; // null: token không hết hạn hoặc GitHub không cho biết
  lastVerifiedAt: string;
  connectedAt: string;
}
```

### 3.2. GitHubRepositoryResponse

```typescript
interface GitHubRepositoryResponse {
  externalResourceId: string; // id số của repository
  fullName: string; // "trhgatu/magnum-opus"
  isPrivate: boolean;
  pushedAt: string | null;
  usedByProjects: { id: string; title: string }[]; // Project của người dùng đang dùng repository này
}
```

### 3.3. ActivitySourceResponse

```typescript
type ActivityProvider = 'GITHUB';
type ActivitySourceStatus = 'ACTIVE' | 'ERROR' | 'DISCONNECTED';

type ActivitySourceErrorCode =
  | 'GITHUB_TOKEN_EXPIRED'
  | 'GITHUB_TOKEN_REVOKED'
  | 'GITHUB_REPOSITORY_NOT_ACCESSIBLE'
  | 'GITHUB_ACCOUNT_CHANGED'
  | 'GITHUB_NOT_CONNECTED'
  | 'GITHUB_RATE_LIMITED'
  | 'GITHUB_UNAVAILABLE';

interface ActivitySourceResponse {
  feedId: string;
  provider: ActivityProvider;
  externalResourceId: string;
  displayName: string; // "trhgatu/magnum-opus"
  status: ActivitySourceStatus;
  linkedAt: string;
  lastSyncAt: string | null;
  coveredFrom: string | null;
  syncedUntil: string | null;
  error: { code: ActivitySourceErrorCode } | null; // null khi ACTIVE và lần chép gần nhất thành công
}
```

`error.code` là mã ổn định; client chọn câu chữ theo `06` §12. Không có message kỹ thuật từ GitHub trong response.

### 3.4. ProjectActivityResponse

```typescript
type ActivityDayState =
  'ACTIVE' | 'PAUSED_ACTIVE' | 'PAUSED_IDLE' | 'IDLE' | 'NO_DATA';

interface ActivityMetrics {
  activeDays: number;
  pausedActiveDays: number;
  commits: number;
  prsOpened: number;
  prsMerged: number;
}

interface ActivityDay {
  date: string; // "YYYY-MM-DD" theo timeZone
  state: ActivityDayState;
}

interface CycleActivityResponse {
  cycleId: string;
  cycleNumber: number;
  startedAt: string;
  metrics: ActivityMetrics;
  lastActivityAt: string | null;
  days: ActivityDay[]; // từ ngày Cycle mở tới hôm nay, tăng dần
  hasMissingData: boolean; // true nếu có ít nhất một ngày NO_DATA hoặc một nguồn chưa đầy đủ
  dataUntil: string | null; // nhỏ nhất trong syncedUntil của các nguồn
}

type Divergence =
  | { kind: 'PAUSED_WITH_ACTIVITY'; activeDays: number } // D2
  | { kind: 'ACTIVE_WITHOUT_ACTIVITY'; idleDays: number } // D1
  | {
      kind: 'ACTIVITY_AFTER_CLOSE'; // D3
      closedAs: 'STOPPED' | 'COMPLETED';
      commits: number;
      otherEvents: number; // PR mở / PR merge
      lastActivityAt: string;
    }
  | { kind: 'ACTIVITY_BEFORE_START'; lastActivityAt: string }; // D4

interface ProjectActivityResponse {
  projectId: string;
  timeZone: string; // múi giờ tài khoản dùng để chia ngày
  sources: ActivitySourceResponse[]; // rỗng → client không hiển thị gì (06 §8)
  currentCycle: CycleActivityResponse | null; // null khi không có Cycle mở hoặc không có nguồn
  divergences: Divergence[]; // tối đa một mục mỗi kind; rỗng khi khớp
}
```

### 3.5. CycleActivitySnapshotResponse

```typescript
interface SnapshotSource {
  provider: ActivityProvider;
  displayName: string; // tên tại thời điểm chụp
  coveredFrom: string | null;
  dataUntil: string | null;
}

interface CycleActivitySnapshotResponse {
  cycleId: string;
  metrics: ActivityMetrics;
  lastActivityAt: string | null;
  days: ActivityDay[]; // theo timeZone của snapshot
  sources: SnapshotSource[];
  timeZone: string; // múi giờ lúc chụp
  dataUntil: string | null; // nhỏ nhất trong dataUntil của các nguồn; null nếu có nguồn chưa từng được chép
  capturedAt: string;
}
```

---

## 4. Endpoints — GitHub Connection

### 4.1. Get Connection

```
GET /integrations/github
```

#### Response

```
200 OK
GitHubConnectionResponse | null      — null khi chưa kết nối
```

#### Behavior

- Trạng thái `EXPIRED` được tính khi `expiresAt` đã qua, kể cả khi chưa gọi GitHub lại.
- Không gọi GitHub.

---

### 4.2. Connect or Replace Token

```
PUT /integrations/github
```

#### Request Body

```typescript
interface ConnectGitHubDto {
  token: string; // required
  confirmAccountChange?: boolean; // required = true khi token thuộc tài khoản khác tài khoản đang kết nối
}
```

#### Response

```
200 OK
GitHubConnectionResponse
```

#### Error Cases

| Status | Code                                | Khi                                                                                                        |
| ------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 400    | (validation)                        | Thiếu `token` hoặc sai kiểu                                                                                |
| 400    | `GITHUB_TOKEN_INVALID`              | GitHub từ chối token                                                                                       |
| 400    | `GITHUB_TOKEN_INSUFFICIENT_SCOPE`   | Token không đọc được nội dung repository hoặc pull request                                                 |
| 409    | `GITHUB_ACCOUNT_CHANGE_UNCONFIRMED` | Token thuộc tài khoản khác và thiếu `confirmAccountChange: true`; `args`: `{ currentAccount, newAccount }` |
| 502    | `GITHUB_UNAVAILABLE`                | Không kiểm tra được token với GitHub                                                                       |
| 401    | —                                   | Unauthorized                                                                                               |

#### Behavior

- Token được kiểm tra với GitHub trước; lỗi → không lưu gì, kết nối cũ (nếu có) giữ nguyên.
- Cùng tài khoản: token được thay; trạng thái về `ACTIVE`; mọi feed của tài khoản này đang `DISCONNECTED` vì `GITHUB_NOT_CONNECTED` trở về `ACTIVE` và tiếp tục được chép.
- Khác tài khoản, đã xác nhận: kết nối mới thay kết nối cũ; feed của tài khoản cũ chuyển `DISCONNECTED` (BR-PAC-008).
- Token không bao giờ được ghi log hay trả về.

---

### 4.3. Disconnect

```
DELETE /integrations/github
```

#### Response

```
204 No Content
```

#### Behavior

- Xóa thông tin xác thực. Feed, sổ, snapshot giữ nguyên (BR-PAC-007).
- Mọi feed GitHub của tài khoản này chuyển `DISCONNECTED` với `error.code = GITHUB_NOT_CONNECTED`, trong cùng thao tác. Danh sách nguồn không bao giờ hiển thị `ACTIVE` cho một feed không còn kết nối.
- Kết nối lại **cùng tài khoản** (§4.2) đưa các feed này về `ACTIVE`.
- Idempotent: chưa kết nối vẫn trả 204.

---

### 4.4. List Repositories

```
GET /integrations/github/repositories?search=<string>
```

#### Query Parameters

```text
search: string, optional — lọc theo tên, không phân biệt hoa thường
```

#### Response

```
200 OK
GitHubRepositoryListResponse
```

```typescript
interface GitHubRepositoryListResponse {
  repositories: GitHubRepositoryResponse[]; // sắp theo pushedAt giảm dần, tối đa 100
  truncated: boolean; // true khi còn repository phù hợp nhưng không được trả về
}
```

- `search` được áp dụng **phía server** trên **toàn bộ** repository mà token đọc được (server tự đi hết các trang của GitHub), rồi mới cắt còn 100 kết quả. Repository nào cũng tìm được bằng cách gõ thêm tên.
- `truncated: true` → client hiển thị "Gõ tên repository để thu hẹp danh sách".
- Không có phân trang phía client: danh sách chỉ phục vụ ô chọn có tìm kiếm.

#### Error Cases

| Status | Code                   | Khi                                                    |
| ------ | ---------------------- | ------------------------------------------------------ |
| 409    | `GITHUB_NOT_CONNECTED` | Chưa kết nối hoặc kết nối không `ACTIVE`               |
| 429    | `GITHUB_RATE_LIMITED`  | GitHub đang giới hạn request; `args`: `{ retryAfter }` |
| 502    | `GITHUB_UNAVAILABLE`   | GitHub lỗi                                             |
| 401    | —                      | Unauthorized                                           |

---

## 5. Endpoints — Project Activity

Mọi endpoint dưới đây owner-scoped: Project không thuộc người dùng → `404 PROJECT_NOT_FOUND` (cùng mã với module Project).

### 5.1. List Sources

```
GET /projects/:id/activity/sources
```

#### Response

```
200 OK
ActivitySourceResponse[]   — theo linkedAt tăng dần
```

#### Behavior

Read-only; không chép.

---

### 5.2. Link Source

```
POST /projects/:id/activity/sources
```

#### Request Body

```typescript
interface LinkActivitySourceDto {
  provider: 'GITHUB'; // required
  externalResourceId: string; // required — id số của repository
}
```

#### Response

```
201 Created   — nguồn mới được gắn
200 OK        — repository đã là nguồn của Project này (không tạo gì thêm)
ActivitySourceResponse
```

#### Error Cases

| Status | Code                               | Khi                                               |
| ------ | ---------------------------------- | ------------------------------------------------- |
| 400    | (validation)                       | Sai provider hoặc thiếu `externalResourceId`      |
| 404    | `PROJECT_NOT_FOUND`                | Project không tồn tại hoặc không thuộc người dùng |
| 409    | `GITHUB_NOT_CONNECTED`             | Chưa kết nối hoặc kết nối không `ACTIVE`          |
| 404    | `GITHUB_REPOSITORY_NOT_ACCESSIBLE` | Kết nối không đọc được repository                 |
| 401    | —                                  | Unauthorized                                      |

#### Behavior

- Lấy hoặc tạo feed cho `(owner, GITHUB, account, externalResourceId)`; tạo mối nối Project ↔ feed.
- Nếu feed chưa phủ tới mốc cần (lúc Cycle đang mở bắt đầu; lúc Cycle cuối khép với Project đã khép; lúc gắn với Project `NOT_STARTED` — BR-PAC-016): chép bù trong giới hạn thời gian. Chép thất bại **không** làm thất bại request — nguồn vẫn được gắn, response mang `error` tương ứng (UC-PAC-004 Exception Flow B).
- Repository đang là nguồn của Project khác: vẫn gắn được (cảnh báo do client hiển thị từ `usedByProjects`).
- **Idempotent:** gửi lại cùng request (vd retry sau lỗi mạng) trả `200` với nguồn đã có, không báo lỗi và không tạo mối nối thứ hai.
- Không thay đổi Project, lifecycle hay revision.

---

### 5.3. Unlink Source

```
DELETE /projects/:id/activity/sources/:feedId
```

#### Response

```
204 No Content
```

#### Error Cases

| Status | Code                        | Khi                                               |
| ------ | --------------------------- | ------------------------------------------------- |
| 404    | `PROJECT_NOT_FOUND`         | Project không tồn tại hoặc không thuộc người dùng |
| 404    | `ACTIVITY_SOURCE_NOT_FOUND` | Feed không phải nguồn của Project này             |
| 401    | —                           | Unauthorized                                      |

#### Behavior

Chỉ xóa mối nối. Feed, sổ, snapshot giữ nguyên (BR-PAC-007).

---

### 5.4. Get Project Activity

```
GET /projects/:id/activity
```

#### Response

```
200 OK
ProjectActivityResponse
```

#### Error Cases

| Status | Code                | Khi                                               |
| ------ | ------------------- | ------------------------------------------------- |
| 404    | `PROJECT_NOT_FOUND` | Project không tồn tại hoặc không thuộc người dùng |
| 401    | —                   | Unauthorized                                      |

Lỗi của nguồn **không bao giờ** làm request thất bại; chúng nằm trong `sources[].error` (FR-PAC-014).

#### Behavior

1. Project không có nguồn → `sources: []`, `currentCycle: null`, `divergences: []`. Không chép, không đọc sổ.
2. Với mỗi nguồn có `lastSyncAt` cũ hơn 10 phút (hoặc chưa từng chép): chép tăng dần, song song giữa các nguồn, trong giới hạn thời gian chung. Quá thời gian hoặc lỗi → dùng sổ hiện có và ghi `error`.
3. Dựng dòng thời gian tuyên bố; gắn event vào Cycle; tổng hợp theo ngày trong `timeZone` hiện tại của tài khoản.
4. Xác định divergence theo BR-PAC-022 → 025. `ACTIVE_WITHOUT_ACTIVITY` không được trả khi có nguồn không `ACTIVE` hoặc khoảng cần xét chưa được chép đầy đủ.
5. Không thay đổi Project, lifecycle hay revision.

Endpoint là `GET` dù có thể ghi vào sổ: thao tác chép không thay đổi tài nguyên mà người dùng thấy ngoài việc làm dữ liệu mới hơn, và lặp lại không gây hiệu ứng khác (idempotent).

---

### 5.5. List Cycle Snapshots

```
GET /projects/:id/activity/snapshots
```

#### Response

```
200 OK
CycleActivitySnapshotResponse[]   — theo capturedAt giảm dần
```

Mảng rỗng khi không có Cycle nào có snapshot. Không phân trang.

#### Error Cases

| Status | Code                | Khi                                               |
| ------ | ------------------- | ------------------------------------------------- |
| 404    | `PROJECT_NOT_FOUND` | Project không tồn tại hoặc không thuộc người dùng |
| 401    | —                   | Unauthorized                                      |

#### Behavior

- Read-only. Client ghép với `GET /projects/:id/cycles/closed` theo `cycleId`.
- Snapshot trả về đúng như lúc chụp (BR-PAC-031).

---

### 5.6. Resume From a D2 Notice

Không có endpoint mới. Client gọi `PATCH /projects/:id/resume` hiện có (`../project/07-api-contract.md` §4.7) với `expectedRevision` hiện tại — cùng response, cùng lỗi.

---

## 6. Internal Event

Không phải HTTP endpoint; ghi lại để contract đầy đủ.

```typescript
// OutboxEvent.type = "ProjectCycleClosed"
interface ProjectCycleClosedPayload {
  projectId: string;
  cycleId: string; // luôn có giá trị
  ownerId: string;
  closedAt: string;
  endReason: 'STOPPED' | 'COMPLETED';
}
```

- Ghi bởi module `project` trong cùng transaction với transition khép Cycle; chỉ khi một Cycle thực sự khép (`03` §6).
- Xử lý bởi `project-activity`: tạo snapshot nếu chưa có (create-if-absent).

---

## 7. Error Codes

| Code                                | Status | Nguồn                                     | Ý nghĩa                                           |
| ----------------------------------- | ------ | ----------------------------------------- | ------------------------------------------------- |
| `GITHUB_TOKEN_INVALID`              | 400    | `integrations/github`                     | GitHub từ chối token                              |
| `GITHUB_TOKEN_INSUFFICIENT_SCOPE`   | 400    | `integrations/github`                     | Token thiếu quyền đọc nội dung hoặc pull request  |
| `GITHUB_ACCOUNT_CHANGE_UNCONFIRMED` | 409    | `integrations/github`                     | Đổi tài khoản chưa được xác nhận                  |
| `GITHUB_NOT_CONNECTED`              | 409    | `integrations/github`, `project-activity` | Chưa có kết nối `ACTIVE`                          |
| `GITHUB_REPOSITORY_NOT_ACCESSIBLE`  | 404    | `project-activity`                        | Kết nối không đọc được repository                 |
| `GITHUB_RATE_LIMITED`               | 429    | `integrations/github`                     | GitHub đang giới hạn request                      |
| `GITHUB_UNAVAILABLE`                | 502    | `integrations/github`                     | GitHub lỗi / không liên lạc được                  |
| `ACTIVITY_SOURCE_NOT_FOUND`         | 404    | `project-activity`                        | Feed không phải nguồn của Project                 |
| `PROJECT_NOT_FOUND`                 | 404    | (dùng lại)                                | Project không tồn tại hoặc không thuộc người dùng |

Mã trong `ActivitySourceResponse.error.code` (§3.3) là trạng thái của nguồn, không phải lỗi HTTP.

---

## 8. Endpoint Summary

| Method | Path                                     | FR                    | Mutates              |
| ------ | ---------------------------------------- | --------------------- | -------------------- |
| GET    | `/integrations/github`                   | FR-PAC-002            | —                    |
| PUT    | `/integrations/github`                   | FR-PAC-001, 002       | Connection           |
| DELETE | `/integrations/github`                   | FR-PAC-003            | Connection           |
| GET    | `/integrations/github/repositories`      | FR-PAC-004            | —                    |
| GET    | `/projects/:id/activity/sources`         | FR-PAC-007            | —                    |
| POST   | `/projects/:id/activity/sources`         | FR-PAC-005, 008       | Source, Feed, Ledger |
| DELETE | `/projects/:id/activity/sources/:feedId` | FR-PAC-006            | Source               |
| GET    | `/projects/:id/activity`                 | FR-PAC-008 → 011, 014 | Ledger (chép)        |
| GET    | `/projects/:id/activity/snapshots`       | FR-PAC-013            | —                    |
| PATCH  | `/projects/:id/resume` _(có sẵn)_        | FR-PRJ-007 (từ D2)    | Project lifecycle    |

---

## 9. Contract Decisions

| ID         | Quyết định                                                                                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CD-PAC-001 | Không endpoint hay response nào của module `project` thay đổi; snapshot có endpoint riêng và client ghép theo `cycleId`.                                                   |
| CD-PAC-002 | Nguồn và kết nối không dùng `expectedRevision`; thao tác idempotent thay cho optimistic concurrency: gắn lại nguồn đã gắn trả `200`, gỡ và ngắt kết nối lặp lại trả `204`. |
| CD-PAC-003 | Lỗi của nguồn nằm trong dữ liệu (`sources[].error`), không phải lỗi HTTP, khi người dùng chỉ xem hoạt động.                                                                |
| CD-PAC-004 | Đổi tài khoản GitHub cần xác nhận tường minh (`confirmAccountChange`) để không âm thầm ngắt các nguồn cũ.                                                                  |
| CD-PAC-005 | Repository được nhận diện bằng id số dạng chuỗi, không bằng tên.                                                                                                           |
| CD-PAC-006 | `GET /projects/:id/activity` được phép chép vào sổ; nó idempotent và không thay đổi tài nguyên nào khác.                                                                   |

---

## 10. Out of Scope for the Phase 1 API

- Endpoint liệt kê từng commit hoặc PR.
- Endpoint kích hoạt chép thủ công hay chép định kỳ.
- Webhook nhận sự kiện từ GitHub.
- Nhiều kết nối GitHub cho một người dùng.
- Endpoint cho WakaTime, Habit, Journal/Memory.

---

## 11. Next Step

BA của Phase 1 hoàn tất với tài liệu này. Bước tiếp theo là implementation theo thứ tự PR ở `03`:

```text
PR 1  DB + contracts
PR 2  integrations/github
PR 3  activity (sổ, feed, đồng bộ)
PR 4  project-activity domain (attribution, divergence)
PR 5  API + event + snapshot
PR 6  client
```
