# 03 — Backend modules

## Cách đọc một backend module

Một module đầy đủ có hình dạng sau:

```text
feature/
├─ domain/
│  ├─ feature.aggregate.ts hoặc feature.entity.ts
│  ├─ enums/
│  ├─ value-objects/
│  ├─ exceptions/
│  ├─ events/
│  └─ ports/*.repository.ts
├─ application/
│  ├─ commands/
│  │  ├─ *.command.ts
│  │  └─ handlers/*.handler.ts
│  ├─ queries/
│  │  ├─ *.query.ts
│  │  └─ handlers/*.handler.ts
│  ├─ services/
│  └─ ports/*.port.ts
├─ infrastructure/
│  ├─ repositories/
│  ├─ mappers/
│  ├─ readers/
│  ├─ stores/
│  └─ adapters/
├─ presentation/
│  ├─ controllers/
│  ├─ dtos/
│  └─ presenters/
└─ feature.module.ts
```

Không phải feature nào cũng cần mọi folder. Dashboard chỉ là read model nên không cần aggregate. Storage chỉ là capability adapter nên không cần command bus. Folder trống để “trông enterprise” không tạo ra architecture.

### Ý nghĩa suffix

| Suffix                        | Trách nhiệm                                                  |
| ----------------------------- | ------------------------------------------------------------ |
| `.aggregate.ts`               | Giữ state và invariant, là transaction boundary nghiệp vụ.   |
| `.entity.ts`                  | Object có identity nhưng không nhất thiết là aggregate root. |
| `.value-object.ts`            | Giá trị so sánh bằng nội dung, tự validate khi tạo.          |
| `.command.ts`                 | Dữ liệu mô tả ý định thay đổi. Không chứa logic.             |
| `.query.ts`                   | Dữ liệu mô tả yêu cầu đọc. Không chứa logic.                 |
| `.handler.ts`                 | Điều phối một use case.                                      |
| `.repository.ts` trong domain | Port persistence của aggregate.                              |
| `.port.ts` trong application  | Outbound capability không phải aggregate repository.         |
| `.reader.ts`                  | Read model tối ưu cho query/report.                          |
| `.mapper.ts`                  | Chuyển persistence record ↔ domain object.                   |
| `.dto.ts`                     | Validate/transform input tại transport boundary.             |
| `.presenter.ts`               | Chuyển output nội bộ thành public response contract.         |
| `.module.ts`                  | Composition root của feature.                                |
| `.spec.ts`                    | Unit/architecture test nằm cạnh source.                      |

## IAM

IAM gồm `auth`, `users` và `roles`. `IamModule` chỉ import/export ba module con; nó là namespace composition root, không phải nơi đặt logic dùng chung.

### Auth

Auth sở hữu login lifecycle và session lifecycle.

Commands hiện tại gồm register, login, refresh, logout, logout all, revoke một session, revoke các session khác, request/confirm password reset và request/confirm email verification. Query hiện tại đọc active sessions.

Luồng login:

```text
AuthController.login
→ LoginCommand
→ LoginCommandHandler
→ UserRepository tìm user
→ PasswordHasher.compare
→ kiểm tra active/email policy
→ tạo access + refresh JWT
→ RedisSessionStore lưu session theo jti
→ controller đặt refresh cookie
→ trả access token + principal contract
```

Access token ngắn hạn dùng cho request. Refresh token gắn với session `jti` trong Redis, vì vậy server có thể revoke từng thiết bị thay vì chỉ đợi JWT hết hạn. `tokenVersion` của user hỗ trợ revoke hàng loạt khi thay đổi nhạy cảm.

Các file quan trọng:

| Vị trí                                     | Ý nghĩa                                              |
| ------------------------------------------ | ---------------------------------------------------- |
| `auth.controller.ts`                       | HTTP routes và cookie behavior.                      |
| `jwt.strategy.ts`                          | Xác minh access token cho Passport.                  |
| `jwt-refresh.strategy.ts`                  | Xác minh refresh token ở endpoint refresh/logout.    |
| `redis-session.store.ts`                   | Session persistence + consume/rotate semantics.      |
| `access-token-validator.service.ts`        | Validation dùng lại bởi HTTP và realtime handshake.  |
| `session-policy.ts`                        | Quy tắc thuần domain cho session.                    |
| `prisma-password-reset-token.store.ts`     | One-time reset token đã hash, expiry và consumption. |
| `prisma-email-verification-token.store.ts` | One-time verification token.                         |

