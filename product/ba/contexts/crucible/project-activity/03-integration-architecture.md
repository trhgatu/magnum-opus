# Crucible — Project Activity Evidence — Integration Architecture

> **Status:** Draft / Discovery
>
> **Domain:** Crucible / Projects / Activity Evidence
>
> **Purpose:** Mô tả kiến trúc hiện thực hành vi của `02-evidence-behavior-analysis.md`: cách các module được chia và giao tiếp, cách hoạt động được chép từ nhiều nguồn vào một sổ chung, và thiết kế database — sao cho thêm nguồn mới (bên ngoài hoặc nội bộ) không phải thiết kế lại.

---

## 1. Design Goals

| Mục tiêu                       | Nghĩa là                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Project không bị đụng tới      | Module `project` hiện có chỉ thêm việc phát một event; không biết capability này tồn tại (DEC-PAC-001)           |
| Thêm nguồn = thêm một adapter  | Thêm WakaTime, Habit... không đổi sổ, không đổi logic Cycle (DEC-PAC-010, DO-PAC-004)                            |
| Logic chỉ đọc dữ liệu của mình | Gắn vào Cycle, chỗ lệch, snapshot không gọi API bên ngoài (DEC-PAC-008)                                          |
| Lỗi của nguồn bị cô lập        | Một nguồn lỗi chỉ ảnh hưởng chính nó                                                                             |
| Không cần worker               | Production (Render free) chỉ chạy server API; mọi việc chép xảy ra theo yêu cầu hoặc theo event trong tiến trình |

---

## 2. Module Structure

### 2.1. Three Tiers

```text
┌──────────────────────────────────────────────────────────────────────┐
│ crucible/project-activity       Ý NGHĨA với Project                  │
│   Project Source (mối nối) · Attribution · Divergence · Snapshot     │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ đọc sổ qua reader port
┌──────────────────────────────▼───────────────────────────────────────┐
│ activity                        SỔ HOẠT ĐỘNG — không biết Project     │
│   Feed · Activity Event · Sync service                               │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ gọi qua ActivityProviderPort
┌──────────────────────────────▼───────────────────────────────────────┐
│ integrations/<provider>         NÓI CHUYỆN VỚI BÊN NGOÀI             │
│   github/ (Phase 1) · wakatime/ (sau)                                │
│   Connection · API client · Activity provider adapter                │
└──────────────────────────────────────────────────────────────────────┘
```

Phụ thuộc chỉ đi **một chiều**, từ trên xuống (DEC-PAC-013):

- `integrations` không biết sổ được dùng để làm gì.
- `activity` không biết Project, Cycle hay lời tuyên bố. Module khác (vd Goal) có thể dùng sổ theo cùng cách Project dùng.
- `crucible/project-activity` không biết GitHub tồn tại.

### 2.2. Communication Rules

| Hướng                                           | Cách                                                                       | Tiền lệ trong repository                          |
| ----------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- |
| Module → module khác: "có chuyện vừa xảy ra"    | Event qua **outbox**, chỉ mang định danh và thời điểm, không mang nội dung | Journal/Memory → Reflection Timeline              |
| Module → dữ liệu của module khác: "cho tôi đọc" | **Reader port**: interface ở phía cần đọc, implementation ở infrastructure | Chronicle đọc Project, Habit, Journal qua readers |
| Tầng trên → tầng dưới trong capability này      | Port được định nghĩa ở `shared/application/activity`                       |                                                   |
| Cấm                                             | Import domain hoặc application của module khác                             | `architecture/dependency-rules.spec.ts`           |

### 2.3. Shared Provider Contract

Hợp đồng giữa `activity` và mọi nguồn bên ngoài, đặt ở `shared/application/activity/activity-provider.port.ts` để hai tầng không import lẫn nhau:

