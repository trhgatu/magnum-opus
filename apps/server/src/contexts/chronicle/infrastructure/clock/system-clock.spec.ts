import { SystemClock } from './system-clock';

describe('SystemClock', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the current system time', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-01T00:30:00.000Z'));

    expect(new SystemClock().now().toISOString()).toBe(
      '2026-09-01T00:30:00.000Z',
    );
  });

  it('returns a fresh Date on every call', () => {
    const clock = new SystemClock();

    expect(clock.now()).not.toBe(clock.now());
  });
});
