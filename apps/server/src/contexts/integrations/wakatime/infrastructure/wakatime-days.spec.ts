import { daysTouching, mapWithLimit } from './wakatime-days';

const VN = 'Asia/Ho_Chi_Minh';

describe('daysTouching', () => {
  it('lists the days of the account time zone that the window touches', () => {
    // 22/10 03:00 → 24/10 12:00 giờ Việt Nam.
    expect(
      daysTouching(
        new Date('2026-10-21T20:00:00.000Z'),
        new Date('2026-10-24T05:00:00.000Z'),
        VN,
      ),
    ).toEqual(['2026-10-22', '2026-10-23', '2026-10-24']);
  });

  it('uses the account time zone, not UTC, to decide the day', () => {
    // 23/10 18:00Z đã là 24/10 01:00 ở Việt Nam, vẫn là 23/10 ở UTC.
    const from = new Date('2026-10-23T18:00:00.000Z');
    const to = new Date('2026-10-23T19:00:00.000Z');

    expect(daysTouching(from, to, VN)).toEqual(['2026-10-24']);
    expect(daysTouching(from, to, 'UTC')).toEqual(['2026-10-23']);
  });

  it('leaves out the day that only the excluded end touches', () => {
    // [22/10 00:00, 24/10 00:00) giờ Việt Nam: 24/10 không thuộc khoảng.
    expect(
      daysTouching(
        new Date('2026-10-21T17:00:00.000Z'),
        new Date('2026-10-23T17:00:00.000Z'),
        VN,
      ),
    ).toEqual(['2026-10-22', '2026-10-23']);
  });

  it('crosses month and year boundaries', () => {
    expect(
      daysTouching(
        new Date('2026-12-31T10:00:00.000Z'),
        new Date('2027-01-01T10:00:00.000Z'),
        'UTC',
      ),
    ).toEqual(['2026-12-31', '2027-01-01']);
  });

  it('returns no day for an empty window', () => {
    const at = new Date('2026-10-24T05:00:00.000Z');

    expect(daysTouching(at, at, VN)).toEqual([]);
    expect(daysTouching(at, new Date(at.getTime() - 1), VN)).toEqual([]);
  });
});

describe('mapWithLimit', () => {
  /** Promise được giải quyết bằng tay, để kiểm số việc chạy cùng lúc. */
  const deferred = () => {
    let resolve!: (value: number) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<number>((done, fail) => {
      resolve = done;
      reject = fail;
    });
    return { promise, resolve, reject };
  };
  const flush = () => new Promise((done) => setImmediate(done));

  it('never runs more than the limit at once and keeps the order', async () => {
    const pending = Array.from({ length: 6 }, deferred);
    let running = 0;
    let peak = 0;
    const task = async (index: number) => {
      running += 1;
      peak = Math.max(peak, running);
      try {
        return await pending[index].promise;
      } finally {
        running -= 1;
      }
    };

    const result = mapWithLimit([0, 1, 2, 3, 4, 5], 4, task);
    await flush();
    expect(running).toBe(4);

    // Xong ngược thứ tự: kết quả vẫn theo thứ tự đầu vào.
    for (const index of [5, 4, 3, 2, 1, 0]) {
      pending[index].resolve(index * 10);
      await flush();
    }

    await expect(result).resolves.toEqual([0, 10, 20, 30, 40, 50]);
    expect(peak).toBe(4);
  });

  it('starts nothing new once a task fails', async () => {
    const pending = Array.from({ length: 6 }, deferred);
    const started: number[] = [];
    const task = (index: number) => {
      started.push(index);
      return pending[index].promise;
    };

    // Bắt lỗi ngay: result bị reject trước khi test kịp đợi nó.
    const result = mapWithLimit([0, 1, 2, 3, 4, 5], 2, task).catch(
      (error: unknown) => error,
    );
    await flush();
    pending[0].reject(new Error('day 0 failed'));
    await flush();
    pending[1].resolve(1);
    await flush();

    await expect(result).resolves.toEqual(new Error('day 0 failed'));
    expect(started).toEqual([0, 1]);
  });

  it('handles an empty list', async () => {
    const task = jest.fn();

    await expect(mapWithLimit([], 4, task)).resolves.toEqual([]);
    expect(task).not.toHaveBeenCalled();
  });
});
