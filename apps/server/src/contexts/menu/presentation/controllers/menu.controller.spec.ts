import { Result } from '@shared/domain/result';

import { GetMenusQuery } from '../../application/queries/get-menus.query';
import { MenuController } from './menu.controller';

describe('MenuController', () => {
  it('requests the menu tree scoped to the caller permissions', async () => {
    const menuTree = [{ title: 'Dashboard', url: '/dashboard' }];
    const queryBus = {
      execute: jest.fn().mockResolvedValue(Result.ok(menuTree)),
    };
    const controller = new MenuController(queryBus as never);

    const response = await controller.getMenus(['user:read'] as never);

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetMenusQuery({ permissions: ['user:read'] as never }),
    );
    expect(response).toBe(menuTree);
  });
});