```ts
export interface ActivityProviderPort {
  readonly provider: ActivityProvider; // 'GITHUB' | (sau) 'WAKATIME'
  readonly capabilities: {
    /** null: đọc lại lịch sử bao xa cũng được (GitHub).
     *  số ngày: chỉ đọc được bấy nhiêu ngày gần nhất (vd WakaTime free) — cần chép định kỳ. */
    historyWindowDays: number | null;
  };

  /** Tài nguyên người dùng có thể gắn (repo, WakaTime project...). */
  listResources(ownerId: string): Promise<ActivityResource[]>;

  /** Sự kiện của một tài nguyên trong khoảng [from, to). Đã lọc: chỉ của người dùng,
   *  bỏ bot, bỏ merge commit; đã tính khóa chống trùng. */
  fetchEvents(
    ownerId: string,
    externalResourceId: string,
    from: Date,
    to: Date,
  ): Promise<ActivityEventInput[]>;
}

export interface ActivityEventInput {
  kind: ActivityKind;
  occurredAt: Date;
  quantity: number; // 1, hoặc số giây với CODING_TIME
  dedupeKey: string;
}
```

Nguồn nội bộ (Habit...) **không** dùng hợp đồng này: chúng đẩy event qua outbox (§8.2).

---

## 3. Code Structure

### 3.1. Server

```text
apps/server/src/
├── shared/application/activity/
│   └── activity-provider.port.ts           hợp đồng chung (§2.3)
│
└── contexts/
    ├── integrations/
    │   └── github/
    │       ├── domain/
    │       │   ├── github-connection.aggregate.ts     login, hạn dùng, trạng thái
    │       │   ├── value-objects/github-token.value-object.ts
    │       │   ├── exceptions/                         token sai, hết hạn, chưa kết nối
    │       │   └── ports/github-connection.repository.ts
    │       ├── application/
    │       │   ├── commands/   connect-github, disconnect-github (+ handlers)
    │       │   ├── queries/    get-github-connection (không bao giờ trả token), list-github-repos
    │       │   └── ports/      token-cipher.port.ts, github-api.port.ts
    │       ├── infrastructure/
    │       │   ├── aes-gcm-token.cipher.ts             mã hóa token
    │       │   ├── github-rest.client.ts               repo, nhánh, commit, PR, phân trang
    │       │   ├── github-activity.provider.ts         implements ActivityProviderPort
    │       │   ├── mappers/ · repositories/
    │       ├── presentation/   controller /integrations/github, dtos, presenter
    │       └── github-integration.module.ts
    │
    ├── activity/
    │   ├── domain/
    │   │   ├── activity-feed.aggregate.ts              tài nguyên + đã chép từ/tới đâu
    │   │   ├── value-objects/activity-event.value-object.ts
    │   │   ├── enums/                                  ActivityProvider, ActivityKind, FeedStatus
    │   │   └── ports/  activity-feed.repository.ts, activity-event.repository.ts
    │   ├── application/
    │   │   ├── services/activity-sync.service.ts       chép theo yêu cầu (§5)
    │   │   ├── commands/   ensure-activity-feed        tạo/lấy feed cho một tài nguyên
    │   │   └── ports/      activity-ledger.reader.port.ts (cho tầng trên đọc sổ)
    │   ├── infrastructure/
    │   │   ├── provider-registry.ts                    provider → ActivityProviderPort
    │   │   ├── repositories/ (event: upsert theo khóa chống trùng)
    │   │   └── readers/prisma-activity-ledger.reader.ts
    │   └── activity.module.ts
    │
    └── crucible/
        ├── project/                                    ✅ đã có — thêm phát event (§6)
        └── project-activity/
            ├── domain/
            │   ├── project-activity-source.entity.ts   mối nối Project ↔ Feed
            │   ├── value-objects/declaration-timeline.value-object.ts
            │   ├── services/                           hàm thuần, không DB/HTTP
            │   │   ├── attribute-events.ts             event → (Cycle, ACTIVE|PAUSED) | ngoài Cycle
            │   │   ├── summarize-cycle-activity.ts     theo ngày → metrics + dải ngày
            │   │   └── detect-divergence.ts            D1–D4
            │   ├── cycle-activity-snapshot.entity.ts
            │   └── ports/  project-activity-source.repository.ts, cycle-activity-snapshot.repository.ts
            ├── application/
            │   ├── commands/        link-activity-source, unlink-activity-source, capture-cycle-snapshot
            │   ├── queries/         get-project-activity, get-cycle-snapshots
            │   ├── event-handlers/  project-cycle-closed.handler.ts
            │   └── ports/           project-declaration.reader.port.ts, account-time-zone.reader.port.ts
            ├── infrastructure/
            │   └── readers/ prisma-project-declaration.reader.ts, prisma-account-time-zone.reader.ts
            ├── presentation/        controller /projects/:id/activity..., dtos, presenter
            └── project-activity.module.ts
```

