import type { User as PrismaUser, UserRole, Role } from '@repo/database';

import { PrismaUserMapper } from './prisma-user.mapper';

describe('PrismaUserMapper', () => {
  const createdAt = new Date('2026-08-20T10:00:00.000Z');
  const updatedAt = new Date('2026-08-21T10:00:00.000Z');

  const raw: PrismaUser = {
    id: 'user-id',
    email: 'member@example.com',
    username: 'member',
    password: 'hashed-password',
    avatar: null,
    isActive: true,
    isDeleted: false,
    tokenVersion: 2,
    emailVerifiedAt: null,
    timeZone: 'UTC',
    createdAt,
    updatedAt,
    createdBy: null,
    updatedBy: null,
  };

  it('maps a Prisma record with no role join to an empty roles list', () => {
    const user = PrismaUserMapper.toDomain(raw);

    expect(user.toPrimitives()).toEqual({
      id: 'user-id',
      email: 'member@example.com',
      username: 'member',
      password: 'hashed-password',
      avatar: null,
      isActive: true,
      isDeleted: false,
      tokenVersion: 2,
      emailVerifiedAt: null,
      roles: [],
      createdAt,
      updatedAt,
      createdBy: null,
      updatedBy: null,
    });
  });

  it('maps joined user roles to their role names', () => {
    const userRoles = [
      { role: { name: 'USER' } },
      { role: { name: 'ADMIN' } },
    ] as (UserRole & { role: Role })[];

    const user = PrismaUserMapper.toDomain({ ...raw, userRoles });

    expect(user.roles).toEqual(['USER', 'ADMIN']);
  });
});