Password reset luôn trả response trung tính ở bước request để không làm lộ email có tồn tại. Token thô chỉ gửi ra email; database lưu hash. Confirm phải consume token atomically để cùng token không dùng hai lần.

### Users

Users sở hữu user aggregate, profile, trạng thái active/deleted, role membership và password hashing port.

HTTP surface:

| Endpoint                      | Use case                                     |
| ----------------------------- | -------------------------------------------- |
| `GET /users/me`               | Principal hiện tại và effective permissions. |
| `GET /users`                  | Danh sách phân trang cho admin.              |
| `POST /users`                 | Admin tạo user.                              |
| `PATCH /users/:id/activate`   | Kích hoạt.                                   |
| `PATCH /users/:id/deactivate` | Vô hiệu hóa và phát side effects.            |
| `PUT /users/:id`              | Cập nhật profile/roles/status theo contract. |
| `DELETE /users/:id`           | Soft-delete theo rule của module.            |

`USER_REPOSITORY` thuộc domain vì nó load/save user aggregate. `PASSWORD_HASHER` thuộc application ports vì hashing là capability kỹ thuật được use case cần. `BcryptPasswordHasher` là adapter.

UsersModule chỉ đăng ký BullMQ producer. Consumer được tách thành ba trách nhiệm: `UserQueueProcessor` ở infrastructure nhận và kiểm tra BullMQ job; `UserEmailJobService` ở application chọn use case email; `NodemailerUserMailer` implement `UserMailer` port bằng SMTP. `WorkerModule` wire ba phần này, còn API module không đăng ký consumer. Nhờ vậy gửi email không tranh event loop với request và application không phụ thuộc BullMQ/Nodemailer.

Khi update chính user đang đăng nhập, backend có thể tăng token version nếu thay đổi ảnh hưởng identity/authorization. Access token cũ bị revoke; client refresh lấy token mới. Flow 401 → refresh → retry là hợp lệ về security, nhưng UI đã được tối ưu để chủ động đồng bộ session khi có thể.

### Roles và permissions

Roles quản lý role và tập permissions. Permission constants nằm trong `@repo/contracts` để backend guard và admin route dùng cùng vocabulary.

```text
Controller @Permissions(PERMISSIONS.ROLE.UPDATE)
→ PermissionsGuard đọc metadata
→ access token cho biết user identity
→ UserRepository đọc effective roles/permissions
→ chỉ cho request đi tiếp khi permission tồn tại
```

Một user có thể có nhiều role. Effective permission là hợp của permissions từ tất cả role. Multi-role tránh tạo role tổ hợp như `EDITOR_AND_BILLING_AND_SUPPORT`; đổi lại cần quy tắc rõ khi role bị xóa và cache authorization bị invalidated.

`PrismaRoleRepository` chịu transaction khi cập nhật tập permission. Handler không biết join-table Prisma được tên gì.

## Reflection

Reflection hiện có Journal, Mood và Memory. `ReflectionModule` import ba composition root con; mỗi module tự đăng ký controller, handlers và adapter của mình.

### Journal

Journal là aggregate chính của vertical slice phản tư.

State machine:

```text
DRAFT ──seal──► SEALED
  ▲               │
  └────reopen─────┘

DRAFT/SEALED ──trash──► TRASHED
                            │
                         restore
                            ▼
                  stateBeforeTrash
```

`stateBeforeTrash` nhớ entry từng là Draft hay Sealed để restore đúng. `trashedAt` phục vụ UI/retention. Permanent delete chỉ hợp lệ khi đang Trashed. `revision` tăng khi aggregate thay đổi và repository update bằng `WHERE revision = expectedRevision`.

