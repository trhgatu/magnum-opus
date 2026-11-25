import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class OnThisDayItemNotFoundException extends DomainException {
  constructor(itemId: string) {
    super(
      `"${itemId}" is not on this day's list`,
      Errors.ON_THIS_DAY_ITEM_NOT_FOUND,
      { itemId },
    );
  }
}
