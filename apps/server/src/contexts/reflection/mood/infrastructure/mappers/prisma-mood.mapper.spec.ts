import {
  Mood as PrismaMood,
  MoodLabel as PrismaMoodLabel,
} from '@repo/database';

import { MoodLabel } from '../../domain/enums';
import { PrismaMoodMapper } from './prisma-mood.mapper';

describe('PrismaMoodMapper', () => {
  const createdAt = new Date('2026-08-01T00:00:00.000Z');
  const updatedAt = new Date('2026-08-02T00:00:00.000Z');

  const raw: PrismaMood = {
    id: 'mood-1',
    journalEntryId: 'entry-1',
    label: PrismaMoodLabel.CALM,
    intensity: 3,
    note: 'Quiet after the rain',
    revision: 4,
    createdAt,
    updatedAt,
  };

  it('maps a Prisma record to the domain aggregate', () => {
    const mood = PrismaMoodMapper.toDomain(raw);

    expect(mood.toPrimitives()).toEqual({
      id: 'mood-1',
      journalEntryId: 'entry-1',
      label: MoodLabel.CALM,
      intensity: 3,
      note: 'Quiet after the rain',
      revision: 4,
      createdAt,
      updatedAt,
    });

    expect(mood.getDomainEvents()).toEqual([]);
  });

  it('maps the domain aggregate back to persistence', () => {
    const mood = PrismaMoodMapper.toDomain(raw);

    expect(PrismaMoodMapper.toPersistence(mood)).toEqual(raw);
  });

  it.each([
    [PrismaMoodLabel.JOYFUL, MoodLabel.JOYFUL],
    [PrismaMoodLabel.CALM, MoodLabel.CALM],
    [PrismaMoodLabel.HOPEFUL, MoodLabel.HOPEFUL],
    [PrismaMoodLabel.ENERGETIC, MoodLabel.ENERGETIC],
    [PrismaMoodLabel.NEUTRAL, MoodLabel.NEUTRAL],
    [PrismaMoodLabel.TIRED, MoodLabel.TIRED],
    [PrismaMoodLabel.ANXIOUS, MoodLabel.ANXIOUS],
    [PrismaMoodLabel.SAD, MoodLabel.SAD],
    [PrismaMoodLabel.ANGRY, MoodLabel.ANGRY],
    [PrismaMoodLabel.OVERWHELMED, MoodLabel.OVERWHELMED],
  ])('maps Prisma label %s to domain label %s', (prismaLabel, domainLabel) => {
    const mood = PrismaMoodMapper.toDomain({
      ...raw,
      label: prismaLabel,
    });

    expect(mood.label).toBe(domainLabel);
  });
});