Application commands: create, update, seal, reopen, trash, restore và permanent delete. Queries: get one theo owner và list theo owner/search/state/pagination.

`JournalEntryMutationService` gom phần orchestration lặp lại của lifecycle command: owner-scoped load, expected revision, mutation callback và optimistic update. Nó là application service vì điều phối repository + aggregate; rule transition vẫn ở aggregate.

Repository luôn scope bằng `ownerId`. Không load bằng ID rồi mới so owner ở controller, vì cách đó dễ tạo enumeration leak và dễ quên check ở endpoint mới.

### Mood

Mood là aggregate phụ có quan hệ một-một với Journal entry. Nó không có `ownerId`; ownership được truy ngược qua Journal để không có hai nguồn sự thật.

Fields:

| Field       | Rule                                             |
| ----------- | ------------------------------------------------ |
| `label`     | Một trong vocabulary Mood v1.                    |
| `intensity` | `null` hoặc số nguyên 1–5.                       |
| `note`      | Trim; rỗng thành `null`; tối đa 500 code points. |
| `revision`  | Độc lập Journal revision.                        |

GET trả `200` khi có Mood, `204` khi Journal thuộc owner nhưng chưa có Mood, và `404` khi Journal không tồn tại/không thuộc owner. PUT tạo khi chưa có Mood và không gửi revision; update bắt buộc expected revision. DELETE bắt buộc revision.

SetMoodHandler đọc Journal trước vì hai rule thuộc application boundary: caller phải sở hữu Journal và Journal phải còn Draft. Sau đó handler create/update Mood aggregate. Unique constraint trên `journal_entry_id` là lớp bảo vệ cuối cho race tạo đồng thời; `P2002` được đổi thành revision conflict.

### Memory

Memory là aggregate độc lập dùng để giữ một trải nghiệm đã được người dùng chủ động chọn lọc. Khác Mood, Memory có `ownerId` riêng vì nó tiếp tục tồn tại ngay cả khi Journal nguồn bị xóa.

`occurredOn` và `occurredOnPrecision` cùng biểu diễn thời gian của trải nghiệm. Ngày đầy đủ giữ nguyên. Tháng được chuẩn hóa về ngày đầu tháng và năm được chuẩn hóa về ngày đầu năm để PostgreSQL vẫn có thể sort bằng một cột `DATE`; presenter chỉ hiển thị đúng precision nên ngày chuẩn hóa không bị trình bày như một ngày người dùng thật sự cung cấp. `UNKNOWN` bắt buộc đi cùng `occurredOn = null`.

Memory lifecycle đơn giản hơn Journal:

```text
ACTIVE ──trash──► TRASHED
   ▲                 │
   └────restore──────┘
```

Update, trash, restore và permanent delete đều dùng `expectedRevision`. `MemoryMutationService` thực hiện owner-scoped load, so revision, gọi domain mutation rồi update bằng compare-and-swap. Permanent delete được tách riêng vì repository phải đồng thời kiểm tra owner, state và revision.

Quan hệ Journal không làm Memory application import Journal domain. `CreateMemoryHandler` gọi `MemorySourceJournalReader`, một application port do Memory sở hữu. Prisma adapter truy vấn Journal theo cả `journalEntryId` và `ownerId`, sau đó chỉ trả vocabulary `AVAILABLE`, `TRASHED` hoặc `NOT_FOUND`. Foreign key dùng `ON DELETE SET NULL`, vì Journal nguồn chỉ là provenance chứ không sở hữu Memory.

Database migration bổ sung check constraint cho revision dương, lifecycle khớp `trashedAt`, ngày khớp precision và title/content không rỗng sau khi trim. Những invariant này bảo vệ dữ liệu kể cả khi write không đi qua NestJS.

Vòng closeout v1 áp dụng cùng nguyên tắc phòng thủ cho Journal và Mood bằng một migration mới, không sửa migration lịch sử. `journal_entries.revision` và `moods.revision` phải luôn từ 1 trở lên; Journal title và Mood note không được lưu dưới dạng chuỗi chỉ chứa khoảng trắng. Giới hạn 200 ký tự của Journal title cũng nằm trong aggregate, thay vì chỉ dựa vào HTTP DTO. Nhờ đó controller, command nội bộ, seed hoặc write adapter tương lai đều đi qua cùng một business rule.

