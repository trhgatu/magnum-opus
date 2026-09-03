import type { StoragePort } from '../../application/ports/storage.port';
import { StorageController } from './storage.controller';

describe('StorageController', () => {
  it('uploads the file into the avatars folder and returns its URL', async () => {
    const storagePort = {
      upload: jest.fn().mockResolvedValue('/public/uploads/avatars/1-2.png'),
    } as unknown as jest.Mocked<StoragePort>;
    const controller = new StorageController(storagePort);

    const response = await controller.uploadFile({
      originalname: 'avatar.png',
      mimetype: 'image/png',
      buffer: Buffer.from('img'),
    });

    expect(storagePort.upload).toHaveBeenCalledWith(
      {
        originalName: 'avatar.png',
        mediaType: 'image/png',
        buffer: expect.any(Buffer),
      },
      'avatars',
    );
    expect(response).toEqual({ url: '/public/uploads/avatars/1-2.png' });
  });
});
