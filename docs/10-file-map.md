# 10 — Bản đồ file và trách nhiệm

Chương này là bản đồ tra cứu. Khi gặp một file lạ, tìm suffix hoặc thư mục của nó ở đây để biết ba điều: file giải quyết việc gì, ai được gọi nó và nó được phép gọi ai.

## Root repository

| File/thư mục                              | Ý nghĩa                                                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `package.json`                            | Danh sách lệnh cấp workspace. Lệnh ở đây điều phối package; business dependency không được khai báo ở root.                                |
| `pnpm-workspace.yaml`                     | Khai báo package nào thuộc monorepo. Nếu một thư mục có `package.json` nhưng không match file này, pnpm không coi nó là workspace package. |
| `turbo.json`                              | Task graph, cache inputs và outputs. `dependsOn: ["^build"]` buộc dependency build trước consumer.                                         |
| `.env.example`                            | Contract biến môi trường cấp root. Đây là mẫu có thể commit, không chứa secret thật.                                                       |
| `scripts/bootstrap.mjs`                   | Dựng môi trường local theo một quy trình lặp lại được: tạo env còn thiếu và bật dependency containers.                                     |
| `scripts/verify-environment-contract.mjs` | So sánh các example env với danh sách biến bắt buộc để CI phát hiện drift.                                                                 |
| `scripts/prepare-frontend-e2e.mjs`        | Chuẩn bị database cô lập, migrate và seed trước Playwright.                                                                                |
| `scripts/verify-docs.mjs`                 | Kiểm tra tài liệu bắt buộc, link nội bộ và các contract documentation.                                                                     |
| `product/`                                | Product truth: mục đích, journey, rules và acceptance flow. Không chứa hướng dẫn framework.                                                |
| `docs/`                                   | Engineering truth: architecture, runtime, cách code, test và vận hành.                                                                     |

## Server entrypoints