### Timeline

Timeline là read model nội bộ ghi lại các mốc quan trọng của Journal/Memory theo thời gian, phục vụ `GET /reflection/timeline` (phân trang, owner-scoped).

`JournalEntry.seal()` phát `JournalEntrySealedEvent`; `Memory.create()` phát `MemoryCreatedEvent`. Cả hai đi qua đúng luồng Outbox có sẵn (xem chương 06): domain event được ghi vào `outboxEvent` **trong cùng transaction** với việc sửa aggregate, `OutboxPublisherService` claim atomic rồi gọi `OutboxEventRouter.dispatch()`. Router route 2 event này tới `TimelineWriter` (`contexts/reflection/timeline`), ghi 1 dòng vào `reflection_timeline_entries`.

`Mood` không phát event nào — nó là ngữ cảnh gắn theo Journal entry, không phải một khoảnh khắc độc lập trên dòng thời gian. Comment giải thích điều này nằm ngay tại `mood.aggregate.ts`.

Hai điểm kỹ thuật đáng nhớ khi mở rộng pattern này cho aggregate khác:

1. Repository chỉ được ghi outbox event khi thao tác ghi aggregate **thực sự thành công** — `PrismaJournalEntryRepository.update()` kiểm `result.count === 1` (tránh trường hợp thua optimistic-lock race nhưng vẫn để lại dấu vết trên Timeline).
2. `@@unique([entryType, sourceId])` trên `ReflectionTimelineEntry` là lớp idempotency thứ hai, phòng khi Outbox Publisher retry cùng event — `PrismaTimelineWriter` bắt `P2002` và coi như đã ghi, không throw.

**Read side.** Timeline vẫn là module reader-only — không có aggregate/domain layer, giống `analytics/dashboard`. `PrismaTimelineReader.findAllForOwner()` lấy trang dữ liệu từ `reflection_timeline_entries` rồi tra ngược title theo lô (2 query `findMany` theo `entryType`, không phải N+1 theo dòng) sang `journalEntry`/`memory`. Cả truy vấn Timeline lẫn truy vấn nguồn đều lọc `ownerId`; lớp phòng thủ thứ hai này ngăn lộ metadata nếu projection bị backfill sai. Vì Timeline không tự dọn theo vòng đời nguồn, một dòng có thể trỏ tới bản ghi đã bị xóa vĩnh viễn — response phân biệt rõ bằng `sourceExists: false` và `title: null` thay vì để lộ title cũ hoặc ném lỗi. `GetTimelineHandler` chỉ dịch `page` sang `skip/take` rồi gọi thẳng reader qua `TIMELINE_READER` port.

### Forge / Habit, Habit Check-in và Routine runtime

Forge được đăng ký vào API qua `ForgeModule`, hiện gom `HabitModule`, `HabitCheckInModule` và `RoutineModule`. Habit có các endpoint `POST /habits`, `GET /habits`, `GET /habits/:id`, `PUT /habits/:id`, `PATCH /habits/:id/archive` và `PATCH /habits/:id/restore`. Check-in có `PUT /habits/:habitId/check-ins/today`, `DELETE /habits/:habitId/check-ins/today`, `GET /habits/:habitId/check-ins/today` và `GET /habits/:habitId/check-ins?from=...&to=...`. Endpoint đọc `today` trả cả calendar date theo `User.timeZone` và record hiện tại để client không phải suy đoán ngày nghiệp vụ. Tất cả đều đi qua `JwtAuthGuard`, lấy owner từ access token và không nhận owner trong payload.

