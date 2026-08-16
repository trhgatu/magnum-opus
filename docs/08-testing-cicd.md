# 08 — Testing, CI/CD và deployment

## CI/CD là gì?

Continuous Integration (CI) là việc mọi thay đổi được tích hợp qua một chuỗi kiểm tra tự động giống nhau. Nó trả lời: code có format/type đúng, test có pass, migration có khớp, artifact có build được và dependency có an toàn không?

Continuous Delivery/Deployment (CD) là việc artifact đã qua CI được đóng gói, phát hành và đưa tới môi trường chạy theo cách lặp lại được. Repository hiện tự động build/scan/push immutable images trên `main`; việc deploy production vẫn là thao tác có kiểm soát qua Compose scripts, không tự động đẩy vào một VPS mặc định.

## Kim tự tháp test

```text
                    Browser E2E
                 Backend HTTP E2E
            Repository/adapter tests
        Application handler/hook tests
    Domain/pure function/component unit tests
Architecture + contract verification xuyên ngang
```

Test ở dưới nhanh và chỉ ra lỗi chính xác. Test ở trên chứng minh integration thật nhưng đắt hơn. Một business rule quan trọng nên có domain test; E2E không thay thế nó.

## Backend tests

### Domain test

Aggregate được tạo trực tiếp, không Nest testing module, không database. Test create/normalize/transition/no-op/invalid branch/rehydrate. Ví dụ Mood update không đổi normalized value phải giữ revision.

### Handler test

Inject mock repositories/ports. Test thứ tự quyết định: ownership missing, state invalid, expected revision missing/stale, persistence race và success. Không assert Prisma call ở handler test; chỉ assert repository interface call.

### Mapper/repository test

Mapper test explicit enum/null/date/revision. Repository test mock Prisma client để assert owner filter, relation filter, updateMany/deleteMany expected revision và known error mapping.

### Backend E2E

Jest khởi động `AppModule` với PostgreSQL/Redis test thật. Global setup reset chỉ database có suffix `_test`, sync schema và seed. E2E gọi HTTP bằng Supertest và chứng minh auth/guard/filter/controller/handler/repository cùng chạy.

Safety rule về suffix ngăn một DATABASE_URL nhập sai làm reset development/production database.

## Frontend tests

### Unit/component

Vitest chạy pure helpers, Server Actions với mocked API, session crypto, stores, query hooks và component interaction. Mỗi QueryClient/store/DOM phải cleanup giữa tests để không rò state.

### Browser E2E

Playwright chạy Admin/Client cùng Nest API thật và database `admin_browser_e2e`. `prepare-frontend-e2e.mjs` migrate + seed database cô lập. Browser test xác nhận DOM accessibility và kiểm tra browser không gọi thẳng private API origin trong BFF flow.

Journal E2E bao gồm autosave, reload, preview, lifecycle, concurrent edit, network loss, remote trash/delete và Mood lifecycle.

## Contract verification scripts

| Command                     | Bảo vệ điều gì                                           |
| --------------------------- | -------------------------------------------------------- |
| `pnpm verify:env`           | Mọi `.env.example` bắt buộc tồn tại và đồng bộ contract. |
| `pnpm verify:migrations`    | Migration history tạo ra đúng schema hiện tại.           |
| `pnpm verify:docs`          | Required product docs và local Markdown links.           |
| `pnpm verify:compose`       | Production Compose render được với example contract.     |
| `pnpm verify:backup`        | Off-host encrypted backup scripts giữ contract.          |
| `pnpm verify:alerts`        | Prometheus alert rules hợp lệ.                           |
| client `verify:performance` | First-load JS từng route không vượt budget có chủ đích.  |

## CI workflow

`.github/workflows/ci.yml` chạy trên PR và push main. Concurrency group hủy run cũ của cùng ref để không phí runner.

### Job quality

Thứ tự:

```text
checkout
→ setup pnpm/node + frozen install
→ prisma generate
→ verify compose/env/docs/backup/alerts
→ lint
→ typecheck
→ unit tests
→ build
→ client performance budget
→ admin artifact verification
```

CI dùng placeholder DATABASE_URL đúng format cho generate/build nhưng không giả vờ có database sống. API origins CI là domain `.invalid`, đảm bảo production validation pass mà không trỏ localhost hay dịch vụ thật.

### Job backend E2E

GitHub service containers cung cấp PostgreSQL và Redis. Workflow replay migration chain, diff schema, build upstream packages, tạo `.env.test` tạm rồi chạy toàn bộ backend E2E.

### Job frontend browser E2E

Database riêng `admin_browser_e2e`, Redis, seed credentials và Chromium. Admin E2E chạy trước Client E2E trên cùng job. Playwright reports/traces/screenshots được upload kể cả khi test fail, trừ khi workflow bị cancel.

