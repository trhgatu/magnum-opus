# 07 — Workspace packages

Turborepo gom nhiều application/package nhưng một package chỉ nên tồn tại khi có ownership và consumer rõ.

## `@repo/contracts`

Contracts là public language qua process/application boundary. Nó chứa:

- API error/response shapes.
- Authenticated principal, current user, permissions và system roles.
- Realtime event names/payloads.
- Journal và Mood response types/enums.

Contracts không chứa Prisma model, Nest DTO decorator, React component hay domain aggregate method. Một `MoodResponse` là plain JSON có timestamp string; `Mood` domain aggregate có Date, behavior và private props. Trộn hai loại khiến client phụ thuộc internal model.

`errors/errors.ts` là registry stable:

```ts
MOOD_REVISION_CONFLICT: {
  code: "MOOD_REVISION_CONFLICT",
  translationKey: "exceptions.mood.revision.conflict",
  statusCode: 409,
}
```

`code` phục vụ machine branching, `translationKey` phục vụ presentation, `statusCode` là HTTP mapping mặc định. Thêm error mới phải cân nhắc compatibility với admin/client.

Package build bằng tsup ra CJS, ESM và declaration files để Nest, Vite, Next và tooling đều consume được.

## `@repo/database`

Package database sở hữu:

```text
prisma/schema.prisma
prisma/migrations/*/migration.sql
prisma/seed.ts
prisma.config.ts
src/client.ts
```

`schema.prisma` là desired model; migrations là lịch sử biến đổi đã commit. Hai thứ phải khớp. `verify:migrations` deploy toàn lịch sử vào database rồi diff với schema, exit code 2 nếu drift.

Không sửa migration đã chạy ở shared environment. Tạo migration mới. Check constraint business-critical như Mood intensity được ghi rõ trong SQL vì Prisma schema chưa biểu diễn mọi database constraint.

Seed phải idempotent cho role, permission, menu và bootstrap admin. “Idempotent” nghĩa chạy lại không tạo duplicate. Seed cố ý không reset password admin đã tồn tại; reset password và seed success là hai việc khác nhau.

## `@repo/types`

Package này chứa kiểu kỹ thuật thật sự dùng chung, hiện gồm các generic như pagination. Nó không phải nơi chuyển mọi interface vào cho “gọn”. Feature type chỉ một consumer nên ở feature.

## `@repo/typescript-config`

Các preset:

| File                 | Consumer                            |
| -------------------- | ----------------------------------- |
| `base.json`          | Nền strict options.                 |
| `node.json`          | Node packages/scripts.              |
| `nest.json`          | Decorators/path/runtime của server. |
| `nextjs.json`        | Next App Router.                    |
| `react-library.json` | React library setup.                |

Central config giảm drift nhưng app vẫn có tsconfig riêng cho include/path/framework plugin.

## `@repo/eslint-config`

Base, Next và React-internal configs chuẩn hóa quality rules. Architecture-specific rule quan trọng vẫn có thể nằm trong app vì chỉ app hiểu boundary đó.

## Turbo task graph

Trong `turbo.json`, `build` phụ thuộc `^build`: package dependencies build trước consumer. Lint/typecheck/test cũng phụ thuộc upstream build vì workspace imports dùng generated declarations/artifacts.

`dev` persistent và không cache. Build outputs gồm `.next` và `dist`; `.next/cache`/dev output không được xem là artifact. Environment variables ảnh hưởng build nằm trong `globalEnv` để cache key không tái sử dụng artifact từ config khác.

Ví dụ graph rút gọn:

```text
contracts build ─┬─► server build
                 ├─► admin build
                 └─► client build

database build ─────► server build
types build ─────────► frontend consumers
```

## Khi nào tạo package mới?

Chỉ tạo khi code có từ hai consumer độc lập, public API nhỏ và release/build boundary mang lại giá trị. Nếu code chỉ được server dùng, đặt trong server shared/context thường rõ hơn. Package hóa quá sớm tạo dependency graph và build cost mà không tạo boundary nghiệp vụ.