Check-in hôm nay không dùng ngày của API process. Handler đọc Habit owner-scoped qua `OwnedHabitReader`, đọc `User.timeZone` qua `UserTimeZoneReader`, lấy instant qua `Clock`, rồi `HabitCheckInDate` chuyển instant đó thành `YYYY-MM-DD`. Repository thử insert; nếu Prisma trả `P2002`, nó chỉ coi là idempotent-success sau khi query lại và tìm thấy đúng record `(habitId, ownerId, date)`. Cách xác minh bằng dữ liệu này không phụ thuộc shape `meta.target` vốn đã thay đổi giữa các Prisma adapter.

`HabitMutationService` dùng chung flow owner-scoped load → preflight revision check → domain mutation → compare-and-swap update; nó không chứa business rule thay aggregate. Repository ghi bằng mapper tường minh, lookup luôn dùng `(id, ownerId)`, còn update dùng `(id, ownerId, expectedRevision)`. E2E kiểm tra cả ownership isolation, stale revision, list filter, archive và restore trên PostgreSQL thật.

Routine có các endpoint create/list/detail/update title/archive/restore và membership add/remove/move-up/move-down dưới `/routines`. Create, list và mutation response trả `habitIds` theo thứ tự; detail response trả ordered Habit summaries gồm `id`, `title`, `isActive` và `order`. Không response nào lộ `ownerId`. List hỗ trợ owner-scoped search, status, sort và pagination. Mọi mutation nhận `expectedRevision`; stale revision trả conflict thay vì ghi đè thay đổi mới hơn.

Routine aggregate chỉ giữ ordered Habit IDs. Nó không import Habit domain. Khi thêm membership, application đọc `{ id, isActive }` qua `RoutineHabitReader`, một consumer-owned port, để kiểm tra Habit cùng owner và còn active. `PrismaRoutineRepository` compare-and-swap Routine trước rồi mới thay membership trong cùng transaction. Nếu revision đã stale, transaction dừng mà không xóa hoặc ghi lại thứ tự cũ.

Detail query đi qua `RoutineReader`, không qua aggregate repository. Prisma lọc đồng thời `(routineId, ownerId)`, join `RoutineHabit → Habit` trong một query và không lọc Habit archived. Presenter chuyển `Date` thành ISO string và explicit-map public contract. Unit tests bao phủ domain, mapper, readers, repository, handlers, presenter và controller; PostgreSQL E2E kiểm tra authentication, UUID validation, ownership isolation, lifecycle nhiều-nhiều có thứ tự, revision protection và archived Habit vẫn hiện đúng vị trí trong detail response.

`HabitCheckIn` đã có E2E cho idempotency, ownership, archive guard, history và undo. Habit cùng Habit Check-in đã có client; Routine hiện mới hoàn tất backend V1. Routine client và trang Today vẫn chưa được triển khai.

Data contract chủ động bảo vệ tenant ở database. `HabitCheckIn` tham chiếu Habit bằng khóa ghép `(habitId, ownerId)`; `RoutineHabit` cũng tham chiếu cả Routine và Habit bằng owner chung. Một record nối chéo dữ liệu hai user vì thế bị foreign key từ chối ngay cả khi application guard bị viết sai. Habit và Routine là quan hệ nhiều-nhiều: khóa chính `(routineId, habitId)` ngăn membership trùng, còn `(routineId, order)` unique giữ thứ tự không trùng trong từng Routine. Check-in thuộc Habit nên được dùng chung ở mọi Routine chứa Habit đó.

`User.timeZone` là IANA timezone dùng để diễn giải “hôm nay” và ISO weekday. Giá trị mặc định `UTC` giúp dữ liệu cũ migrate an toàn, nhưng application phải đọc timezone của owner qua port thay vì gọi `new Date()` rồi coi ngày của server là ngày của người dùng. Domain/application tests phải dùng clock giả để kiểm tra biên chuyển ngày.

Migration Forge còn thêm check constraint cho title đã trim, revision dương, weekday thuộc `1..7`, shape `DAILY/WEEKLY` và order dương. Domain vẫn validate trước để trả lỗi có nghĩa; database là lớp bảo vệ cuối cho write path khác NestJS.

## Notifications

Notification entity thuộc một user, có type, title, content, read state và timestamps. Context hỗ trợ list, mark one as read, mark all as read và create từ event/use case nội bộ. `CreateNotificationService` là application API duy nhất cho create; outbox router gọi service này trực tiếp, không đi vòng qua `CommandBus`.