Ba file trong `crucible/project-activity/domain/services/` là phần logic chính của capability. Chúng là hàm thuần: nhận sự kiện từ sổ, dòng thời gian tuyên bố và múi giờ; trả về metrics, dải ngày và chỗ lệch. Toàn bộ hành vi của `02` §3–§4 được kiểm thử ở đây mà không cần DB hay GitHub.

### 3.2. Contracts and Client

```text
packages/contracts/src/
├── integration/github.ts            GitHubConnectionResponse, GitHubRepoResponse
└── project-activity/activity.ts     ProjectActivityResponse, ActivitySourceResponse,
                                     DivergenceResponse, CycleActivitySnapshotResponse

apps/client/
├── app/(protected)/settings/page.tsx            thêm mục "Kết nối GitHub"
└── features/
    ├── integrations/github/                     api, actions, components (connection field)
    └── project/
        ├── api/project-activity.ts
        ├── actions/project-activity.ts          gắn / gỡ nguồn
        └── components/
            ├── project-activity-sources.tsx     chọn repository
            ├── project-cycle-activity.tsx       dải ngày + metrics
            ├── project-divergence-notice.tsx    lời nhắc D2 + dòng thông tin D1/D3/D4
            └── project-closed-cycles.tsx        ✅ đã có — thêm snapshot
```

---

## 4. Request Flows

### 4.1. Viewing a Project

```text
GET /projects/:id/activity
  │
  ├─ 1. Đọc các Project Source của Project → danh sách feed
  ├─ 2. Với mỗi feed đã cũ (lần chép trước > 10 phút): chép (§5)
  ├─ 3. Đọc dòng thời gian tuyên bố (lifecycle transitions + cycles)
  ├─ 4. Đọc sổ: event của các feed trong khoảng cần xét
  │       (từ lúc Cycle hiện tại mở, hoặc từ Cycle cuối khép / lúc gắn nguồn cho D3/D4)
  ├─ 5. Domain services: attribute → summarize → detect divergence
  └─ 6. Trả về: metrics, dải ngày, chỗ lệch, trạng thái từng nguồn
```

Bước 2 có thể chạy song song giữa các feed; một feed lỗi không chặn các feed khác.

### 4.2. Closing a Cycle

```text
PATCH /projects/:id/complete  (module project, như hiện tại)
  └─ cùng transaction: khép Cycle + ghi transition + ghi OutboxEvent "ProjectCycleClosed"
  └─ trả kết quả cho người dùng NGAY

OutboxPublisher → ProjectCycleClosedHandler (project-activity)
  ├─ chép lần cuối các feed của Project (giới hạn thời gian; lỗi thì bỏ qua)
  ├─ tính Cycle Activity từ sổ cho Cycle vừa khép
  └─ lưu CycleActivitySnapshot (kèm dataUntil)
```

### 4.3. Linking a Repository

```text
PUT /projects/:id/activity/sources  { provider: GITHUB, externalResourceId }
  ├─ activity: lấy hoặc tạo feed cho (owner, GITHUB, repoId)
  ├─ project-activity: tạo Project Source (Project ↔ feed)
  └─ chép bù nếu sổ của feed chưa phủ tới lúc Cycle hiện tại mở (§5.3)
```

---

## 5. Sync Design

### 5.1. Triggers

