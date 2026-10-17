/** Giới hạn chung cho việc chép khi mở trang hay khi gắn nguồn (TQ-PAC-05). */
export const SYNC_TIME_LIMIT_MS = 10_000;

/**
 * Đợi `work` tối đa `ms`. true nếu xong kịp; false nếu hết giờ — việc vẫn
 * chạy tiếp ở nền, người gọi dùng dữ liệu đang có.
 */
export async function withinTimeLimit(
  work: Promise<unknown>,
  ms: number,
): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), ms);
    // Không giữ tiến trình sống chỉ vì bộ đếm này.
    timer.unref?.();
  });
  try {
    return await Promise.race([work.then(() => true as const), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
