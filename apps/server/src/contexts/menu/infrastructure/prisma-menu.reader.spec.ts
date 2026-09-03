import type { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaMenuReader } from './prisma-menu.reader';

describe('PrismaMenuReader', () => {
  it('finds every menu ordered by its display order', async () => {
    const menus = [{ id: 'm1', order: 1 }];
    const prisma = {
      menu: { findMany: jest.fn().mockResolvedValue(menus) },
    } as unknown as PrismaService;
    const reader = new PrismaMenuReader(prisma);

    await expect(reader.findAllOrdered()).resolves.toBe(menus);
    expect(prisma.menu.findMany).toHaveBeenCalledWith({
      orderBy: [{ order: 'asc' }],
    });
  });
});