| File                                                    | Ý nghĩa                                                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/server/src/main.ts`                               | Composition root của HTTP process: tạo Nest app, cài global pipes/filters/interceptors, security, CORS và graceful shutdown rồi listen.     |
| `apps/server/src/worker.ts`                             | Entry point process nền. Nó tạo application context cho queue processors nhưng không mở HTTP port.                                          |
| `apps/server/src/app.module.ts`                         | Root dependency graph. File này import contexts và infrastructure modules; không chứa business rule.                                        |
| `apps/server/src/worker.module.ts`                      | Dependency graph tối thiểu cho worker. Tách nó khỏi `AppModule` tránh worker vô tình chạy controller, outbox poller hoặc websocket gateway. |
| `apps/server/src/config/*`                              | Parse và validate environment một lần khi process khởi động. Code còn lại nhận typed config thay vì tự đọc `process.env`.                   |
| `apps/server/src/architecture/dependency-rules.spec.ts` | Test cấu trúc bằng source imports/naming. Nó biến quy ước layer thành quality gate thay vì lời nhắc trong review.                           |

## Một bounded context backend

### Domain

| Pattern                     | Ý nghĩa và dependency hợp lệ                                                                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `*.aggregate.ts`            | Nắm state và transition của aggregate. Chỉ import domain/shared-domain; không import Nest, Prisma, DTO hoặc contracts transport.                   |
| `*.entity.ts`               | Object có identity và behavior nhưng không nhất thiết là transaction root. Cùng luật dependency với aggregate.                                     |
| `*.value-object.ts`         | Validate và normalize một giá trị khi tạo; immutable và so sánh theo value. `JournalEntryId`/`MoodId` dùng UUID để tạo identity trước persistence. |
| `enums/*.enum.ts`           | Vocabulary hữu hạn của domain. Không dùng Prisma enum trực tiếp để domain không phụ thuộc generated client.                                        |
| `exceptions/*.exception.ts` | Failure có tên trong ngôn ngữ nghiệp vụ. Global filter sẽ chuyển nó thành HTTP response ở outer layer.                                             |
| `events/*.event.ts`         | Fact đã xảy ra trong domain. Event dùng past tense và chỉ mang dữ liệu cần thiết cho consumer.                                                     |
| `ports/*.repository.ts`     | Interface persistence của aggregate. Domain/application gọi port; Prisma adapter implements port.                                                  |
| `index.ts`                  | Public surface của folder. Chỉ re-export thứ consumer thật sự cần, không dùng barrel để che dependency cycle.                                      |
| `*.spec.ts`                 | Test behavior thuần: create, normalize, no-op, transition sai, revision và rehydrate. Không boot Nest/database.                                    |

### Application

| Pattern                          | Ý nghĩa và dependency hợp lệ                                                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `*.command.ts`                   | Immutable message mô tả ý định thay đổi. Nó chứa input đã qua transport boundary, không tự thực hiện logic.                                               |
| `commands/handlers/*.handler.ts` | Một use case ghi. Handler tải aggregate, gọi behavior, persist, enqueue/publish nếu cần và trả result.                                                    |
| `*.query.ts`                     | Message mô tả nhu cầu đọc. Query không được âm thầm thay đổi domain state.                                                                                |
| `queries/handlers/*.handler.ts`  | Một use case đọc. Có thể dùng repository hoặc reader projection tùy nhu cầu.                                                                              |
| `services/*.service.ts`          | Application policy được nhiều command handler dùng chung, ví dụ mutation service xử lý optimistic concurrency nhất quán. Nó không phải chỗ gom mọi logic. |
| `jobs/*.jobs.ts`                 | Vocabulary và payload job ổn định mà producer/application cùng hiểu. Không chứa `Job`, decorator hay processor của BullMQ.                                |
| `ports/*.port.ts`                | Capability ngoài domain persistence: clock, mail, cache, queue, realtime. Infrastructure implements interface này.                                        |
| `*.handler.spec.ts`              | Mock ports để test quyết định và thứ tự orchestration; không assert chi tiết Prisma.                                                                      |

Trong Auth, `auth-token-issuer.port.ts`, `auth-policy.port.ts` và `opaque-token.port.ts` là ba ví dụ cụ thể. JWT/config/crypto adapters tương ứng nằm dưới `auth/infrastructure`; Passport strategies nằm dưới `auth/presentation/strategies` vì chúng nhận credential từ HTTP request.

### Infrastructure

| Pattern                               | Ý nghĩa                                                                                                          |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `mappers/prisma-*.mapper.ts`          | Chuyển record generated bởi Prisma thành domain object qua `rehydrate`, và chuyển aggregate về persistence data. |
| `repositories/prisma-*.repository.ts` | Thực thi domain repository bằng Prisma, luôn scope owner/tenant và dùng `updateMany` khi cần expected revision.  |
| `*.reader.ts`                         | Query projection đọc thẳng shape tối ưu cho list/dashboard; không rehydrate aggregate nếu không cần behavior.    |
| `*.store.ts`                          | Adapter giữ session/token/state kỹ thuật, thường trên Redis.                                                     |
| `*.adapter.ts`                        | Implementation cụ thể của outbound port như S3, local storage hoặc BullMQ.                                       |
| `processors/*.processor.ts`           | Inbound adapter consume queue job, validate transport payload rồi gọi application service.                       |
| `mail/*.ts`                           | Outbound adapter implement mail port bằng provider cụ thể; config và template kỹ thuật ở đây.                    |
| `*-realtime.adapter.ts`               | Implement `RealtimePort` bằng transport cụ thể; context không import gateway hoặc Socket.IO SDK.                 |
| `*.repository.spec.ts`                | Chứng minh filter ownership, data mapping, concurrency predicate và mapping known database failures.             |

### Presentation và module

| Pattern                       | Ý nghĩa                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `controllers/*.controller.ts` | HTTP adapter: route, auth metadata, DTO, CommandBus/QueryBus, cookie/status. Không viết invariant ở đây.   |
| `dtos/*.dto.ts`               | Validate input không tin cậy và transform query string. DTO trả lỗi sớm trước application layer.           |
| `presenters/*.presenter.ts`   | Chuyển domain/read result thành stable public contract, ngăn object nội bộ rò ra API.                      |
| `*.module.ts`                 | Composition root cục bộ: bind token → adapter, đăng ký handlers/controller và export dependency tối thiểu. |

## Các backend context hiện có

| Context             | File bắt đầu đọc                                                | Điều nó sở hữu                                                                                        |
| ------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| IAM/Auth            | `contexts/iam/auth/auth.module.ts`                              | Login, refresh, logout, sessions, email verification, password reset và JWT policy.                   |
| IAM/Users           | `contexts/iam/users/domain/user.entity.ts`                      | User identity/profile, active state, roles, token version và lifecycle events.                        |
| IAM/Roles           | `contexts/iam/roles/domain/role.entity.ts`                      | Role, permission assignment và bảo vệ system roles.                                                   |
| Reflection/Journal  | `contexts/reflection/journal/domain/journal-entry.aggregate.ts` | Draft editing, seal/reopen, trash/restore/delete và revision.                                         |
| Reflection/Mood     | `contexts/reflection/mood/domain/mood.aggregate.ts`             | Một mood cho một journal entry, label/intensity/note và revision.                                     |
| Reflection/Memory   | `contexts/reflection/memory/domain/memory.aggregate.ts`         | Ký ức độc lập, provenance Journal tùy chọn, precision thời gian và lifecycle trash.                   |
| Reflection/Timeline | `contexts/reflection/timeline/timeline.module.ts`               | Read model owner-scoped từ Journal/Memory events; không có aggregate riêng.                           |
| Forge/Habit         | `contexts/forge/habit/`, `contexts/forge/forge.module.ts`       | Aggregate và backend API create/list/detail/update/archive/restore.                                   |
| Forge/Check-in      | `contexts/forge/habit-check-in/`                                | Check-in/undo hôm nay theo owner timezone và lịch sử cho heatmap.                                     |
| Forge/Routine       | `contexts/forge/routine/`                                       | Backend V1 cho lifecycle và membership Habit nhiều-nhiều có thứ tự, bảo vệ bằng revision.             |
| Notifications       | `contexts/notifications/domain/notification.entity.ts`          | Notification persistence, read state và created event.                                                |
| Audit               | `contexts/audit/audit.module.ts`                                | Append/read audit trail và retention. Nó dùng ports/readers vì audit log chủ yếu là immutable record. |
| Analytics           | `contexts/analytics/dashboard/dashboard.module.ts`              | Read-only dashboard projection. Không có aggregate vì không sở hữu state transition.                  |
| Menu                | `contexts/menu/menu.module.ts`                                  | Menu projection theo quyền. UI navigation không tự quyết định authorization.                          |
| Storage             | `contexts/storage/storage.module.ts`                            | Upload boundary và lựa chọn local/S3 adapter.                                                         |

## Client Next.js

| Pattern                                          | Ý nghĩa                                                                                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `app/(public)/*`                                 | Route không yêu cầu session. Route group không xuất hiện trong URL.                                                           |
| `app/(auth)/*`                                   | Login/register/reset/verify flows và layout dành cho authentication.                                                          |
| `app/(protected)/*`                              | Routes chỉ render sau khi proxy/layout xác nhận session.                                                                      |
| `app/**/page.tsx`                                | Route-level Server Component; load data và compose feature, không giữ interaction state.                                      |
| `app/**/loading.tsx`                             | Streaming fallback của segment.                                                                                               |
| `app/**/error.tsx`                               | Client error boundary của segment, cho retry mà không phá toàn app.                                                           |
| `app/**/not-found.tsx` hoặc root `not-found.tsx` | UI cho `notFound()`; khác lỗi server 500.                                                                                     |
| `features/*/api/*.ts`                            | Server-only adapter gọi backend bằng shared `apiFetch`; normalize transport quirks như 204.                                   |
| `features/*/actions/*.ts`                        | Server Action nhận untrusted form/input, validate runtime, gọi feature API và trả serializable action state.                  |
| `features/*/components/*.tsx`                    | UI và interaction thuộc feature. Client component chỉ được đánh dấu `'use client'` khi thực sự cần hooks/events/browser APIs. |
| `features/*/hooks/*.ts`                          | Lifecycle phức tạp có thể test độc lập: autosave, draft recovery, shortcuts.                                                  |
| `features/*/lib/*.ts`                            | Pure helpers như URL state; không giấu network hoặc global mutable state trong `lib`.                                         |
| `lib/session.ts`                                 | Mã hóa/giải mã JWE session cookie phía Next server. Browser không đọc access token.                                           |
| `lib/api.ts`                                     | HTTP boundary chung: base URL, auth header, parsing và typed `ApiError`.                                                      |
| `proxy.ts`                                       | Gate protected routes và single-flight refresh trước render. Đây không phải business authorization.                           |

## Admin React SPA

| Pattern                                 | Ý nghĩa                                                                                 |
| --------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/main.tsx`                          | Bootstrap React và provider tree.                                                       |
| `src/routes/route-manifest.ts`          | Nguồn route metadata, lazy imports và required permissions.                             |
| `src/routes/protected-route.tsx`        | Chặn route khi auth bootstrap chưa xong hoặc permission thiếu.                          |
| `src/features/*/api/*.api.ts`           | Endpoint calls của feature. Không gọi `fetch` rải trong components.                     |
| `src/features/*/api/*.keys.ts`          | Query-key factory. Key phải chứa mọi filter ảnh hưởng response.                         |
| `src/features/*/hooks/use*.ts`          | TanStack Query orchestration, invalidation và mutation lifecycle.                       |
| `src/features/*/components/*.tsx`       | Screen/widget thuộc feature; nhận data/action qua hooks.                                |
| `src/features/*/pages.ts`               | Lazy page exports phục vụ route manifest.                                               |
| `src/features/auth/store/auth.store.ts` | Zustand store cho auth state cần đồng bộ toàn SPA. Server data không đưa vào store này. |
| `src/lib/api-client.ts`                 | Axios boundary, credentials, refresh single-flight và retry đúng một lần.               |
| `src/app/realtime/*`                    | Socket lifecycle và mapping event → query invalidation/auth transition.                 |
| `src/components/ui/*`                   | shadcn primitives; không đặt feature API hoặc business vocabulary ở đây.                |

## Workspace packages

| Package/file                                          | Ý nghĩa                                                                       |
| ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| `packages/contracts/src/index.ts`                     | Public barrel duy nhất cho cross-app contracts.                               |
| `packages/contracts/src/<feature>/*`                  | Request/response/enums ổn định qua process boundary; không chứa Prisma model. |
| `packages/database/prisma/schema.prisma`              | Logical database model hiện tại.                                              |
| `packages/database/prisma/migrations/*/migration.sql` | Lịch sử thay đổi bất biến. Không sửa migration đã được chia sẻ/deploy.        |
| `packages/database/prisma/seed.ts`                    | Seed idempotent cho baseline roles/permissions/menu/admin policy.             |
| `packages/database/src/client.ts`                     | Export Prisma client cho consumers.                                           |
| `packages/types/src/index.ts`                         | Kiểu kỹ thuật dùng chung không phải API contract.                             |
| `packages/typescript-config/*.json`                   | Compiler contract theo runtime: Nest, Next, Node, React library.              |
| `packages/eslint-config/*.js`                         | Static rules dùng chung; app chỉ bổ sung rule đặc thù.                        |

## Test và generated files

File `.spec.ts`, `.test.ts(x)` nằm cạnh source để chỉ ngay behavior được bảo vệ. File `e2e/*.spec.ts` kiểm tra flow qua process/network thật. `dist/`, `.next/`, coverage và Prisma generated output là artifact; không đọc chúng để suy ra source design và không sửa trực tiếp.

Khi chưa rõ một file, đi theo chuỗi: module import nó ở đâu → constructor/interface của nó là gì → test nào gọi public behavior → adapter nào implement port. Chuỗi đó đáng tin hơn việc đoán từ tên.