`createIfAbsent` insert notification và `NotificationCreatedEvent` trong cùng transaction. ID của event nguồn được tái sử dụng làm notification ID, nên unique constraint cung cấp idempotency atomic khi publisher retry. `NotificationCreatedEvent` tách persistence khỏi realtime delivery; event chỉ được publish sau khi record notification đã tồn tại.

Mark-one gọi `findByIdForOwner(notificationId, userId)`, chạy `notification.markAsRead()` rồi update. Không load bằng ID toàn cục rồi trả `403`, vì cách đó làm lộ ID có tồn tại nhưng thuộc người khác; cả missing và foreign-owned đều trở thành `404`. UI không tin socket là database: khi nhận event, nó invalidate API cache, còn API vẫn là nguồn sự thật.

## Audit

Audit là append-oriented record về hành động quan trọng. `AuditLogInterceptor` đọc metadata từ `@AuditLog`, principal, client info, result/error và correlation context rồi gọi `AUDIT_WRITER`.

Read path dùng `AuditLogReader` thay vì aggregate repository vì dashboard audit là query/filter/pagination, không có aggregate behavior cần rehydrate. `PrismaAuditWriter` và `PrismaAuditLogReader` có thể tối ưu độc lập.

`AuditRetentionService` xóa theo batch dựa trên `AUDIT_RETENTION_DAYS`. Giá trị `0` tắt cleanup. Batch tránh một delete khổng lồ khóa bảng lâu.

## Analytics / Dashboard

Dashboard là read model tổng hợp users, roles, trạng thái hệ thống và số liệu cần cho admin overview. Nó không phát minh domain entity `Dashboard`.

`DashboardStatsReader` là application port; `PrismaDashboardStatsReader` thực hiện aggregate queries. Handler có thể dùng cache để tránh đếm lại ở mỗi request. Cache key/TTL là implementation concern, còn shape response nằm ở contract của use case.

## Menu

Menu trả navigation items phù hợp với permissions. Dữ liệu menu được seed trong database để có thể cấu hình hierarchy/order/icon mà không hard-code toàn bộ ở frontend.

`GetMenusQueryHandler` nhận principal permissions, `PrismaMenuReader` đọc menu, rồi kết quả chỉ chứa item caller được phép nhìn thấy. Ẩn menu ở UI không thay thế backend guard; đây chỉ là usability layer.

## Storage

Storage cung cấp một `StoragePort` với hai adapter:

| Adapter               | Khi dùng                                           |
| --------------------- | -------------------------------------------------- |
| `LocalStorageAdapter` | Development hoặc single-node có persistent volume. |
| `S3StorageAdapter`    | Production cần object storage/S3-compatible.       |

`StorageModule` chọn adapter từ environment. Controller validate file type/size và trả URL contract. Business module không nên tự import AWS SDK; nó phụ thuộc storage port.

Local upload được serve dưới `/public`; production multi-instance không nên dùng local nếu các replicas không chia sẻ volume.

## Analytics, audit và menu khác aggregate module thế nào?

Journal cần aggregate vì có state transition phức tạp. Dashboard chỉ đọc projection nên reader là đủ. Audit chủ yếu append + query nên writer/reader phù hợp hơn một aggregate giả. Kiến trúc chuẩn không có nghĩa ép mọi module vào cùng template; nó có nghĩa chọn abstraction theo behavior thật.

## Checklist thêm backend feature

1. Viết product flow và invariant trước.
2. Xác định aggregate/entity/read model thật sự cần.
3. Viết domain test cho rule và transition.
4. Định nghĩa repository/application ports tối thiểu.
5. Viết handler tests bằng fake/mock ports.
6. Viết mapper và repository tests, bao gồm ownership/race.
7. Thêm DTO, presenter, controller và error contracts.
8. Wire module bằng provider token.
9. Thêm E2E chứng minh auth, ownership, happy path và conflict.
10. Chạy architecture test, typecheck, lint, migration drift và docs verification.
