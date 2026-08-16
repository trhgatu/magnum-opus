import { AggregateRoot } from '@/shared/domain/aggregate-root';

import { JournalEntryState } from './enums';
import {
  InvalidJournalEntryTitleException,
  InvalidJournalEntryTransitionException,
} from './exceptions';
import { JournalEntryId } from '../domain/value-objects/';

const MAX_TITLE_LENGTH = 200;

export interface JournalEntryProps {
  id: JournalEntryId;
  ownerId: string;
  title: string | null;
  content: string;
  state: JournalEntryState;
  stateBeforeTrash: JournalEntryState | null;
  revision: number;
  trashedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalEntryPrimitives {
  id: string;
  ownerId: string;
  title: string | null;
  content: string;
  state: JournalEntryState;
  stateBeforeTrash: JournalEntryState | null;
  revision: number;
  trashedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class JournalEntry extends AggregateRoot {
  private constructor(private readonly props: JournalEntryProps) {
    super();
  }

  public static createDraft(input: {
    ownerId: string;
    title?: string | null;
    content?: string;
  }): JournalEntry {
    const now = new Date();
    return new JournalEntry({
      id: JournalEntryId.generate(),
      ownerId: input.ownerId,
      title: JournalEntry.normalizeTitle(input.title),
      content: input.content ?? '',
      state: JournalEntryState.DRAFT,
      stateBeforeTrash: null,
      revision: 1,
      trashedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static rehydrate(props: JournalEntryProps): JournalEntry {
    return new JournalEntry(props);
  }
  public get id(): string {
    return this.props.id.value;
  }

  public get ownerId(): string {
    return this.props.ownerId;
  }

  public get title(): string | null {
    return this.props.title;
  }

  public get content(): string {
    return this.props.content;
  }

  public get state(): JournalEntryState {
    return this.props.state;
  }

  public get stateBeforeTrash(): JournalEntryState | null {
    return this.props.stateBeforeTrash;
  }

  public get revision(): number {
    return this.props.revision;
  }

  public get trashedAt(): Date | null {
    return this.props.trashedAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public updateContent(input: {
    title?: string | null;
    content: string;
  }): void {
    this.ensureState(JournalEntryState.DRAFT, JournalEntryState.DRAFT);

    const nextTitle = JournalEntry.normalizeTitle(input.title);
    const contentChanged = this.props.content !== input.content;
    const titleChanged = this.props.title !== nextTitle;

    if (!contentChanged && !titleChanged) {
      return;
    }

    this.props.title = nextTitle;
    this.props.content = input.content;
    this.trackChange();
  }

  public seal(): void {
    this.ensureState(JournalEntryState.DRAFT, JournalEntryState.SEALED);

    this.props.state = JournalEntryState.SEALED;
    this.trackChange();
  }

  public reopen(): void {
    this.ensureState(JournalEntryState.SEALED, JournalEntryState.DRAFT);

    this.props.state = JournalEntryState.DRAFT;
    this.trackChange();
  }

  public moveToTrash(): void {
    if (this.props.state === JournalEntryState.TRASHED) {
      throw new InvalidJournalEntryTransitionException(
        JournalEntryState.TRASHED,
        JournalEntryState.TRASHED,
      );
    }

    this.props.stateBeforeTrash = this.props.state;
    this.props.state = JournalEntryState.TRASHED;
    this.props.trashedAt = new Date();
    this.trackChange();
  }

  public restore(): void {
    if (
      this.props.state !== JournalEntryState.TRASHED ||
      this.props.stateBeforeTrash === null
    ) {
      throw new InvalidJournalEntryTransitionException(
        this.props.state,
        this.props.state,
      );
    }

    const restoredState = this.props.stateBeforeTrash;

    this.props.state = restoredState;
    this.props.stateBeforeTrash = null;
    this.props.trashedAt = null;
    this.trackChange();
  }

  public toPrimitives(): JournalEntryPrimitives {
    return {
      id: this.props.id.value,
      ownerId: this.props.ownerId,
      title: this.props.title,
      content: this.props.content,
      state: this.props.state,
      stateBeforeTrash: this.props.stateBeforeTrash,
      revision: this.props.revision,
      trashedAt: this.props.trashedAt,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }

  private ensureState(
    expectedState: JournalEntryState,
    targetState: JournalEntryState,
  ): void {
    if (this.props.state !== expectedState) {
      throw new InvalidJournalEntryTransitionException(
        this.props.state,
        targetState,
      );
    }
  }

  private trackChange(): void {
    this.props.revision += 1;
    this.props.updatedAt = new Date();
  }

  private static normalizeTitle(title?: string | null): string | null {
    const normalizedTitle = title?.trim();

    if (!normalizedTitle) {
      return null;
    }

    if ([...normalizedTitle].length > MAX_TITLE_LENGTH) {
      throw new InvalidJournalEntryTitleException();
    }

    return normalizedTitle;
  }
}
