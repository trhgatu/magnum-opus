# 01 — Kiến trúc Magnum Opus

## Bức tranh tổng thể

Magnum Opus là modular monolith trong một Turborepo. “Monolith” nghĩa là phần lớn backend được deploy thành một API image, không có nghĩa code được phép phụ thuộc tùy ý. “Modular” nghĩa là mỗi bounded context giữ vocabulary, use case và persistence adapter của mình; dependency giữa các lớp đi vào trong domain.

```text
Browser
   │
   ├─ Admin SPA ───────────────────────────┐
   │                                      │ HTTP + access token
   └─ Client Next.js ── BFF/session ──────┤
                                          ▼
                                  NestJS API process
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
                PostgreSQL              Redis              Object storage
                    │                     │
                    │ outbox              ├─ sessions/cache
                    ▼                     └─ BullMQ
               event router                    │
                    │                           ▼
                    ├─ notification        Worker process
                    └─ realtime → Socket.IO → browser
```

API process nhận HTTP, thực thi use case ngắn và phản hồi. Worker process chỉ consume job nặng hoặc chậm. Cả hai dùng cùng server image nhưng có composition root khác nhau: `main.ts` + `AppModule` cho API, `worker.ts` + `WorkerModule` cho worker.

## Các vòng kiến trúc trong một backend feature

Một feature đầy đủ thường có bốn lớp:

```text
presentation ──► application ──► domain
      │                │            ▲
      │                └──► port ────┤
      └────────────────► infrastructure adapter
```

Mũi tên là dependency ở compile time. Domain không import NestJS, Prisma, Redis, controller hay DTO. Application có thể biết domain và interface port nhưng không biết adapter. Infrastructure biết domain để map dữ liệu. Presentation biết application để gửi command/query.

### Domain

Domain chứa điều luôn phải đúng, dù use case được gọi từ HTTP, CLI hay test. Ví dụ `JournalEntry.seal()` chỉ cho phép `DRAFT → SEALED`; `Mood.update()` chuẩn hóa note và tăng revision đúng một lần khi dữ liệu thật sự thay đổi.

Một aggregate không trả HTTP status. Khi rule bị vi phạm, nó ném `DomainException` mang error definition ổn định từ `@repo/contracts`. Presentation filter mới chuyển error đó thành response.

### Application

Application handler trả lời “để hoàn thành yêu cầu này cần làm gì theo thứ tự nào?”. Ví dụ Set Mood:

```text
tìm Journal theo entryId + ownerId
→ từ chối nếu không thuộc owner
→ từ chối nếu Journal không còn DRAFT
→ tìm Mood hiện tại
→ create hoặc update aggregate
→ persist qua MoodRepository
→ trả Result
```

Handler không viết Prisma query. Nó phụ thuộc `MoodRepository` để lưu Mood và `MoodJournalEntryReader` để kiểm tra quyền truy cập Journal. Module bind hai port này với các Prisma adapter tương ứng.

Auth cũng tuân theo cùng một nguyên tắc. Login và refresh cần phát token, nhưng handler không biết `JwtService`, JWT secret hay tên biến môi trường. Application sở hữu port `AuthTokenIssuer`; adapter `JwtAuthTokenIssuer` nằm ở infrastructure và hiện thực port bằng Nest JWT cùng `ConfigService`.

Các policy triển khai như “có bắt buộc xác minh email không?” hoặc “URL reset password bắt đầu từ domain frontend nào?” đi qua `AuthPolicy`. Việc sinh và băm token dùng một lần đi qua `OpaqueToken`. Nhờ đó test application dùng fake object nhỏ và không phải khởi tạo framework configuration hoặc crypto implementation.

```text
LoginCommandHandler ──► AuthTokenIssuer ◄── JwtAuthTokenIssuer
RegisterHandler     ──► AuthPolicy      ◄── EnvironmentAuthPolicy
Reset/verify flows  ──► OpaqueToken     ◄── CryptoOpaqueToken
```

### Khi một module cần đọc dữ liệu của module khác

Quan hệ nghiệp vụ không đồng nghĩa với việc handler được import repository hoặc aggregate của module bên cạnh. Ví dụ, khi tạo Memory từ Journal, use case chỉ cần biết Journal nguồn có dùng được hay không. Memory vì thế sở hữu một application port tên `MemorySourceJournalReader`.

```text
CreateMemoryHandler
        │
        ▼
MemorySourceJournalReader         ← contract do Memory sở hữu
        ▲
        │ implements
PrismaMemorySourceJournalReader   ← adapter biết bảng và state của Journal
```

Handler chỉ nhận `AVAILABLE`, `TRASHED` hoặc `NOT_FOUND`. Nó không import `JournalEntry`, `JournalEntryState` hay `JournalEntryRepository`. Adapter Prisma thực hiện truy vấn theo cả `journalEntryId` và `ownerId`, rồi dịch chi tiết của Journal sang ngôn ngữ mà Memory hiểu.

Cùng nguyên tắc đó, Mood sở hữu `MoodJournalEntryReader`. Reader chuyển state của Journal thành `EDITABLE`, `NOT_EDITABLE` hoặc `NOT_FOUND`; Mood application không import Journal aggregate, enum hay repository. `NOT_EDITABLE` có thể mang tên state như metadata chẩn đoán, nhưng đó chỉ là dữ liệu trả về qua contract của Mood, không phải dependency vào type của Journal.

