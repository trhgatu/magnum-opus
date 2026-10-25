const DAY_MS = 86_400_000;

/**
 * Các ngày (YYYY-MM-DD, theo múi giờ tài khoản WakaTime) mà khoảng
 * [from, to) chạm vào, từ cũ tới mới.
 */

export function daysTouching(from: Date, to: Date, timeZone: string): string[] {
  if (to <= from) return [];

  const last = dayAt(new Date(to.getTime() - 1), timeZone);
  const days: string[] = [];
  for (let day = dayAt(from, timeZone); day <= last; day = nextDay(day)) {
    days.push(day);
  }
  return days;
}

/** Chạy `task` cho từng phần tử, tối đa `limit` cái cùng lúc, giữ thứ tự. */
export async function mapWithLimit<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  let failed = false;

  const worker = async () => {
    // Một phần tử lỗi thì không mở thêm request nào nữa.
    while (!failed && next < items.length) {
      const index = next;
      next += 1;
      try {
        results[index] = await task(items[index]);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

function dayAt(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';

  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** YYYY-MM-DD so sánh chuỗi đúng thứ tự thời gian; cộng ngày theo UTC. */
function nextDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) + DAY_MS)
    .toISOString()
    .slice(0, 10);
}
