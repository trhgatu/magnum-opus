import * as path from 'path';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    writeFile: jest.fn(),
    unlink: jest.fn(),
  },
}));

import * as fs from 'fs';
import type { ConfigService } from '@nestjs/config';
import { LocalStorageAdapter } from './local-storage.adapter';

describe('LocalStorageAdapter', () => {
  const existsSync = fs.existsSync as jest.Mock;
  const mkdirSync = fs.mkdirSync as jest.Mock;
  const writeFile = fs.promises.writeFile as jest.Mock;
  const unlink = fs.promises.unlink as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    existsSync.mockReturnValue(true);
    writeFile.mockResolvedValue(undefined);
    unlink.mockResolvedValue(undefined);
  });

  const createAdapter = () => new LocalStorageAdapter({} as ConfigService);

  it('creates the base upload directory when it does not exist yet', () => {
    existsSync.mockReturnValue(false);

    createAdapter();

    expect(mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining(path.join('public', 'uploads')),
      { recursive: true },
    );
  });

  it('skips creating the base directory when it already exists', () => {
    existsSync.mockReturnValue(true);

    createAdapter();

    expect(mkdirSync).not.toHaveBeenCalled();
  });

  it('writes the file under a unique name and returns its public URL', async () => {
    const adapter = createAdapter();

    const url = await adapter.upload(
      {
        originalName: 'avatar.png',
        mediaType: 'image/png',
        buffer: Buffer.from('img'),
      },
      'avatars',
    );

    expect(writeFile).toHaveBeenCalledWith(
      expect.stringContaining(path.join('avatars')),
      expect.any(Buffer),
    );
    expect(url).toMatch(/^\/public\/uploads\/avatars\/\d+-\d+\.png$/);
  });

  it('creates the target subfolder when uploading into a new folder', async () => {
    existsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);
    const adapter = createAdapter();

    await adapter.upload(
      {
        originalName: 'a.png',
        mediaType: 'image/png',
        buffer: Buffer.from('x'),
      },
      'new-folder',
    );

    expect(mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('new-folder'),
      { recursive: true },
    );
  });

  it('deletes the file on disk when it exists', async () => {
    existsSync.mockReturnValue(true);
    const adapter = createAdapter();

    await adapter.delete('/public/uploads/avatars/123-456.png');

    expect(unlink).toHaveBeenCalledWith(
      expect.stringContaining(path.join('avatars', '123-456.png')),
    );
  });

  it('does nothing when the file to delete no longer exists', async () => {
    existsSync.mockReturnValue(false);
    const adapter = createAdapter();

    await adapter.delete('/public/uploads/missing.png');

    expect(unlink).not.toHaveBeenCalled();
  });
});