| Khi nào                               | Vì sao                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Mở trang Project, feed cũ hơn 10 phút | Giữ dữ liệu đủ tươi mà không gọi API mỗi lần (ASM-PAC-006)                                                               |
| Khép Cycle                            | Snapshot có dữ liệu mới nhất có thể                                                                                      |
| Gắn nguồn                             | Chép bù phần lịch sử cần cho Cycle đang mở                                                                               |
| _(sau)_ Định kỳ                       | Chỉ cho nguồn có `historyWindowDays` (vd WakaTime free); chạy bằng cron bên ngoài gọi endpoint nội bộ khi chưa có worker |

### 5.2. Incremental Window

Mỗi feed nhớ sổ đã đầy đủ **từ** đâu (`coveredFrom`) và **tới** đâu (`syncedUntil`):

```text
Lần chép trước: syncedUntil = 12/10 17:05
Lần này hỏi nguồn khoảng:  [12/10 17:05 − khoảng đệm,  bây giờ)
Ghi sổ bằng upsert theo khóa chống trùng
Thành công → syncedUntil = bây giờ
```

Khoảng đệm (vd 2 ngày) bắt các commit viết từ trước nhưng push muộn (`02` §6.13). Chép chồng lên phần cũ là vô hại nhờ khóa chống trùng.

### 5.3. Backfill

Khi một Project cần dữ liệu từ thời điểm `T` (lúc Cycle hiện tại mở, hoặc lúc nguồn được gắn) mà `coveredFrom > T`, feed được chép thêm khoảng `[T, coveredFrom)` rồi cập nhật `coveredFrom = T`.

Nguồn có `historyWindowDays` chỉ chép bù được trong giới hạn của nó; phần ngoài giới hạn được coi là không có dữ liệu và được hiển thị như vậy.

### 5.4. Concurrency

Hai lần chép cùng một feed có thể chạy cùng lúc (hai tab). Không cần khóa: cả hai cùng upsert theo khóa chống trùng, kết quả giống nhau. `syncedUntil` chỉ được dời về phía trước.

### 5.5. Failure Handling

| Lỗi                        | Feed                                  | Ảnh hưởng                                      |
| -------------------------- | ------------------------------------- | ---------------------------------------------- |
| Token hết hạn / bị thu hồi | `DISCONNECTED`, ghi lỗi               | Không chép được; sổ cũ vẫn dùng; D1 không tính |
| Mất quyền / repo bị xóa    | `ERROR`, ghi lỗi                      | Như trên                                       |
| Bị giới hạn request        | Giữ `ACTIVE`, chờ tới lúc được mở lại | Dùng sổ như hiện có                            |
| Lỗi mạng / 5xx             | Giữ `ACTIVE`, ghi lỗi                 | Thử lại ở lần mở trang sau                     |

---

## 6. Event Flow from the Project Module

Thay đổi duy nhất trong module `project`:

- Khi lưu Stop/Complete, repository ghi thêm một `OutboxEvent` loại `ProjectCycleClosed { projectId, cycleId, ownerId, closedAt }` trong **cùng transaction**.
- `outbox-event.router` chuyển event này tới `ProjectCycleClosedHandler` của `project-activity`.

Module `project` không biết ai nhận event. Cùng cơ chế với Journal (`JournalEntrySealed`) và Memory (`MemoryCreated`) hiện tại.

---

## 7. Database Design

### 7.1. Overview

