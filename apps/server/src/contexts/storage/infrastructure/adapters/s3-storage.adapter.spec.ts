import { S3Client } from '@aws-sdk/client-s3';
import type { ConfigService } from '@nestjs/config';

import { S3StorageAdapter } from './s3-storage.adapter';

describe('S3StorageAdapter', () => {
  const createConfig = (values: Record<string, string | undefined>) =>
    ({
      get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback),
    }) as unknown as ConfigService;

  let sendSpy: jest.SpyInstance;

  beforeEach(() => {
    sendSpy = jest
      .spyOn(S3Client.prototype, 'send')
      .mockResolvedValue({} as never);
  });

  afterEach(() => {
    sendSpy.mockRestore();
  });

  it('uploads under a unique key and returns the default AWS URL', async () => {
    const adapter = new S3StorageAdapter(
      createConfig({ S3_BUCKET_NAME: 'my-bucket', S3_REGION: 'us-east-1' }),
    );

    const url = await adapter.upload(
      {
        originalName: 'avatar.png',
        mediaType: 'image/png',
        buffer: Buffer.from('img'),
      },
      'avatars',
    );

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const command = sendSpy.mock.calls[0][0] as {
      input: Record<string, unknown>;
    };
    expect(command.input).toMatchObject({
      Bucket: 'my-bucket',
      ContentType: 'image/png',
    });
    expect(command.input.Key).toMatch(/^avatars\/\d+-\d+\.png$/);
    expect(url).toBe(
      `https://my-bucket.s3.us-east-1.amazonaws.com/${command.input.Key as string}`,
    );
  });

  it('returns a custom endpoint URL when one is configured (e.g. MinIO)', async () => {
    const adapter = new S3StorageAdapter(
      createConfig({
        S3_BUCKET_NAME: 'my-bucket',
        S3_ENDPOINT: 'http://localhost:9000',
      }),
    );

    const url = await adapter.upload(
      {
        originalName: 'avatar.png',
        mediaType: 'image/png',
        buffer: Buffer.from('img'),
      },
      'avatars',
    );

    const command = sendSpy.mock.calls[0][0] as {
      input: Record<string, unknown>;
    };
    expect(url).toBe(
      `http://localhost:9000/my-bucket/${command.input.Key as string}`,
    );
  });

  it('deletes by a plain storage key as-is', async () => {
    const adapter = new S3StorageAdapter(
      createConfig({ S3_BUCKET_NAME: 'my-bucket' }),
    );

    await adapter.delete('avatars/123-456.png');

    const command = sendSpy.mock.calls[0][0] as {
      input: Record<string, unknown>;
    };
    expect(command.input).toEqual({
      Bucket: 'my-bucket',
      Key: 'avatars/123-456.png',
    });
  });

  it('resolves the key from a default AWS URL before deleting', async () => {
    const adapter = new S3StorageAdapter(
      createConfig({ S3_BUCKET_NAME: 'my-bucket', S3_REGION: 'us-east-1' }),
    );

    await adapter.delete(
      'https://my-bucket.s3.us-east-1.amazonaws.com/avatars/123-456.png',
    );

    const command = sendSpy.mock.calls[0][0] as {
      input: Record<string, unknown>;
    };
    expect(command.input.Key).toBe('avatars/123-456.png');
  });

  it('resolves the key from a custom MinIO-style URL before deleting', async () => {
    const adapter = new S3StorageAdapter(
      createConfig({
        S3_BUCKET_NAME: 'my-bucket',
        S3_ENDPOINT: 'http://localhost:9000',
      }),
    );

    await adapter.delete('http://localhost:9000/my-bucket/avatars/123-456.png');

    const command = sendSpy.mock.calls[0][0] as {
      input: Record<string, unknown>;
    };
    expect(command.input.Key).toBe('avatars/123-456.png');
  });
});
