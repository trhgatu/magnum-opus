import { withinTimeLimit } from './within-time-limit';

describe('withinTimeLimit', () => {
  it('says the work finished in time', async () => {
    await expect(withinTimeLimit(Promise.resolve('done'), 50)).resolves.toBe(
      true,
    );
  });

  it('stops waiting once the time is up', async () => {
    const never = new Promise(() => undefined);

    await expect(withinTimeLimit(never, 10)).resolves.toBe(false);
  });

  it('passes a failure of the work through', async () => {
    await expect(
      withinTimeLimit(Promise.reject(new Error('boom')), 50),
    ).rejects.toThrow('boom');
  });
});
