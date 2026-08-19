import { AggregateRoot } from '@shared/domain/aggregate-root';

import { MemoryCreatedEvent } from './events/memory-created.event';

import { MemoryDatePrecision, MemoryState } from './enums';

import {
  InvalidMemoryContentException,
  InvalidMemoryTitleException,
  InvalidMemoryTransitionException,
} from './exceptions';

import { MemoryId, MemoryOccurredOn } from './value-objects';

const MAX_TITLE_LENGTH = 200;

export interface MemoryProps {
  id: MemoryId;
  ownerId: string;
  sourceJournalEntryId: string | null;
  title: string;
  content: string;
  occurredOn: MemoryOccurredOn;
  state: MemoryState;
  revision: number;
  trashedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryPrimitives {
  id: string;
  ownerId: string;
  sourceJournalEntryId: string | null;
  title: string;
  content: string;
  occurredOn: string | null;
  occurredOnPrecision: MemoryDatePrecision;
  state: MemoryState;
  revision: number;
  trashedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Memory extends AggregateRoot {
  private constructor(private readonly props: MemoryProps) {
    super();
  }
  public static create(input: {
    ownerId: string;
    sourceJournalEntryId?: string | null;
    title: string;
    content: string;
    occurredOn?: MemoryOccurredOn;
  }): Memory {
    const now = new Date();
    const occurredOn = input.occurredOn ?? MemoryOccurredOn.unknown();

    const memory = new Memory({
      id: MemoryId.generate(),
      ownerId: input.ownerId,
      sourceJournalEntryId: input.sourceJournalEntryId ?? null,
      title: Memory.normalizeTitle(input.title),
      content: Memory.normalizeContent(input.content),
      occurredOn,
      state: MemoryState.ACTIVE,
      revision: 1,
      trashedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    memory.addDomainEvent(
      new MemoryCreatedEvent(
        memory.id,
        memory.ownerId,
        occurredOn.value ? new Date(occurredOn.value) : null,
      ),
    );
    return memory;
  }

  public static rehydrate(props: MemoryProps): Memory {
    return new Memory(props);
  }

  public get id(): string {
    return this.props.id.value;
  }

  public get ownerId(): string {
    return this.props.ownerId;
  }

  public get sourceJournalEntryId(): string | null {
    return this.props.sourceJournalEntryId;
  }

  public get title(): string {
    return this.props.title;
  }

  public get content(): string {
    return this.props.content;
  }

  public get occurredOn(): MemoryOccurredOn {
    return this.props.occurredOn;
  }

  public get state(): MemoryState {
    return this.props.state;
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

  public update(input: {
    title: string;
    content: string;
    occurredOn: MemoryOccurredOn;
  }): void {
    this.ensureState(MemoryState.ACTIVE, MemoryState.ACTIVE);

    const nextTitle = Memory.normalizeTitle(input.title);
    const nextContent = Memory.normalizeContent(input.content);

    const changed =
      this.props.title !== nextTitle ||
      this.props.content !== nextContent ||
      !this.props.occurredOn.equals(input.occurredOn);

    if (!changed) {
      return;
    }

    this.props.title = nextTitle;
    this.props.content = nextContent;
    this.props.occurredOn = input.occurredOn;
    this.trackChange();
  }

  public moveToTrash(): void {
    this.ensureState(MemoryState.ACTIVE, MemoryState.TRASHED);

    this.props.state = MemoryState.TRASHED;
    this.props.trashedAt = new Date();
    this.trackChange();
  }

  public restore(): void {
    this.ensureState(MemoryState.TRASHED, MemoryState.ACTIVE);

    this.props.state = MemoryState.ACTIVE;
    this.props.trashedAt = null;
    this.trackChange();
  }

  public toPrimitives(): MemoryPrimitives {
    return {
      id: this.props.id.value,
      ownerId: this.props.ownerId,
      sourceJournalEntryId: this.props.sourceJournalEntryId,
      title: this.props.title,
      content: this.props.content,
      occurredOn: this.props.occurredOn.value,
      occurredOnPrecision: this.props.occurredOn.precision,
      state: this.props.state,
      revision: this.props.revision,
      trashedAt: this.props.trashedAt,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }

  private ensureState(
    expectedState: MemoryState,
    targetState: MemoryState,
  ): void {
    if (this.props.state !== expectedState) {
      throw new InvalidMemoryTransitionException(this.props.state, targetState);
    }
  }

  private trackChange(): void {
    this.props.revision += 1;
    this.props.updatedAt = new Date();
  }

  private static normalizeTitle(title: string): string {
    const normalize = title.trim();

    if (!normalize || [...normalize].length > MAX_TITLE_LENGTH) {
      throw new InvalidMemoryTitleException();
    }
    return normalize;
  }

  private static normalizeContent(content: string): string {
    const normalize = content.trim();

    if (!normalize) {
      throw new InvalidMemoryContentException();
    }

    return normalize;
  }
}
