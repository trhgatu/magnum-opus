import { GetGardenQuery } from '../../application/queries/get-garden.query';
import { GardenController } from './garden.controller';

describe('GardenController', () => {
  const queryBus = { execute: jest.fn() };
  const controller = new GardenController(queryBus as never);

  it("returns the authenticated owner's garden", async () => {
    queryBus.execute.mockResolvedValue({
      today: '2026-11-16',
      lanterns: [
        {
          id: 'lantern-id',
          memoryId: 'memory-id',
          occurredOn: '2018-08-01',
          precision: 'MONTH',
          placedOn: '2018-08-15',
        },
      ],
      trees: [
        {
          id: 'subject-id',
          subjectKind: 'HABIT',
          subjectId: 'habit-id',
          variant: 'BUILD',
          name: 'Gym',
          nameAtPlanting: 'Gym',
          bed: null,
          simVersion: 1,
          plantedOn: '2026-11-16',
          weeks: [{ start: '2026-11-16', status: 'PENDING', scarred: false }],
          weeds: 0,
        },
      ],
    });

    const response = await controller.get('owner-id');

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetGardenQuery('owner-id'),
    );
    expect(response).toEqual({
      today: '2026-11-16',
      lanterns: [
        {
          id: 'lantern-id',
          memoryId: 'memory-id',
          occurredOn: '2018-08-01',
          precision: 'MONTH',
          placedOn: '2018-08-15',
        },
      ],
      trees: [
        {
          id: 'subject-id',
          subjectKind: 'HABIT',
          subjectId: 'habit-id',
          variant: 'BUILD',
          name: 'Gym',
          nameAtPlanting: 'Gym',
          bed: null,
          simVersion: 1,
          plantedOn: '2026-11-16',
          weeks: [{ start: '2026-11-16', status: 'PENDING', scarred: false }],
          weeds: 0,
        },
      ],
    });
  });
});
