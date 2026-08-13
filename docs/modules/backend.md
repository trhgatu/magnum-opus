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

Reflection hiện có Journal và Mood. `ReflectionModule` import/export hai composition root con.

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

`GetMenusHandler` nhận principal permissions, `PrismaMenuReader` đọc menu, rồi kết quả chỉ chứa item caller được phép nhìn thấy. Ẩn menu ở UI không thay thế backend guard; đây chỉ là usability layer.

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
