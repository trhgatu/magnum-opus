import type { MenuReader, MenuRecord } from '../../ports/menu-reader.port';
import { GetMenusQuery } from '../get-menus.query';
import { GetMenusQueryHandler } from './get-menus.handler';

describe('GetMenusQueryHandler', () => {
  const record = (overrides: Partial<MenuRecord>): MenuRecord => ({
    id: 'id',
    parentId: null,
    title: 'title',
    url: '/url',
    icon: null,
    permission: null,
    ...overrides,
  });

  const createHandler = (records: MenuRecord[]) => {
    const menuReader = {
      findAllOrdered: jest.fn().mockResolvedValue(records),
    } as unknown as jest.Mocked<MenuReader>;
    return new GetMenusQueryHandler(menuReader);
  };

  it('nests child menus under their parent root', async () => {
    const handler = createHandler([
      record({ id: 'r1', title: 'Dashboard', url: '/dashboard' }),
      record({ id: 'r2', title: 'Quản trị', url: '#' }),
      record({
        id: 'c1',
        parentId: 'r2',
        title: 'Người dùng',
        url: '/admin/users',
      }),
    ]);

    const result = await handler.execute(
      new GetMenusQuery({ permissions: [] }),
    );

    expect(result.getValue()).toEqual([
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: undefined,
        items: undefined,
      },
      {
        title: 'Quản trị',
        url: '#',
        icon: undefined,
        items: [{ title: 'Người dùng', url: '/admin/users', icon: undefined }],
      },
    ]);
  });

  it('hides menu items that require a permission the caller does not have', async () => {
    const handler = createHandler([
      record({ id: 'r1', title: 'Dashboard', url: '/dashboard' }),
      record({
        id: 'r2',
        title: 'Người dùng',
        url: '/admin/users',
        permission: 'user:read',
      }),
    ]);

    const result = await handler.execute(
      new GetMenusQuery({ permissions: [] }),
    );

    expect(result.getValue().map((item) => item.title)).toEqual(['Dashboard']);
  });

  it('shows a permission-gated item once the caller has that permission', async () => {
    const handler = createHandler([
      record({
        id: 'r1',
        title: 'Người dùng',
        url: '/admin/users',
        permission: 'user:read',
      }),
    ]);

    const result = await handler.execute(
      new GetMenusQuery({ permissions: ['user:read'] as never }),
    );

    expect(result.getValue().map((item) => item.title)).toEqual(['Người dùng']);
  });

  it('drops a placeholder group whose children were all filtered out', async () => {
    const handler = createHandler([
      record({ id: 'r1', title: 'Dashboard', url: '/dashboard' }),
      record({ id: 'r2', title: 'Quản trị', url: '#' }),
      record({
        id: 'c1',
        parentId: 'r2',
        title: 'Vai trò',
        url: '/admin/roles',
        permission: 'role:read',
      }),
    ]);

    const result = await handler.execute(
      new GetMenusQuery({ permissions: [] }),
    );

    expect(result.getValue().map((item) => item.title)).toEqual(['Dashboard']);
  });

  it('keeps a non-placeholder root even without children', async () => {
    const handler = createHandler([
      record({ id: 'r1', title: 'Dashboard', url: '/dashboard' }),
    ]);

    const result = await handler.execute(
      new GetMenusQuery({ permissions: [] }),
    );

    expect(result.getValue()).toEqual([
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: undefined,
        items: undefined,
      },
    ]);
  });
});
