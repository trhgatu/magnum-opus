import { Mood } from '../mood.aggregate';

export const MOOD_REPOSITORY = Symbol('MOOD_REPOSITORY');

export interface MoodRepository {
  create(mood: Mood): Promise<boolean>;

  update(
    mood: Mood,
    ownerId: string,
    expectedRevision: number,
  ): Promise<boolean>;

  findByJournalEntryIdForOwner(
    journalEntryId: string,
    ownerId: string,
  ): Promise<Mood | null>;

  deleteByJournalEntryIdForOwner(
    journalEntryId: string,
    ownerId: string,
    expectedRevision: number,
  ): Promise<boolean>;
}
