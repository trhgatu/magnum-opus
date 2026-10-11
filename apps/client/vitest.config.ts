import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // "server-only" ném lỗi khi được import ngoài môi trường React Server
      // Component. Trong test (Node thuần) thay nó bằng module rỗng — điều
      // cần kiểm tra là logic, còn ranh giới server/client đã có build của
      // Next.js canh giữ.
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    // `pnpm test` cho turbo chạy jest server + vitest admin + vitest client
    // song song; lúc đó test component (bình thường vài trăm ms) từng mất
    // 6–13s vì thiếu CPU và vượt mức 5s mặc định. Test treo thật vẫn fail.
    testTimeout: 15_000,
    setupFiles: ["./test/setup.ts"],
    env: {
      SESSION_SECRET: "vitest-session-secret-vitest-session-secret",
    },
  },
});
