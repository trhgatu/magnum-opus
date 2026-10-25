import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { LinkActivitySourceDto } from './link-activity-source.dto';

const errorsOf = async (body: object) =>
  (await validate(plainToInstance(LinkActivitySourceDto, body))).flatMap(
    (error) => Object.values(error.constraints ?? {}),
  );

describe('LinkActivitySourceDto', () => {
  it.each([
    { provider: 'GITHUB', externalResourceId: '1067270000' },
    {
      provider: 'WAKATIME',
      externalResourceId: '8f3c1d2e-4b5a-4c6d-9e8f-0a1b2c3d4e5f',
    },
  ])('accepts %o', async (body) => {
    await expect(errorsOf(body)).resolves.toEqual([]);
  });

  it.each([
    // Id WakaTime gửi cho GitHub: không phải số.
    [
      { provider: 'GITHUB', externalResourceId: '8f3c1d2e-4b5a' },
      'externalResourceId must be a numeric repository id',
    ],
    // Số 0 ở đầu sẽ thành một nguồn thứ hai của cùng repository.
    [
      { provider: 'GITHUB', externalResourceId: '01067270000' },
      'externalResourceId must be a numeric repository id',
    ],
    [
      { provider: 'WAKATIME', externalResourceId: 'magnum opus' },
      'externalResourceId must be a WakaTime project id',
    ],
    [
      { provider: 'WAKATIME', externalResourceId: 'a'.repeat(65) },
      'externalResourceId must be a WakaTime project id',
    ],
    [
      { provider: 'WAKATIME', externalResourceId: 42 },
      'externalResourceId must be a WakaTime project id',
    ],
  ])('rejects %o', async (body, message) => {
    await expect(errorsOf(body)).resolves.toEqual([message]);
  });

  it('rejects a provider that cannot be linked, and its id with it', async () => {
    const errors = await errorsOf({
      provider: 'GITLAB',
      externalResourceId: '1',
    });

    expect(errors).toHaveLength(2);
    // Không mượn câu chữ của GitHub cho một provider khác.
    expect(errors).toContain(
      'externalResourceId cannot be checked without a linkable provider',
    );
  });
});
