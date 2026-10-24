-- Project Activity Phase 2 (BA 08): WakaTime. Chỉ thêm giá trị enum —
-- không đổi dữ liệu nào. Server bản trước không bao giờ đọc thấy các giá trị
-- này cho tới khi bản mới tạo ra chúng.

-- AlterEnum
ALTER TYPE "IntegrationProvider" ADD VALUE 'WAKATIME';

-- AlterEnum
ALTER TYPE "ActivityProvider" ADD VALUE 'WAKATIME';

-- AlterEnum
ALTER TYPE "ActivityKind" ADD VALUE 'CODING_TIME';
