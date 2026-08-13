# 06 — Shared kernel và infrastructure

## Hai khái niệm khác nhau

`shared` là abstraction trung lập mà domain/application của nhiều context được phép dùng. `infrastructure` là implementation kỹ thuật ở vòng ngoài. Không gộp hai thứ thành “common”.

```text
shared/domain         không biết framework
shared/application    chỉ định nghĩa contract/port
infrastructure        biết Prisma, Redis, BullMQ, Socket.IO, Pino…
```

## Shared domain

### Result

`Result<T, E>` biểu diễn success hoặc failure có kiểu:

```ts
return updated
  ? Result.ok(mood)
  : Result.fail(new MoodRevisionConflictException(...));
```

`Result.ok` đặt value và hai flags `isSuccess=true`, `isFailure=false`. `Result.fail` đặt error theo chiều ngược lại. `unwrap()` trả value hoặc ném chính domain error; controller dùng cách này để global filter xử lý thống nhất.

Result hữu ích ở application boundary vì failure nghiệp vụ là expected branch, không phải crash kỹ thuật. Aggregate vẫn có thể throw domain exception để constructor/method không tạo state invalid.

### AggregateRoot

AggregateRoot giữ private domain-event array. `addDomainEvent` chỉ cho subclass gọi. `getDomainEvents` trả copy để caller không mutate internal array. `pullDomainEvents` copy rồi clear, phù hợp pattern persist aggregate + outbox events một lần.

Aggregate không tự publish event; publish là infrastructure concern. Điều này giữ domain test hoàn toàn in-memory.

### DomainEvent

Mỗi event có `eventId=randomUUID()` và `occurredOn=new Date()` khi tạo. Event subclass thêm business payload. ID nhận diện event delivery; timestamp nói sự kiện nghiệp vụ xảy ra lúc nào, không phải lúc consumer xử lý.

### DomainException

DomainException extends Error nhưng mang `ErrorDefinition` từ contracts và `args`. `name` được đặt theo subclass để log rõ. `captureStackTrace` bỏ constructor base khỏi stack khi runtime hỗ trợ.

Domain message dành cho log/developer; `translationKey` và safe error mapping dành cho user.

## Shared application

| Port/contract  | Ý nghĩa                                               |
| -------------- | ----------------------------------------------------- |
| `CachePort`    | get/set/delete/invalidate mà application có thể cần.  |
| `JobQueuePort` | Enqueue job mà không biết BullMQ.                     |
| `RealtimePort` | Emit event tới user mà không biết Socket.IO.          |
| `JwtPayload`   | Vocabulary identity nội bộ giữa auth/guards/realtime. |

Port được đặt shared chỉ khi nhiều contexts thực sự cần cùng semantics. Context-specific port vẫn ở context, ví dụ `PasswordResetTokenStore` thuộc IAM Auth.

## Database

`PrismaModule` cung cấp singleton `PrismaService`. Service kết nối khi module init và disconnect khi shutdown. Schema/migration/seed nằm ở `packages/database`, còn context-specific Prisma query nằm trong adapter của context.

Tách như vậy có hai lợi ích. Database package sở hữu physical schema và migration chain; bounded context sở hữu cách map/query dữ liệu của mình. Không tạo một “god repository” dùng chung.

Mapper chống việc Prisma generated type lan vào domain:

```text
Prisma row ──toDomain──► Aggregate
Aggregate ──toPersistence──► Prisma data
```

Mapper test phải kiểm tra enum mapping, nullable field, timestamps và revision. Explicit enum mapping tốt hơn cast vì compiler buộc xử lý giá trị mới.

## Redis và cache

Redis có nhiều vai trò: session store, application cache và BullMQ backing store. Dùng cùng server không có nghĩa cùng namespace. Key prefix và TTL phải phân biệt để cleanup feature này không xóa dữ liệu feature khác.

`RedisService` là adapter dùng chung; cache interceptors hỗ trợ cache/invalidation ở HTTP layer khi phù hợp. Không cache response chứa dữ liệu user-private nếu key không bao gồm identity.

`redis-connection.ts` chuẩn hóa `REDIS_URL` hoặc host/port config. Connection test bảo vệ các biến thể local/production.

## Queue

`QueueModule` bind `JobQueuePort` với `BullMqQueueAdapter`. `bull-connection.ts` tạo BullMQ connection options từ config. Adapter test đảm bảo job name, payload và options đi đúng queue.