```text
                        ┌──────────────────────────┐
                        │ users              ✅    │
                        │  time_zone               │
                        └───┬──────────────┬───────┘
                            │1             │1
                 ┌──────────┘              └──────────────┐
                 │1                                       │n
┌────────────────▼─────────────┐          ┌───────────────▼──────────────┐
│ integration_connections 🆕   │◄ ─ ─ ─ ─ │ activity_feeds 🆕            │
│ token đã mã hóa              │ tìm theo │ 1 tài nguyên = 1 feed        │
│ 1 dòng / người / provider    │ owner +  │ đã chép từ / tới đâu         │
└──────────────────────────────┘ provider └───────┬──────────────▲───────┘
                                                  │1             │1
                                                  │n             │n
                                  ┌───────────────▼─────┐  ┌─────┴────────────────────────┐
                                  │ activity_events 🆕  │  │ project_activity_sources 🆕  │
                                  │ sổ hoạt động        │  │ mối nối Project ↔ Feed       │
                                  └─────────────────────┘  └─────┬────────────────────────┘
                                                                 │n
┌──────────────────────────────────┐      ┌────────────────────▼────────┐
│ project_lifecycle_transitions ✅ │ n  1 │ projects               ✅   │
│ dòng thời gian tuyên bố          ├─────►│                             │
└──────────────────────────────────┘      └────────────┬────────────────┘
                                                       │1
                                                       │n
                                          ┌────────────▼────────────────┐
                                          │ project_cycles          ✅  │
                                          └────────────┬────────────────┘
                                                       │1
                                                       │0..1
                                          ┌────────────▼────────────────┐
                                          │ cycle_activity_snapshots 🆕 │
                                          └─────────────────────────────┘
```

| Nhóm                           | Bảng                                                   | Module sở hữu               |
| ------------------------------ | ------------------------------------------------------ | --------------------------- |
| Kết nối bên ngoài              | `integration_connections`                              | `integrations/github`       |
| Hoạt động (không biết Project) | `activity_feeds`, `activity_events`                    | `activity`                  |
| Ý nghĩa với Project            | `project_activity_sources`, `cycle_activity_snapshots` | `crucible/project-activity` |

### 7.2. `integration_connections`

```prisma
model IntegrationConnection {
  id                String              @id @default(uuid())
  ownerId           String              @map("owner_id")
  provider          IntegrationProvider
  externalAccountId String              @map("external_account_id")
  displayName       String              @map("display_name")
  credentials       String              @db.Text
  status            ConnectionStatus    @default(ACTIVE)
  expiresAt         DateTime?           @map("expires_at")
  lastVerifiedAt    DateTime            @map("last_verified_at")
  createdAt         DateTime            @default(now()) @map("created_at")
  updatedAt         DateTime            @updatedAt @map("updated_at")

  owner User @relation(fields: [ownerId], references: [id], onDelete: Cascade)

  @@unique([ownerId, provider])
  @@map("integration_connections")
}
```

| Cột                 | Ý nghĩa                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `provider`          | Bên nào. Tên chung — thêm WakaTime là thêm một giá trị enum, không thêm bảng                          |
| `externalAccountId` | Id tài khoản bên ngoài (số, không đổi). Dùng để nhận ra commit của người dùng                         |
| `displayName`       | Tên hiển thị (vd `trhgatu`)                                                                           |
| `credentials`       | Thông tin xác thực **đã mã hóa** (AES-256-GCM). Cấu trúc bên trong do adapter của provider định nghĩa |
| `status`            | `ACTIVE` · `EXPIRED` · `REVOKED`                                                                      |
| `expiresAt`         | Ngày token hết hạn (lấy từ provider khi kiểm tra) — để báo trước                                      |
| `lastVerifiedAt`    | Lần cuối xác nhận thông tin xác thực còn dùng được                                                    |

- Một kết nối cho mỗi người mỗi provider (`@@unique([ownerId, provider])`).
- Ngắt kết nối xóa dòng này; **không** xóa feed hay sổ.
- `credentials` không bao giờ được trả về client. Khóa mã hóa ở biến môi trường riêng `INTEGRATION_ENCRYPTION_KEY`, không dùng chung secret khác.

### 7.3. `activity_feeds`

```prisma
model ActivityFeed {
  id                 String           @id @default(uuid())
  ownerId            String           @map("owner_id")
  provider           ActivityProvider
  externalResourceId String           @map("external_resource_id")
  displayName        String           @map("display_name")
  coveredFrom        DateTime?        @map("covered_from")
  syncedUntil        DateTime?        @map("synced_until")
  lastSyncAt         DateTime?        @map("last_sync_at")
  status             FeedStatus       @default(ACTIVE)
  lastError          String?          @map("last_error")
  createdAt          DateTime         @default(now()) @map("created_at")
  updatedAt          DateTime         @updatedAt @map("updated_at")

  owner          User                    @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  events         ActivityEvent[]
  projectSources ProjectActivitySource[]

  @@unique([ownerId, provider, externalResourceId])
  @@map("activity_feeds")
}
```

