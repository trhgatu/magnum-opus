# Chính sách bảo mật (Security Policy)

Tài liệu này dành cho việc báo cáo lỗ hổng có trách nhiệm. Không tạo issue công khai chứa secret, dữ liệu khách hàng, exploit hoạt động hoặc chi tiết đủ để người khác tái hiện tấn công trước khi bản vá sẵn sàng.

_English summary: please report vulnerabilities privately to the email below; do not open a public issue. We aim to acknowledge reports within 72 hours._

## Phiên bản được hỗ trợ

Chỉ nhánh `main` được vá bảo mật. Image đã publish trên GHCR gắn tag theo commit SHA — bản vá đồng nghĩa với một image mới, không sửa image cũ.

## Báo cáo lỗ hổng

- **KHÔNG** mở public issue cho lỗ hổng bảo mật — issue công khai là công bố lỗ hổng trước khi có bản vá.
- Gửi email tới **trananhtu1112003@gmail.com** với tiêu đề bắt đầu bằng `[SECURITY]`, kèm: mô tả lỗ hổng, các bước tái hiện, phạm vi ảnh hưởng ước tính, và bản vá đề xuất nếu có.
- Chúng tôi xác nhận đã nhận báo cáo trong vòng 72 giờ và trao đổi tiến độ xử lý qua email.

## Phạm vi

Trong phạm vi: code trong repo này (server, admin, client, packages), workflow CI, Dockerfile. Ngoài phạm vi: lỗ hổng của dependency đã có advisory công khai (được xử lý qua Dependabot/pnpm audit), và cấu hình hạ tầng triển khai của từng người dùng repo.

## Các lớp phòng thủ đang có

Để người báo cáo đối chiếu nhanh: refresh token nằm trong HttpOnly cookie; access token thu hồi tức thời qua `tokenVersion`; rate limiting bảo vệ nhóm `/auth`; Helmet và CORS allowlist áp dụng cho HTTP lẫn Socket.IO; secret scan và dependency audit chạy trong CI; image được quét trước khi publish.

## Ngoại lệ dependency đang được chấp nhận

`pnpm audit` hiện bỏ qua hai advisory.

### `GHSA-qwww-vcr4-c8h2` — React Router

Advisory này chỉ ảnh hưởng các API React Server Components thử nghiệm của React Router. Admin dùng React Router ở chế độ SPA và không bật các API RSC đó, nên đường tấn công được mô tả không tồn tại trong ứng dụng này. Đây là ngoại lệ có phạm vi, không phải cách làm cho CI xanh bằng cách bỏ qua mọi cảnh báo.

Khi Admin chuyển sang RSC, hoặc khi có thể nâng React Router lên bản vá mà không phá vỡ API hiện tại, phải xóa mã advisory khỏi `pnpm.auditConfig.ignoreGhsas` và chạy lại toàn bộ quality, browser E2E và dependency audit. Mọi ngoại lệ mới đều phải ghi rõ package, điều kiện khai thác, lý do repo không bị ảnh hưởng và điều kiện xóa ngoại lệ tại đây.

### `GHSA-vfj7-8cjw-p6xm` — braces

`braces` (≤ 3.0.3) có thể bị stack exhaustion khi mở rộng một glob pattern lồng sâu do kẻ tấn công kiểm soát. Advisory chưa có bản vá nào (patched versions `<0.0.0`), nên không thể xử lý bằng override.

Repo không bị ảnh hưởng vì `braces` chỉ có mặt trong dev tooling — `lint-staged` và `eslint-config-next` (qua `micromatch` / `fast-glob`). `pnpm why braces --prod -r` không trả về đường nào: package này không nằm trong dependency production của server, client hay admin, và chỉ xử lý glob pattern do chính repo khai báo trong config lint, không bao giờ nhận input từ người dùng.

Xóa ngoại lệ khi `braces` phát hành bản vá (thêm override tương ứng), hoặc khi `braces` xuất hiện trong dependency production.
