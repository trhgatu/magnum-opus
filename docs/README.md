# Magnum Opus Engineering Handbook

Handbook này giải thích cách Magnum Opus được tổ chức và chạy. Nó dành cho người đã biết TypeScript căn bản nhưng chưa cần biết trước DDD, CQRS, NestJS, Next.js hay Turborepo.

Đây là tài liệu kỹ thuật của chính Magnum Opus. Các tài liệu trong `product/` trả lời câu hỏi “sản phẩm cần làm gì”; handbook này trả lời câu hỏi “code biến ý định đó thành hệ thống chạy được như thế nào”.

## Cách đọc

Đọc lần đầu theo thứ tự dưới đây. Đừng bắt đầu bằng cách mở ngẫu nhiên một repository hoặc controller: khi chưa biết boundary, một file riêng lẻ chỉ cho thấy cú pháp chứ chưa cho thấy lý do.

| Chương                                                            | Câu hỏi được trả lời                                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [01 — Kiến trúc](01-architecture.md)                              | Monorepo, bounded context, DDD, CQRS và dependency direction là gì?                              |
| [02 — Luồng runtime](02-runtime-flows.md)                         | Một HTTP request, event, queue job và browser session đi qua hệ thống thế nào?                   |
| [03 — Backend modules](modules/backend.md)                        | Từng bounded context backend chịu trách nhiệm gì và từng loại file có ý nghĩa gì?                |
| [04 — Client](modules/client.md)                                  | Next.js BFF, session, Server Component, Server Action, Journal và Mood phối hợp thế nào?         |
| [05 — Admin](modules/admin.md)                                    | React SPA, Zustand, TanStack Query, permissions và realtime được chia ra sao?                    |
| [06 — Shared và infrastructure](modules/shared-infrastructure.md) | Shared kernel, ports, Prisma, Redis, outbox, queue, realtime, metrics và storage dùng để làm gì? |
| [07 — Workspace packages](modules/packages.md)                    | `contracts`, `database`, `types` và config packages được dùng bởi ai?                            |
| [08 — Testing và CI/CD](08-testing-cicd.md)                       | Các lớp test, quality gates, image build, security và release chạy theo thứ tự nào?              |
| [09 — Code walkthrough](walkthroughs/end-to-end.md)               | Đọc từng dòng có ý nghĩa của một vertical slice từ UI đến database như thế nào?                  |
| [10 — Bản đồ file](10-file-map.md)                                | Mở một file bất kỳ thì biết nó thuộc vùng nào, được ai gọi và được phép phụ thuộc vào đâu?       |
| [11 — Cách xây module](11-building-a-module.md)                   | Viết một vertical slice mới theo thứ tự nào, kiểm tra gì ở mỗi bước và tránh lỗi gì?             |

## Bản đồ repository

```text
magnum-opus/
├─ apps/
│  ├─ server/       NestJS API và worker process
│  ├─ client/       Next.js application dành cho người dùng
│  └─ admin/        Vite React SPA dành cho vận hành hệ thống
├─ packages/
│  ├─ contracts/    Hợp đồng dữ liệu dùng chung qua process boundary
│  ├─ database/     Prisma schema, migrations, seed và generated client
│  ├─ types/        Kiểu kỹ thuật dùng chung
│  ├─ eslint-config/
│  └─ typescript-config/
├─ deploy/          Production Compose, Caddy, backup và observability
├─ product/         Vision, journey và business flow
├─ docs/            Engineering handbook này
├─ scripts/         Kiểm tra contract cấp repository
└─ .github/         CI, security và release workflows
```

Một quy tắc đọc quan trọng: đường dẫn thể hiện ownership. Code trong `contexts/reflection/journal` thuộc nghiệp vụ Journal. Code trong `infrastructure/queue` là cơ chế dùng chung, không được chứa quyết định nghiệp vụ Journal. Code trong `packages/contracts` là lời hứa giữa các process/application, không phải domain model.

Handbook giải thích từng dòng **mang quyết định** trong các flow tham chiếu: dòng nào bảo vệ invariant, dòng nào tạo boundary, dòng nào xử lý race và dòng nào chỉ chuyển đổi dữ liệu. Nó không diễn giải lặp lại dấu ngoặc, import hoặc boilerplate formatter; những dòng đó được giải thích một lần theo loại file trong bản đồ file. Cách này giúp tài liệu chi tiết nhưng vẫn còn dùng được khi source được format hoặc đổi thứ tự import.

## Từ điển ngắn

| Khái niệm              | Cách hiểu đơn giản                                                              |
| ---------------------- | ------------------------------------------------------------------------------- |
| Bounded context        | Một vùng nghiệp vụ có vocabulary và quyền sở hữu logic riêng.                   |
| Domain                 | Quy tắc đúng/sai của nghiệp vụ, không biết HTTP hay Prisma.                     |
| Application            | Điều phối một use case; gọi domain và ports theo đúng thứ tự.                   |
| Port                   | Interface mô tả thứ application/domain cần từ bên ngoài.                        |
| Adapter                | Implementation cụ thể của port bằng Prisma, Redis, S3, BullMQ…                  |
| Presentation           | Controller, DTO, guard và presenter ở ranh giới HTTP.                           |
| Aggregate              | Object bảo vệ invariant và transition của một cụm dữ liệu.                      |
| Command                | Ý định làm thay đổi trạng thái.                                                 |
| Query                  | Ý định đọc trạng thái, không làm thay đổi nghiệp vụ.                            |
| Composition root       | Module ghép interface với implementation và đăng ký dependency.                 |
| BFF                    | Backend-for-Frontend; ở đây Next.js server giữ session và gọi API thay browser. |
| Outbox                 | Bảng sự kiện được ghi cùng transaction nghiệp vụ rồi publish bất đồng bộ.       |
| Optimistic concurrency | Chỉ update khi revision người gọi đang giữ vẫn là revision mới nhất.            |

## Khi thêm module mới

Hãy bắt đầu ở product flow, sau đó tạo vertical slice nhỏ chạy xuyên suốt database → domain → application → HTTP → client → E2E. Journal và Mood là hai mẫu tham chiếu hiện tại. Không sao chép toàn bộ folder rồi đổi tên; mỗi abstraction chỉ nên xuất hiện khi use case thật sự cần nó.