| Cột                  | Ý nghĩa                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `externalResourceId` | Định danh **ổn định** của tài nguyên (repository id số, habit id...) — đổi tên không mất liên kết |
| `displayName`        | Tên hiển thị, cập nhật ở mỗi lần chép (vd `trhgatu/magnum-opus`)                                  |
| `coveredFrom`        | Sổ đầy đủ **từ** thời điểm này (§5.3)                                                             |
| `syncedUntil`        | Sổ đầy đủ **tới** thời điểm này (§5.2)                                                            |
| `lastSyncAt`         | Lần chép gần nhất — quyết định có cần chép lại khi mở trang không                                 |
| `status`             | `ACTIVE` · `ERROR` · `DISCONNECTED`                                                               |
| `lastError`          | Lỗi gần nhất, hiển thị cho người dùng                                                             |

- Một feed cho mỗi tài nguyên (`@@unique([ownerId, provider, externalResourceId])`), dù bao nhiêu Project dùng (DEC-PAC-011).
- Không có khóa ngoại tới `integration_connections`: feed tìm kết nối theo `ownerId + provider`. Ngắt rồi kết nối lại tạo dòng kết nối mới mà feed không bị đứt.
- Feed không bị xóa khi không còn Project nào dùng: gắn lại là dùng tiếp sổ cũ.

### 7.4. `activity_events`

```prisma
model ActivityEvent {
  id         String       @id @default(uuid())
  feedId     String       @map("feed_id")
  kind       ActivityKind
  occurredAt DateTime     @map("occurred_at")
  quantity   Int          @default(1)
  dedupeKey  String       @map("dedupe_key")
  ingestedAt DateTime     @default(now()) @map("ingested_at")

  feed ActivityFeed @relation(fields: [feedId], references: [id], onDelete: Cascade)

  @@unique([feedId, kind, dedupeKey])
  @@index([feedId, occurredAt])
  @@map("activity_events")
}
```

| Cột          | Ý nghĩa                                                    |
| ------------ | ---------------------------------------------------------- |
| `kind`       | Loại sự kiện (`02` §2.1)                                   |
| `occurredAt` | Thời điểm sự kiện, lưu UTC; chia ngày theo múi giờ khi đọc |
| `quantity`   | 1 với Phase 1; số giây với `CODING_TIME` (WakaTime)        |
| `dedupeKey`  | Khóa chống trùng (`02` §2.5) — mã băm, không phải nội dung |
| `ingestedAt` | Lúc dòng được ghi — phục vụ soi lỗi                        |

- `@@unique([feedId, kind, dedupeKey])` + upsert: chép lại bao nhiêu lần cũng một dòng.
- `@@index([feedId, occurredAt])`: phục vụ truy vấn duy nhất của sổ — "event của feed X trong khoảng [A, B)".
- Dòng không bao giờ bị sửa. Không có message, code, tên nhánh, file hay nội dung PR.

### 7.5. `project_activity_sources`

```prisma
model ProjectActivitySource {
  projectId String   @map("project_id")
  feedId    String   @map("feed_id")
  linkedAt  DateTime @default(now()) @map("linked_at")

  project Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  feed    ActivityFeed @relation(fields: [feedId], references: [id], onDelete: Restrict)

  @@id([projectId, feedId])
  @@index([feedId])
  @@map("project_activity_sources")
}
```

| Cột                   | Ý nghĩa                                                      |
| --------------------- | ------------------------------------------------------------ |
| `projectId`, `feedId` | "Project X dùng feed Y" — cặp khóa chính, không gắn trùng    |
| `linkedAt`            | Lúc gắn. D4 chỉ tính hoạt động sau thời điểm này (`02` §4.3) |

- Xóa Project chỉ xóa mối nối (`Cascade`); feed và sổ còn nguyên.
- Không thể xóa feed khi còn Project dùng (`Restrict`) — sổ không thể bị mất ngầm.

