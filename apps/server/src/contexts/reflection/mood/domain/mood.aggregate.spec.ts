import { MoodLabel } from './enums';
import {
  InvalidMoodIntensityException,
  InvalidMoodNoteException,
} from './exceptions';
import { Mood } from './mood.aggregate';
import { MoodId } from './value-objects';

describe('Mood', () => {
  describe('create', () => {
    it('creates a Mood at revision 1', () => {
      const mood = Mood.create({
        journalEntryId: 'entry-1',
        label: MoodLabel.CALM,
        intensity: 3,
        note: '  Quiet after the rain  ',
      });

      expect(mood.id).toBeTruthy();
      expect(mood.journalEntryId).toBe('entry-1');
      expect(mood.label).toBe(MoodLabel.CALM);
      expect(mood.intensity).toBe(3);
      expect(mood.note).toBe('Quiet after the rain');
      expect(mood.revision).toBe(1);
      expect(mood.createdAt).toBeInstanceOf(Date);
      expect(mood.updatedAt).toBeInstanceOf(Date);
    });

    it('normalizes omitted optional fields to null', () => {
      const mood = Mood.create({
        journalEntryId: 'entry-1',
        label: MoodLabel.NEUTRAL,
      });

      expect(mood.intensity).toBeNull();
      expect(mood.note).toBeNull();
    });

    it('normalizes a blank note to null', () => {
      const mood = Mood.create({
        journalEntryId: 'entry-1',
        label: MoodLabel.HOPEFUL,
        note: '   ',
      });

      expect(mood.note).toBeNull();
    });

    it.each([0, 6, -1, 1.5])('rejects invalid intensity %s', (intensity) => {
      expect(() =>
        Mood.create({
          journalEntryId: 'entry-1',
          label: MoodLabel.ANXIOUS,
          intensity,
        }),
      ).toThrow(InvalidMoodIntensityException);
    });

    it('rejects a note longer than 500 characters', () => {
      expect(() =>
        Mood.create({
          journalEntryId: 'entry-1',
          label: MoodLabel.CALM,
          note: 'a'.repeat(501),
        }),
      ).toThrow(InvalidMoodNoteException);
    });
  });

  describe('update', () => {
    it('updates the Mood and increments its revision', () => {
      const mood = createMood();

      mood.update({
        label: MoodLabel.HOPEFUL,
        intensity: 4,
        note: 'A clearer direction',
      });

      expect(mood.label).toBe(MoodLabel.HOPEFUL);
      expect(mood.intensity).toBe(4);
      expect(mood.note).toBe('A clearer direction');
      expect(mood.revision).toBe(2);
    });

    it('does not increment revision when normalized values are unchanged', () => {
      const mood = createMood();

      mood.update({
        label: MoodLabel.CALM,
        intensity: 3,
        note: '  Initial note  ',
      });

      expect(mood.revision).toBe(1);
    });

    it('clears optional values when they are omitted', () => {
      const mood = createMood();

      mood.update({
        label: MoodLabel.NEUTRAL,
      });

      expect(mood.label).toBe(MoodLabel.NEUTRAL);
      expect(mood.intensity).toBeNull();
      expect(mood.note).toBeNull();
      expect(mood.revision).toBe(2);
    });

    it('validates new values before changing existing state', () => {
      const mood = createMood();

      expect(() =>
        mood.update({
          label: MoodLabel.ANGRY,
          intensity: 10,
          note: 'Invalid update',
        }),
      ).toThrow(InvalidMoodIntensityException);

      expect(mood.label).toBe(MoodLabel.CALM);
      expect(mood.intensity).toBe(3);
      expect(mood.note).toBe('Initial note');
      expect(mood.revision).toBe(1);
    });
  });

  describe('rehydrate', () => {
    it('restores an existing Mood without changing its state', () => {
      const createdAt = new Date('2026-08-01T00:00:00.000Z');
      const updatedAt = new Date('2026-08-02T00:00:00.000Z');

      const mood = Mood.rehydrate({
        id: new MoodId('mood-1'),
        journalEntryId: 'entry-1',
        label: MoodLabel.SAD,
        intensity: 2,
        note: 'Existing note',
        revision: 7,
        createdAt,
        updatedAt,
      });

      expect(mood.toPrimitives()).toEqual({
        id: 'mood-1',
        journalEntryId: 'entry-1',
        label: MoodLabel.SAD,
        intensity: 2,
        note: 'Existing note',
        revision: 7,
        createdAt,
        updatedAt,
      });

      expect(mood.getDomainEvents()).toEqual([]);
    });
  });
});

function createMood(): Mood {
  return Mood.create({
    journalEntryId: 'entry-1',
    label: MoodLabel.CALM,
    intensity: 3,
    note: 'Initial note',
  });
}
