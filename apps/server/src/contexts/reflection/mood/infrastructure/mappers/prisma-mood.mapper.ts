import {
  Mood as PrismaMood,
  MoodLabel as PrismaMoodLabel,
} from '@repo/database';

import { MoodLabel } from '../../domain/enums';
import { Mood } from '../../domain/mood.aggregate';
import { MoodId } from '../../domain/value-objects';

const domainLabels: Record<PrismaMoodLabel, MoodLabel> = {
  [PrismaMoodLabel.JOYFUL]: MoodLabel.JOYFUL,
  [PrismaMoodLabel.CALM]: MoodLabel.CALM,
  [PrismaMoodLabel.HOPEFUL]: MoodLabel.HOPEFUL,
  [PrismaMoodLabel.ENERGETIC]: MoodLabel.ENERGETIC,
  [PrismaMoodLabel.NEUTRAL]: MoodLabel.NEUTRAL,
  [PrismaMoodLabel.TIRED]: MoodLabel.TIRED,
  [PrismaMoodLabel.ANXIOUS]: MoodLabel.ANXIOUS,
  [PrismaMoodLabel.SAD]: MoodLabel.SAD,
  [PrismaMoodLabel.ANGRY]: MoodLabel.ANGRY,
  [PrismaMoodLabel.OVERWHELMED]: MoodLabel.OVERWHELMED,
};

const persistenceLabels: Record<MoodLabel, PrismaMoodLabel> = {
  [MoodLabel.JOYFUL]: PrismaMoodLabel.JOYFUL,
  [MoodLabel.CALM]: PrismaMoodLabel.CALM,
  [MoodLabel.HOPEFUL]: PrismaMoodLabel.HOPEFUL,
  [MoodLabel.ENERGETIC]: PrismaMoodLabel.ENERGETIC,
  [MoodLabel.NEUTRAL]: PrismaMoodLabel.NEUTRAL,
  [MoodLabel.TIRED]: PrismaMoodLabel.TIRED,
  [MoodLabel.ANXIOUS]: PrismaMoodLabel.ANXIOUS,
  [MoodLabel.SAD]: PrismaMoodLabel.SAD,
  [MoodLabel.ANGRY]: PrismaMoodLabel.ANGRY,
  [MoodLabel.OVERWHELMED]: PrismaMoodLabel.OVERWHELMED,
};

export class PrismaMoodMapper {
  public static toDomain(raw: PrismaMood): Mood {
    return Mood.rehydrate({
      id: new MoodId(raw.id),
      journalEntryId: raw.journalEntryId,
      label: domainLabels[raw.label],
      intensity: raw.intensity,
      note: raw.note,
      revision: raw.revision,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static toPersistence(mood: Mood): PrismaMood {
    const props = mood.toPrimitives();

    return {
      id: props.id,
      journalEntryId: props.journalEntryId,
      label: persistenceLabels[props.label],
      intensity: props.intensity,
      note: props.note,
      revision: props.revision,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
}