### 7.6. `cycle_activity_snapshots`

```prisma
model CycleActivitySnapshot {
  id               String    @id @default(uuid())
  cycleId          String    @unique @map("cycle_id")
  activeDays       Int       @map("active_days")
  pausedActiveDays Int       @map("paused_active_days")
  commits          Int
  prsOpened        Int       @map("prs_opened")
  prsMerged        Int       @map("prs_merged")
  lastActivityAt   DateTime? @map("last_activity_at")
  days             Json
  sources          Json
  timeZone         String    @map("time_zone")
  dataUntil        DateTime  @map("data_until")
  capturedAt       DateTime  @default(now()) @map("captured_at")

  cycle ProjectCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)

  @@map("cycle_activity_snapshots")
}
```

| Cột                                 | Ý nghĩa                                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| `activeDays`, `pausedActiveDays`    | `02` §3.4                                                                               |
| `commits`, `prsOpened`, `prsMerged` | Đếm trong Cycle                                                                         |
| `days`                              | Dải ngày: `[{ "date": "2026-10-08", "state": "PAUSED_ACTIVE" }, ...]` (`02` §3.3)       |
| `sources`                           | Tên các nguồn tại lúc chụp: `[{ "provider": "GITHUB", "name": "trhgatu/magnum-opus" }]` |
| `timeZone`                          | Múi giờ đã dùng để chia ngày                                                            |
| `dataUntil`                         | Sổ đầy đủ tới thời điểm nào khi chụp (`02` §5.1)                                        |

- Mỗi Cycle tối đa một snapshot (`cycleId` unique). Dòng không bao giờ bị sửa.
- Con số được **chép cứng**, không tính lại từ sổ khi xem — đây là cách snapshot bất biến trước mọi thay đổi về sau (`02` §5.3).
- `days`, `sources` là JSON vì chỉ dùng để hiển thị, không được truy vấn vào bên trong.
- Các cột metric gắn với các loại sự kiện Phase 1. Khi thêm loại sự kiện có metric riêng (vd giờ code), thêm cột tương ứng; snapshot cũ giữ giá trị rỗng cho cột mới.

### 7.7. Enums

```prisma
enum IntegrationProvider { GITHUB }
enum ConnectionStatus    { ACTIVE EXPIRED REVOKED }

enum ActivityProvider    { GITHUB }
enum FeedStatus          { ACTIVE ERROR DISCONNECTED }
enum ActivityKind        { COMMIT_AUTHORED PR_OPENED PR_MERGED }
```

`IntegrationProvider` và `ActivityProvider` được tách vì không trùng nhau: nguồn nội bộ (Habit) là một `ActivityProvider` nhưng không cần kết nối.

| Mở rộng  | `IntegrationProvider` | `ActivityProvider` | `ActivityKind`     |
| -------- | --------------------- | ------------------ | ------------------ |
| WakaTime | `WAKATIME`            | `WAKATIME`         | `CODING_TIME`      |
| Habit    | –                     | `HABIT`            | `HABIT_CHECKED_IN` |

### 7.8. Existing Tables Used

| Bảng                            | Dùng để                      | Truy cập                                  |
| ------------------------------- | ---------------------------- | ----------------------------------------- |
| `project_lifecycle_transitions` | Dựng dòng thời gian tuyên bố | Đọc qua reader                            |
| `project_cycles`                | Phạm vi Cycle                | Đọc qua reader                            |
| `users`                         | Múi giờ tài khoản            | Đọc qua reader                            |
| `outbox_events`                 | Chở `ProjectCycleClosed`     | Ghi thêm một loại event; không đổi schema |

### 7.9. Volume

Với một người dùng: `activity_events` vài nghìn dòng mỗi năm; các bảng còn lại vài chục dòng. Không cần phân vùng hay dọn dẹp; index `(feed_id, occurred_at)` là đủ.

### 7.10. Migration