API process chỉ enqueue. Worker process consume. Queue payload phải là plain serializable object và chứa correlation ID nếu job bắt nguồn từ request, để log nối được từ HTTP sang background processing.

Queue dùng hai loại contract ở hai cấp khác nhau. `JobQueuePort` là cơ chế enqueue dùng chung; còn tên job và payload thuộc feature, ví dụ `users/application/jobs/user-email.jobs.ts`. Consumer BullMQ là inbound adapter nên nằm trong `users/infrastructure/processors`. Sau khi kiểm tra dữ liệu không tin cậy từ Redis, processor gọi application service; application service gọi outbound port như `UserMailer`; adapter Nodemailer nằm ở infrastructure. Nhờ vậy đổi BullMQ hoặc nhà cung cấp email không kéo transport SDK vào application.

## Transactional outbox

Outbox gồm:

| File                          | Vai trò                                               |
| ----------------------------- | ----------------------------------------------------- |
| `outbox.module.ts`            | Wire publisher/router và lifecycle.                   |
| `outbox-event.mapper.ts`      | Chuyển database row thành internal envelope.          |
| `outbox-event.router.ts`      | Route stable event type tới consumer.                 |
| `outbox-publisher.service.ts` | Poll, claim, publish, retry, stale recovery, cleanup. |

Publisher chạy interval ngắn nhưng không được overlap chính nó. Claim phải atomic để nhiều replicas không cùng publish một row. Stale claim recovery chỉ trả event bị kẹt quá timeout về trạng thái retryable; nó không reset event đang được process bình thường.

Event type có version, ví dụ `iam.user.registered.v1`. Thay đổi payload phá compatibility cần type/version mới hoặc consumer backward-compatible.

## Realtime

`RealtimeGateway` là Socket.IO transport boundary. Handshake dùng `AccessTokenValidator`, rồi socket join room theo user ID. `RealtimeService` implement `RealtimePort` để context emit mà không import gateway.

Không dùng socket ID làm user identity lâu dài: reconnect sinh socket ID mới. Room theo stable user ID cho phép nhiều tab/thiết bị cùng nhận event.

## Observability

`RequestContextInterceptor` nhận hoặc tạo `x-correlation-id`, đặt vào async context và log method/path/status/duration/user. Correlation context đi vào outbox/job khi có thể.

Pino logger config redact authorization, cookie và secret fields. Structured JSON logs phù hợp ingest hơn chuỗi tự ghép. Error log phải có context nhưng không chứa password/token.

`HttpMetricsInterceptor` đo request count/duration theo route/status, không dùng raw URL có UUID làm label vì cardinality sẽ tăng vô hạn. `MetricsController` được bảo vệ bằng metrics token.

## Health

Liveness trả lời “process có sống?”. Readiness trả lời “process có sẵn sàng nhận traffic?”. Readiness kiểm tra dependency thiết yếu như database/Redis. Một dependency optional không nên làm toàn API unready nếu feature có degradation policy rõ.

## Storage

Storage adapter local ghi vào `public/uploads`; S3 adapter dùng region/bucket/endpoint/credentials từ environment. Controller nhận multipart upload, còn URL construction/provider selection nằm adapter/config.

Production Compose mount upload volume cho local mode. Khi scale nhiều API replicas, chuyển sang object storage hoặc shared volume; local disk riêng từng container làm request đọc ảnh ngẫu nhiên 404.

## Presentation dùng chung

`presentation/` ở root server là HTTP mechanism dùng cho nhiều contexts:

| Nhóm           | Ví dụ                                                 |
| -------------- | ----------------------------------------------------- |
| Decorators     | `@GetUser`, `@Permissions`, `@AuditLog`, client info. |
| Guards         | JWT access, JWT refresh, permissions.                 |
| Filters        | DomainException → API error response.                 |
| Interceptors   | request context và audit log.                         |
| DTO/presenters | pagination contract dùng chung.                       |

Đây không phải shared domain. Nó được phép biết NestJS vì bản thân nó thuộc delivery layer.

## Infrastructure checklist

Trước khi thêm adapter mới, trả lời:

1. Port thuộc context hay shared application?
2. Business code có đang import SDK cụ thể không?
3. Timeout/retry/idempotency nằm ở đâu?
4. Secret có qua environment contract và bị redact khỏi log không?
5. Healthcheck có thực sự phản ánh readiness không?
6. Multi-replica có tạo race, duplicate delivery hoặc local-state inconsistency không?
7. Test có chứng minh mapping/error branch thay vì chỉ constructor chạy không?
