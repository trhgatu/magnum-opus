import { GetTimelineQuery } from '../get-timeline.query';
import { GetTimelineHandler } from './get-timeline.handler';

describe('GetTimelineHandler', () => {
  const reader = { findAllForOwner: jest.fn() };
  const handler = new GetTimelineHandler(reader as never);

  beforeEach(() => {
    jest.clearAllMocks();
    reader.findAllForOwner.mockResolvedValue({ entries: [], total: 0 });
  });

  it('translates the requested page into skip/take for the reader', async () => {
    const result = await handler.execute(
      new GetTimelineQuery('owner-1', 3, 20),
    );

    expect(result.isSuccess).toBe(true);
    expect(reader.findAllForOwner).toHaveBeenCalledWith('owner-1', {
      skip: 40,
      take: 20,
    });
  });

  it('defaults to the first page and a page size of 20', async () => {
    await handler.execute(new GetTimelineQuery('owner-1'));

    expect(reader.findAllForOwner).toHaveBeenCalledWith('owner-1', {
      skip: 0,
      take: 20,
    });
  });
});