### Job image

Chỉ chạy sau quality + backend E2E + browser E2E. Matrix build hai image `server` và `client` bằng Docker engine của runner, tạo SBOM bằng Syft, scan HIGH/CRITICAL bằng Trivy. Chỉ push GHCR khi event là push `main`; PR chỉ build/scan.

Image được tag bằng full commit SHA và `latest`. SHA là immutable deployment input; `latest` chỉ là convenience pointer.

## Security workflow

`security.yml` chạy trên PR, main và lịch thứ Hai.

Gitleaks binary được pin version, download checksum được verify trước install, rồi scan toàn git history với redact. Dependency audit dùng frozen lockfile và fail ở high severity, trừ advisory được policy ignore rõ ràng.

Network timeout khi download scanner/image là failure hạ tầng, khác vulnerability. Retry có giới hạn phù hợp; không bỏ scan chỉ vì registry chập chờn.

## Release workflow

Release hiện manual `workflow_dispatch`. Release Please đọc conventional commits, mở/cập nhật release PR, bump version/changelog. Merge release PR tạo GitHub Release + tag.

Lần phát hành sản phẩm đầu tiên dùng footer `Release-As: 1.0.0` trong commit closeout đã merge vào `main`. Đây là chỉ thị một lần cho Release Please, không phải cấu hình `release-as` cố định; vì vậy các release sau lại quay về tính version từ conventional commits.

Vì workflow chỉ dùng `workflow_dispatch`, một release cần hai lần chạy có chủ đích. Lần một chạy sau khi closeout CI trên `main` xanh để Release Please mở release PR. Sau khi kiểm tra version và merge release PR, đợi CI của merge commit build/scan image theo SHA, rồi chạy Release lần hai. Lần hai mới tạo tag, GitHub Release và kích hoạt job gắn version tag cho image. Merge release PR một mình không thể kích hoạt workflow manual.

Feature PR dùng squash merge với conventional PR title để mỗi thay đổi chỉ xuất hiện một lần trong changelog. Release PR là ngoại lệ: nó có thể dùng merge commit để giữ rõ ranh giới phát hành.

Tag do `GITHUB_TOKEN` tạo không kích hoạt workflow khác, nên job cùng release workflow chờ image SHA của CI xuất hiện rồi gắn thêm version tag bằng `buildx imagetools`. Nó không rebuild image, nhờ vậy version tag trỏ đúng artifact đã scan.

## Local và production Docker

Local mặc định chạy Postgres, Redis, Maildev bằng Docker; Node apps chạy host để hot reload nhanh. Profile `container-dev` có API container khi cần kiểm tra môi trường Linux. Fixed container names đã được đổi theo Magnum Opus; named node_modules volumes tránh anonymous volume tăng disk sau mỗi recreate.

Production Compose chạy:

```text
Caddy → API
           ├─ PostgreSQL
           ├─ Redis
           └─ uploads volume/object storage

Worker ────► Redis queue
tools profile: migrate, seed
```

Data network là internal; Postgres/Redis không publish port ra internet. Caddy sở hữu 80/443 và TLS. API/worker dùng cùng immutable server image/tag nhưng command khác.

## Deploy flow

```text
chọn SERVER_IMAGE_TAG = commit SHA đã qua CI
→ backup-and-verify
→ pull image
→ chạy migrate one-shot
→ recreate API + worker
→ readiness verification
→ smoke auth/API/realtime
```

Seed không nằm trong deploy mặc định. Production seed chỉ chạy chủ động với `ALLOW_PRODUCTION_SEED`; seed success không chứng minh password admin hiện tại là password trong env vì idempotent seed không overwrite credential tồn tại.

Rollback đổi image tag về SHA trước. Migration rollback không tự động; migration phải forward-compatible trong deployment window hoặc có runbook riêng.

## Backup

Backup PostgreSQL tạo custom-format dump. Restore verification tạo database tạm `restore_verify_*`, restore dump, kiểm tra tables rồi xóa database tạm; live database không bị sửa.

Backup local chưa đủ chống hỏng disk/VPS. `backup-offsite.sh` mã hóa rồi chuyển off-host. Systemd timer chạy backup và freshness health check. Alert dựa trên status file để phát hiện “job không chạy” chứ không chỉ “job chạy nhưng exit error”.

## Khi CI fail, đọc theo lớp

1. Xác định job: quality, backend E2E, browser E2E, image hay security.
2. Tìm command đầu tiên exit non-zero; log phía sau có thể chỉ là cleanup.
3. Phân biệt code failure với external registry/network timeout.
4. Reproduce đúng command và environment locally.
5. Không sửa bằng cách nới budget, ignore audit hoặc bỏ test nếu chưa có bằng chứng policy cần đổi.
