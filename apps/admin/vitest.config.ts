import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "e2e/**"],
    // Cùng lý do với apps/client/vitest.config.ts: khi turbo chạy test của
    // mọi package song song, test component từng mất 4–7s vì thiếu CPU.
    testTimeout: 15_000,
    restoreMocks: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/components/ui/**", "src/**/*.test.*", "src/test/**"],
      // Sàn thấp hơn kết quả thực đo khoảng một điểm để tránh dao động nhỏ;
      // chỉ nâng dần khi phủ thêm test,
      // không bao giờ hạ xuống.
      thresholds: {
        statements: 63,
        branches: 62,
        functions: 54,
        lines: 64,
      },
    },
  },
});
