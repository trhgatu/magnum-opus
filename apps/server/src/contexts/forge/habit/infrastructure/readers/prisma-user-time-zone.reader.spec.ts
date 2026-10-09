import { PrismaUserTimeZoneReader } from './prisma-user-time-zone.reader';

describe('PrismaUserTimeZoneReader', () => {
  const userModel = { findUniqueOrThrow: jest.fn() };
  const prisma = { user: userModel };
  const reader = new PrismaUserTimeZoneReader(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the user's configured time zone", async () => {
    userModel.findUniqueOrThrow.mockResolvedValue({
      timeZone: 'Asia/Ho_Chi_Minh',
    });

    await expect(reader.getForUser('owner-id')).resolves.toBe(
      'Asia/Ho_Chi_Minh',
    );

    expect(userModel.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'owner-id' },
      select: { timeZone: true },
    });
  });

  it('propagates the not-found error when the user no longer exists', async () => {
    const notFound = new Error('user not found');
    userModel.findUniqueOrThrow.mockRejectedValue(notFound);

    await expect(reader.getForUser('owner-id')).rejects.toThrow(notFound);
  });
});
