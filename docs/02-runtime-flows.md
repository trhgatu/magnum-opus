# 02 — Các luồng runtime

Chương này mô tả thứ tự code thật sự chạy. Mỗi bước đều chỉ ra lớp chịu trách nhiệm để khi debug có thể biết nên đặt breakpoint hoặc đọc log ở đâu.

## API khởi động

Entry point là `apps/server/src/main.ts`.

```text
dotenv/config
→ NestFactory.create(AppModule)
→ gắn Pino logger
→ enable shutdown hooks và trust proxy
→ cookie parser + Helmet + static assets + CORS
→ global ValidationPipe
→ DomainExceptionFilter
→ Swagger ở non-production
→ listen(PORT)
```

`dotenv/config` phải chạy trước module evaluation vì một số decorator đọc environment ngay khi file được import. `bufferLogs: true` giữ log khởi động cho tới khi Pino sẵn sàng. `trust proxy = 1` làm client IP đúng khi request đi qua Caddy; điều này ảnh hưởng rate limit và audit.

Global `ValidationPipe` dùng ba lựa chọn quan trọng. `whitelist` bỏ field không có decorator; `forbidNonWhitelisted` từ chối request cố gửi field lạ; `transform` đổi query string sang kiểu DTO khi có metadata. Vì vậy DTO là security boundary, không chỉ autocomplete.

## Một authenticated request

Ví dụ admin gọi `PUT /users/:id`:

```text
HTTP request
→ Caddy/reverse proxy
→ ThrottlerGuard
→ HttpMetricsInterceptor bắt đầu đo
→ RequestContextInterceptor tạo/nhận correlation ID
→ JwtAuthGuard xác minh access token
→ PermissionsGuard đọc permission metadata
→ ValidationPipe kiểm tra params/body
→ UserController tạo UpdateUserCommand
→ CommandBus tìm UpdateUserCommandHandler
→ handler gọi domain + repositories/ports
→ controller dùng presenter tạo response
→ AuditLogInterceptor ghi audit nếu endpoint có metadata
→ metrics/log hoàn tất với status, duration, userId, correlationId
```

Guard chạy trước controller. Interceptor bọc quanh lời gọi controller. Filter bắt exception thoát ra khỏi pipeline. Đây là lý do logic authorization không nên lặp trong từng controller method, còn ownership nghiệp vụ vẫn phải kiểm tra trong handler/repository.

## Domain error trở thành HTTP error

Domain/application biểu diễn failure dự kiến bằng exception có error definition ổn định và thường đặt nó trong `Result`:

```ts
return Result.fail(
  new MoodRevisionConflictException(entryId, expectedRevision),
);
```

Exception chứa `code`, `translationKey`, `statusCode` và `args`. Handler trả failure có kiểu thay vì ném trong flow dự kiến. Controller gọi `result.unwrap()` tại presentation boundary; failure lúc đó trở thành exception và `DomainExceptionFilter` trả JSON contract. UI dựa vào `code` để chọn flow recovery; UI không parse chuỗi `message`. Message có thể đổi ngôn ngữ, code thì không.

## Client Next.js đăng nhập và gọi API

Client là BFF, không phải SPA gọi thẳng backend:

```text
Browser submit login form
→ Next.js Server Action
→ apiFetchPublic('/auth/login')
→ NestJS trả accessToken và refresh token
→ Server Action mã hóa cả hai thành JWE
→ Set-Cookie client_session (HttpOnly)
→ redirect tới trang protected
```

Khi render `/journal/[id]`:

```text
Next.js Proxy giải mã client_session
→ refresh nếu access token sắp hết hạn
→ Server Component chạy getJournalEntry + getMood song song
→ apiFetch lấy access token từ session phía server
→ NestJS API
→ Server Component truyền plain JSON contracts vào JournalEditor
→ browser hydrate Client Components
```

Browser không biết `API_URL`, access token hay refresh token. Nó chỉ giữ encrypted HttpOnly cookie của Next.js origin. Khi Client Component cần mutate, nó gọi Server Action; Server Action mới gọi API.

## Admin đăng nhập và gọi API

Admin là Vite SPA phục vụ use case vận hành, nên flow khác client:

```text
LoginForm
→ auth Zustand store
→ api-client gọi /auth/login với credentials
→ access token giữ trong memory store
→ refresh token nằm HttpOnly cookie do API sở hữu
→ TanStack Query fetch feature data
→ 401 có thể kích hoạt single refresh flow
→ query cache được dọn khi auth identity thay đổi
```

Admin cần tương tác dày và cache client-side nên dùng TanStack Query. Client ưu tiên BFF và Server Components để token không xuống JavaScript.

## Transactional outbox

Outbox giải quyết khoảng trống nguy hiểm giữa “database đã commit” và “event đã gửi”. Nếu code lưu user rồi process chết trước khi emit event in-memory, notification sẽ mất. Với outbox:

```text
database transaction
├─ thay đổi aggregate row
└─ insert outbox_events row
          │ commit cùng nhau
          ▼
OutboxPublisherService poll
→ claim batch
→ OutboxEventRouter dispatch theo event type
→ consumer tạo notification / phát realtime
→ mark PUBLISHED
→ retry hoặc recover stale claim nếu lỗi
```

`eventId` giúp consumer/idempotency nhận diện cùng một event. `attempts`, `lastError`, claim timestamp và status giúp retry có quan sát được. Cleanup chỉ xóa event đã publish quá retention window.

## Queue và worker

Queue dành cho công việc không nên giữ HTTP request mở, ví dụ gửi email welcome/deactivation:

```text
handler API enqueue job vào USER_QUEUE
→ Redis/BullMQ lưu job
→ API trả response
→ worker.ts khởi động WorkerModule
→ UserQueueProcessor consume
→ gửi email hoặc log skip khi MAIL_ENABLED=false
→ BullMQ đánh dấu hoàn thành/retry
```

Producer nằm trong `UsersModule`; consumer chỉ nằm trong `WorkerModule`. Vì vậy chạy API mà quên worker không làm endpoint chết, nhưng job sẽ nằm chờ trong Redis.

## Realtime notification

```text
domain/outbox event
→ CreateNotificationHandler lưu notification
→ NotificationCreatedEvent
→ RealtimePort.emitToUser(userId, event)
→ Socket.IO room của user
→ Admin RealtimeProvider nhận event
→ event handlers invalidate/update TanStack Query cache
→ notification bell render dữ liệu mới
```

Socket handshake phải có access token. Log `101 Switching Protocols` chỉ chứng minh WebSocket transport đã nâng cấp; log `User <id> connected` mới chứng minh application authentication thành công.

## Journal + Mood flow

Journal content và Mood là hai aggregate có revision riêng:

```text
GET page
├─ GET Journal revision 4
└─ GET Mood revision 2

autosave content(expected Journal revision 4)
→ Journal revision 5

update mood(expected Mood revision 2)
→ Mood revision 3
```

Đổi Mood không làm Journal revision tăng, nên autosave content không nhận conflict giả. Khi seal entry, client flush draft trước rồi gửi Journal revision hiện tại. Backend từ chối mọi mutation Mood nếu Journal không còn `DRAFT`.

## Health và graceful shutdown

`GET /health/live` chỉ trả lời process còn chạy. `GET /health/ready` kiểm tra dependency cần thiết để nhận traffic. Docker/Caddy dựa vào readiness, không dựa vào việc port vừa mở.

Shutdown hook cho phép Nest đóng connection và dừng nhận việc mới khi container nhận signal. Production Compose dùng `restart: unless-stopped`, `init: true` và healthcheck để process lifecycle có thể dự đoán.