- **Chỉ thêm** 5 bảng và các enum; không sửa bảng hiện có.
- An toàn với quy trình hiện tại (CI migrate production trước, rồi gọi deploy hook Render): server cũ chạy được với schema mới.

---

## 8. Extension Points

### 8.1. New External Provider (vd WakaTime)

1. Thêm giá trị enum (`IntegrationProvider`, `ActivityProvider`, `ActivityKind`).
2. Thêm module `integrations/wakatime`: kết nối + adapter implements `ActivityProviderPort`.
3. Đăng ký adapter vào provider registry của `activity`.
4. Nếu `historyWindowDays` có giá trị: thêm trigger chép định kỳ (§5.1).
5. Thêm metric hiển thị cho loại sự kiện mới.

Không đổi: sổ, sync service, Attribution, Divergence, Snapshot logic.

### 8.2. Internal Evidence Module (vd Habit)

```text
Habit check-in ──(cùng transaction)──► OutboxEvent "HabitCheckedIn" { habitId, date }
                                               │
                     activity: có feed HABIT cho habitId? → ghi 1 dòng vào sổ
Habit bỏ check-in ──► OutboxEvent "HabitCheckInRemoved" → xóa dòng tương ứng
```

- Feed `HABIT` được tạo khi người dùng gắn Habit vào Project; chép bù qua reader đọc check-in của Habit.
- Module Habit cần phát hai event trên (hiện chưa có).
- Đây là trường hợp duy nhất một dòng sổ có thể bị xóa: nguồn nội bộ là nguồn sự thật và người dùng đã rút lại hành động.

### 8.3. Reflection Links (Journal, Memory)

Không đi vào sổ hoạt động (`01` §11.4). Hướng thiết kế dự kiến (phân tích riêng khi tới lượt):

```prisma
model ProjectReflectionLink {
  projectId String
  kind      ReflectionKind   // JOURNAL_ENTRY | MEMORY
  refId     String
  linkedAt  DateTime
  @@id([projectId, kind, refId])
}
```

- Mối nối do phía Project giữ; Journal và Memory không biết Project tồn tại.
- Tiêu đề/ngày được đọc qua reader khi hiển thị; mục bị đưa vào thùng rác hoặc xóa được báo qua outbox.
- Hiển thị theo Cycle bằng cùng logic thời gian.

### 8.4. Webhooks

Một endpoint nhận webhook (vd GitHub push) ghi vào sổ qua cùng đường upsert như sync. Không đổi gì khác.

### 8.5. Other Consumers (vd Goal)

Thêm bảng nối riêng (vd `GoalActivitySource`) trỏ vào cùng feed. Sổ không đổi.

---

## 9. Security

- Token chỉ đọc, giới hạn repository do người dùng chọn khi tạo token.
- Mã hóa AES-256-GCM khi lưu; khóa riêng `INTEGRATION_ENCRYPTION_KEY`.
- Không endpoint nào trả thông tin xác thực; response chỉ có tên hiển thị, trạng thái, ngày hết hạn.
- Mọi truy vấn feed/sổ đều lọc theo `ownerId`.
- Không ghi bất cứ thứ gì lên provider.

---

## 10. Technical Questions to Verify

| ID        | Câu hỏi                                                                                                                     |
| --------- | --------------------------------------------------------------------------------------------------------------------------- |
| TQ-PAC-01 | Bộ lọc `since`/`until` của GitHub "List commits" dựa trên committer date hay author date? (`02` §6.14)                      |
| TQ-PAC-02 | Cách hiệu quả nhất để đọc commit trên mọi nhánh trong giới hạn request (liệt kê nhánh + commit theo nhánh, hay cách khác)?  |
| TQ-PAC-03 | Fine-grained token: quyền tối thiểu cần cho commit + pull request trên repository private; cách đọc ngày hết hạn của token. |
| TQ-PAC-04 | Nhận diện tác giả commit bằng id tài khoản GitHub có đủ không, hay cần thêm danh sách email đã xác minh?                    |
| TQ-PAC-05 | Thời gian tối đa cho lần chép cuối khi khép Cycle (§4.2) để không giữ outbox handler quá lâu.                               |