Cách đặt boundary này có ba lợi ích. Thay đổi state nội bộ của Journal chỉ buộc adapter thay đổi; test application dùng fake reader rất nhỏ; và ownership được kiểm tra ở đúng nơi dữ liệu được đọc. Database vẫn có thể giữ foreign key giữa hai bảng vì foreign key bảo vệ dữ liệu runtime, còn port bảo vệ dependency compile time.

### Infrastructure

Infrastructure trả lời “cơ chế cụ thể để thực hiện port là gì?”. `PrismaMoodRepository` biết tên bảng, relation filter và `P2002`. `RedisSessionStore` biết key và TTL. `S3StorageAdapter` biết bucket. Những chi tiết này không được chảy ngược vào domain.

### Presentation

Presentation là lớp biên. DTO kiểm tra hình dạng dữ liệu không tin cậy; guard kiểm tra authentication/permission; controller tạo command/query; presenter chuyển object nội bộ thành public contract.

Passport strategy cũng là presentation adapter: nó nhận credential từ HTTP request, xác thực rồi tạo principal cho request context. Vì strategy là inbound adapter, nó được đặt trong `auth/presentation/strategies`; infrastructure không import helper đọc cookie từ presentation.

## Bounded contexts hiện tại

| Context         | Trách nhiệm                                                              |
| --------------- | ------------------------------------------------------------------------ |
| `iam`           | Identity, login/session, users, roles và permissions.                    |
| `reflection`    | Journal, Mood và Memory — dữ liệu phản tư riêng tư của người dùng.       |
| `notifications` | Hộp thông báo thuộc từng user và trạng thái đã đọc.                      |
| `audit`         | Nhật ký hành động quản trị và retention.                                 |
| `analytics`     | Read model thống kê dashboard; không sở hữu transaction nghiệp vụ nguồn. |
| `menu`          | Menu quản trị được lọc theo permissions.                                 |
| `storage`       | Upload abstraction, local hoặc S3-compatible.                            |

`analytics/dashboard` và `reflection/journal` là submodule bên trong context cha. Context cha chỉ gom và export module con; nó không chứa business logic trá hình.

## Shared không phải “thư mục để bỏ đồ dùng chung”

`apps/server/src/shared/domain` chỉ có primitive thật sự trung lập: `AggregateRoot`, `DomainEvent`, `DomainException`, `Result`. `shared/application` chứa contract cross-context như `CachePort`, `JobQueuePort`, `RealtimePort` và JWT payload.

Một helper chỉ được chuyển vào shared khi ít nhất hai context dùng cùng một semantics. Hai đoạn code trông giống nhau nhưng mang nghĩa nghiệp vụ khác nhau vẫn nên ở context riêng.

## Composition roots

Nest module là nơi hợp lệ để biết cả port lẫn adapter:

```ts
{
  provide: MOOD_REPOSITORY,
  useClass: PrismaMoodRepository,
}
```

Đọc từng dòng:

1. `provide` là token mà handler inject. Token giữ application tách khỏi class cụ thể.
2. `useClass` chọn adapter cho runtime hiện tại.
3. Test handler có thể thay token bằng fake repository mà không khởi động Postgres.
4. Nếu sau này đổi persistence, domain và handler không cần đổi miễn adapter mới giữ đúng interface.

`AppModule` là composition root lớn nhất của API. Nó đăng ký config, logging, metrics, database, Redis, queue, outbox và các contexts. `WorkerModule` cố ý nhỏ hơn: chỉ config, logging, BullMQ connection, queue và processor.

## Quy tắc được executable hóa

`apps/server/src/architecture/dependency-rules.spec.ts` quét source để CI từ chối các sai lệch:

| Rule                                                          | Lý do                                                |
| ------------------------------------------------------------- | ---------------------------------------------------- |
| Domain không import application/infrastructure/presentation   | Giữ business rules độc lập framework.                |
| Shared domain không nhắc Prisma/Redis/BullMQ/Socket           | Không để delivery technology lọt vào core.           |
| Application không import infrastructure/presentation          | Handler chỉ biết ports.                              |
| Auth application không import ConfigService/JwtService/crypto | Policy, token issuer và opaque token đi qua port.    |
| Infrastructure không import presentation                      | Không tạo dependency ngược giữa outer adapters.      |
| Memory/Mood application không import Journal domain           | Quan hệ Journal đi qua reader port của consumer.     |
| Domain port kết thúc `.repository.ts`                         | Repository là persistence của aggregate.             |
| Application port kết thúc `.port.ts`                          | Email, cache, queue, reader… là outbound capability. |
| Module file trùng tên thư mục                                 | Composition root có vị trí dự đoán được.             |

Architecture test không thay thế code review, nhưng biến boundary quan trọng thành một hợp đồng tự động.

## Tại sao CQRS nhưng chưa phải microservices?

CQRS ở đây tách command và query trong code để use case dễ đọc, test và thay đổi. Nó không bắt buộc database riêng hay network riêng. CommandBus/QueryBus chỉ dispatch trong cùng process. Chỉ event/job thật sự cần bất đồng bộ mới đi qua outbox hoặc BullMQ.

Đây là điểm cân bằng phù hợp: boundary rõ như hệ thống lớn, nhưng vận hành vẫn đơn giản như một deployable monolith.
