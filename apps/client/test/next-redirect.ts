import { vi } from "vitest";

/**
 * Server Action thành công bằng redirect() không bao giờ "return": Next.js
 * ném một lỗi có digest NEXT_REDIRECT, và component cố ý re-throw nó để
 * runtime thật của framework điều hướng. React 19 báo lỗi ném ra từ async
 * transition qua reportError() — tức một `uncaughtException` — mà môi
 * trường test không có runtime nào "tiêu thụ".
 *
 * Component re-throw bên ngoài transition (vd JournalEditor) thì lỗi đi theo
 * đường `unhandledRejection` — truyền tên sự kiện tương ứng.
 *
 * Gọi hàm này TRƯỚC khi render để không lỡ sự kiện, thao tác xong mới
 * `await waitForRedirect()`. Thời gian chờ chỉ tính từ lúc đó, không ăn vào
 * phần render/click như cách tự đặt setTimeout ngay đầu test (vốn chỉ còn
 * 1 giây cho cả kịch bản và fail khi máy bận).
 */
export function listenForNextRedirect(
  event: "uncaughtException" | "unhandledRejection" = "uncaughtException",
) {
  let received = false;

  const handler = (error: unknown) => {
    const digest =
      typeof error === "object" && error !== null && "digest" in error
        ? (error as { digest?: unknown }).digest
        : undefined;

    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
      received = true;
    }
  };

  process.on(event, handler);

  return {
    async waitForRedirect(timeout = 5_000) {
      try {
        await vi.waitFor(
          () => {
            if (!received) {
              throw new Error(
                `Expected a NEXT_REDIRECT ${event}, but none occurred`,
              );
            }
          },
          { timeout, interval: 20 },
        );
      } finally {
        process.off(event, handler);
      }
    },
    dispose() {
      process.off(event, handler);
    },
  };
}
