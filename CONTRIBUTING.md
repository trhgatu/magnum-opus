# Đóng góp vào repo này

Đây là checklist cộng tác của repository. Product intent và feature flow nằm trong [product map](product/README.md); tài liệu kỹ thuật nền tảng được duy trì tại repository starter.

Tài liệu này mô tả quy trình làm việc bắt buộc — từ lúc clone đến lúc PR được merge. Đọc một lần trước PR đầu tiên; các quy tắc ở đây đều được máy móc cưỡng chế (hook, CI) nên biết trước sẽ đỡ mất thời gian.

## Bắt đầu

Trước khi sửa một feature, đọc product flow tương ứng. Nếu flow chưa tồn tại, làm rõ trigger, business rules và trạng thái cuối trước khi bắt đầu triển khai.

## Quy trình một thay đổi

1. **Xác định chủ sở hữu của behavior** — app nào, bounded context nào. Đọc handbook tương ứng (bản đồ tài liệu trong README) và tìm test gần nhất trước khi sửa.
2. **Tạo branch từ `main`** — không commit thẳng vào `main`.
3. **Viết code theo quy tắc kiến trúc** — 10 quy tắc trong README mục "Quy tắc kiến trúc"; ESLint và test kiến trúc sẽ chặn phần lớn vi phạm.
4. **Chạy quality gate tại local trước khi push:**

   ```powershell
   pnpm turbo run lint check-types test build
   ```

   Backend E2E cần Docker infrastructure: `docker compose up -d` rồi `pnpm --filter=server test:e2e`.

5. **Mở PR** — CI phải xanh cả ba job (quality, e2e, image) và Security workflow. Coverage của admin không được tụt dưới sàn; phủ thêm test thì nâng sàn trong `apps/admin/vitest.config.ts`.
6. **Cập nhật tài liệu trong cùng PR** nếu thay đổi chạm flow, contract, command, port hoặc cách vận hành — tài liệu mô tả sai code thật bị coi là bug.

`main` được bảo vệ bằng GitHub branch protection. Mọi thay đổi, kể cả của maintainer, phải đi qua pull request và các check bắt buộc: quality/build, Backend E2E, Frontend browser E2E, hai image scan, dependency audit và secret scan. Vercel Preview không phải required check vì starter không sở hữu một API staging public; project sản phẩm chỉ nên đưa Vercel vào required checks sau khi Preview đã có backend staging thật.

Repository chỉ cho **squash merge** và tự xóa branch sau merge. PR title phải là một Conventional Commit hợp lệ vì title đó trở thành commit duy nhất trên `main`. Không bật lại merge commit hoặc rebase merge: release-please có thể nhìn cả PR merge lẫn các `feat:` con và đưa cùng một thay đổi vào release note hai lần.

## Commit message

Commit theo [Conventional Commits](https://www.conventionalcommits.org/) — hook `commit-msg` (commitlint) sẽ chặn message sai định dạng:

```text
<type>(<scope tùy chọn>): <mô tả viết thường, không dấu chấm cuối>

feat(server): add password reset flow
fix(admin): keep table state when pagination changes
docs: explain outbox recovery behaviour
```

`type` thường dùng: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `ci`. Lưu ý: subject bắt đầu bằng chữ thường (rule `subject-case`).

Hook `pre-commit` tự format file staged bằng prettier — không cần format tay.

## Những ranh giới không thương lượng

- Secret thật không bao giờ vào git — kể cả trong ví dụ, comment hay file baseline. `.env.example` chỉ chứa placeholder.
- Migration đã merge là lịch sử bất biến — muốn đổi schema thì viết migration mới.
- Thay đổi contract giữa backend và frontend (`@repo/contracts`, `@repo/types`, response shape) phải cập nhật cả hai phía trong cùng PR.
- Tài liệu chỉ mô tả product intent, business rule và feature flow bằng tiếng Việt tự nhiên; không sao chép hướng dẫn cài đặt hoặc handbook kỹ thuật từ starter.

## Báo lỗi bảo mật

Không mở public issue — xem [SECURITY.md](SECURITY.md).
