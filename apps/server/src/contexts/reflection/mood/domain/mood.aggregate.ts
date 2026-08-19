import { AggregateRoot } from '@shared/domain/aggregate-root';

import { MoodLabel } from './enums';
import {
  InvalidMoodIntensityException,
  InvalidMoodNoteException,
} from './exceptions';

import { MoodId } from './value-objects';

const MAX_NOTE_LENGTH = 500;
const MIN_INTENSITY = 1;
const MAX_INTENSITY = 5;

export interface MoodProps {
  id: MoodId;
  journalEntryId: string;
  label: MoodLabel;
  intensity: number | null;
  note: string | null;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MoodPrimitives {
  id: string;
  journalEntryId: string;
  label: MoodLabel;
  intensity: number | null;
  note: string | null;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

// Mood không phát domain event: nó là ngữ cảnh gắn theo một Journal entry,
// không phải một khoảnh khắc độc lập trên Timeline. Xem
// journal-entry.aggregate.ts (seal) và memory.aggregate.ts (create) để biết
// pattern phát event khi một aggregate thực sự cần.
export class Mood extends AggregateRoot {
  private constructor(private readonly props: MoodProps) {
    super();
  }

  public static create(input: {
    journalEntryId: string;
    label: MoodLabel;
    intensity?: number | null;
    note?: string | null;
  }): Mood {
    const now = new Date();
    return new Mood({
      id: MoodId.generate(),
      journalEntryId: input.journalEntryId,
      label: input.label,
      intensity: Mood.normalizeIntensity(input.intensity),
      note: Mood.normalizeNote(input.note),
      revision: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static rehydrate(props: MoodProps): Mood {
    return new Mood(props);
  }

  public get id(): string {
    return this.props.id.value;
  }

  public get journalEntryId(): string {
    return this.props.journalEntryId;
  }

  public get label(): MoodLabel {
    return this.props.label;
  }

  public get intensity(): number | null {
    return this.props.intensity;
  }

  public get note(): string | null {
    return this.props.note;
  }

  public get revision(): number {
    return this.props.revision;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public update(input: {
    label: MoodLabel;
    intensity?: number | null;
    note?: string | null;
  }): void {
    const nextIntensity = Mood.normalizeIntensity(input.intensity);
    const nextNote = Mood.normalizeNote(input.note);

    const changed =
      this.props.label !== input.label ||
      this.props.intensity !== nextIntensity ||
      this.props.note !== nextNote;

    if (!changed) {
      return;
    }

    this.props.label = input.label;
    this.props.intensity = nextIntensity;
    this.props.note = nextNote;
    this.trackChange();
  }

  public toPrimitives(): MoodPrimitives {
    return {
      id: this.props.id.value,
      journalEntryId: this.props.journalEntryId,
      label: this.props.label,
      intensity: this.props.intensity,
      note: this.props.note,
      revision: this.props.revision,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }

  private trackChange(): void {
    this.props.revision += 1;
    this.props.updatedAt = new Date();
  }

  private static normalizeIntensity(intensity?: number | null): number | null {
    if (intensity === undefined || intensity === null) {
      return null;
    }
    if (
      !Number.isInteger(intensity) ||
      intensity < MIN_INTENSITY ||
      intensity > MAX_INTENSITY
    ) {
      throw new InvalidMoodIntensityException();
    }
    return intensity;
  }

  private static normalizeNote(note?: string | null): string | null {
    const normalizedNote = note?.trim();

    if (!normalizedNote) {
      return null;
    }

    if ([...normalizedNote].length > MAX_NOTE_LENGTH) {
      throw new InvalidMoodNoteException();
    }
    return normalizedNote;
  }
}
