import { AggregateRoot } from '@shared/domain/aggregate-root';

import { ProjectLifecycleTransitionedEvent } from './events';
import { ProjectCycle } from './project-cycle.entity';
import {
  ProjectCycleEndReason,
  ProjectLifecycleState,
  ProjectLifecycleAction,
} from './enums';
import {
  InvalidProjectTitleException,
  InvalidProjectTransitionException,
  ProjectCycleNotFoundException,
} from './exceptions';
import { IntendedOutcome, ProjectId } from './value-objects';

const MAX_TITLE_LENGTH = 200;

export interface ProjectProps {
  id: ProjectId;
  ownerId: string;
  title: string;
  description: string | null;
  lifecycleState: ProjectLifecycleState;
  revision: number;
  cycles: ProjectCycle[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectPrimitives {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  lifecycleState: ProjectLifecycleState;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Project extends AggregateRoot {
  private constructor(private readonly props: ProjectProps) {
    super();
  }

  public static create(input: {
    ownerId: string;
    title: string;
    description?: string | null;
  }): Project {
    const now = new Date();

    return new Project({
      id: ProjectId.generate(),
      ownerId: input.ownerId,
      title: Project.normalizeTitle(input.title),
      description: Project.normalizeDescription(input.description),
      lifecycleState: ProjectLifecycleState.NOT_STARTED,
      revision: 1,
      cycles: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  public static rehydrate(props: ProjectProps): Project {
    return new Project({
      ...props,
      cycles: [...props.cycles],
    });
  }

  public get id(): string {
    return this.props.id.value;
  }

  public get ownerId(): string {
    return this.props.ownerId;
  }

  public get title(): string {
    return this.props.title;
  }

  public get description(): string | null {
    return this.props.description;
  }

  public get lifecycleState(): ProjectLifecycleState {
    return this.props.lifecycleState;
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

  public get cycles(): readonly ProjectCycle[] {
    return [...this.props.cycles];
  }

  public get currentCycle(): ProjectCycle | null {
    return this.getOpenCycle();
  }

  public update(input: { title: string; description?: string | null }): void {
    const nextTitle = Project.normalizeTitle(input.title);
    const nextDescription = Project.normalizeDescription(input.description);

    const changed =
      this.props.title !== nextTitle ||
      this.props.description !== nextDescription;

    if (!changed) {
      return;
    }

    this.props.title = nextTitle;
    this.props.description = nextDescription;
    this.trackChange();
  }

  public start(): void {
    this.ensureState([ProjectLifecycleState.NOT_STARTED], 'start');
    const fromState = this.props.lifecycleState;

    const cycle = ProjectCycle.create({
      cycleNumber: this.props.cycles.length + 1,
      startedAt: new Date(),
    });

    this.props.cycles.push(cycle);
    this.props.lifecycleState = ProjectLifecycleState.ACTIVE;
    this.trackChange();

    this.addDomainEvent(
      new ProjectLifecycleTransitionedEvent(
        this.props.id.value,
        cycle.id,
        ProjectLifecycleAction.START,
        fromState,
        this.props.lifecycleState,
      ),
    );
  }

  public pause(): void {
    this.ensureState([ProjectLifecycleState.ACTIVE], 'pause');
    const fromState = this.props.lifecycleState;

    this.props.lifecycleState = ProjectLifecycleState.PAUSED;
    this.trackChange();

    this.addDomainEvent(
      new ProjectLifecycleTransitionedEvent(
        this.props.id.value,
        this.getOpenCycle()?.id ?? null,
        ProjectLifecycleAction.PAUSE,
        fromState,
        this.props.lifecycleState,
      ),
    );
  }

  public resume(): void {
    this.ensureState([ProjectLifecycleState.PAUSED], 'resume');
    const fromState = this.props.lifecycleState;

    this.props.lifecycleState = ProjectLifecycleState.ACTIVE;
    this.trackChange();

    this.addDomainEvent(
      new ProjectLifecycleTransitionedEvent(
        this.props.id.value,
        this.getOpenCycle()?.id ?? null,
        ProjectLifecycleAction.RESUME,
        fromState,
        this.props.lifecycleState,
      ),
    );
  }

  public stop(): void {
    this.ensureState(
      [
        ProjectLifecycleState.NOT_STARTED,
        ProjectLifecycleState.ACTIVE,
        ProjectLifecycleState.PAUSED,
      ],
      'stop',
    );
    const fromState = this.props.lifecycleState;
    const openCycle = this.getOpenCycle();
    openCycle?.close(ProjectCycleEndReason.STOPPED);

    this.props.lifecycleState = ProjectLifecycleState.STOPPED;
    this.trackChange();

    this.addDomainEvent(
      new ProjectLifecycleTransitionedEvent(
        this.props.id.value,
        openCycle?.id ?? null,
        ProjectLifecycleAction.STOP,
        fromState,
        this.props.lifecycleState,
      ),
    );
  }

  public complete(): void {
    this.ensureState(
      [ProjectLifecycleState.ACTIVE, ProjectLifecycleState.PAUSED],
      'complete',
    );
    const fromState = this.props.lifecycleState;

    const openCycle = this.getOpenCycle();
    if (!openCycle) {
      throw new ProjectCycleNotFoundException(this.props.id.value);
    }
    openCycle.close(ProjectCycleEndReason.COMPLETED);

    this.props.lifecycleState = ProjectLifecycleState.COMPLETED;
    this.trackChange();

    this.addDomainEvent(
      new ProjectLifecycleTransitionedEvent(
        this.props.id.value,
        openCycle.id,
        ProjectLifecycleAction.COMPLETE,
        fromState,
        this.props.lifecycleState,
      ),
    );
  }

  public reopen(): void {
    this.ensureState(
      [ProjectLifecycleState.STOPPED, ProjectLifecycleState.COMPLETED],
      'reopen',
    );
    const fromState = this.props.lifecycleState;

    const cycle = ProjectCycle.create({
      cycleNumber: this.props.cycles.length + 1,
      startedAt: new Date(),
    });

    this.props.cycles.push(cycle);
    this.props.lifecycleState = ProjectLifecycleState.ACTIVE;
    this.trackChange();

    this.addDomainEvent(
      new ProjectLifecycleTransitionedEvent(
        this.props.id.value,
        cycle.id,
        ProjectLifecycleAction.REOPEN,
        fromState,
        this.props.lifecycleState,
      ),
    );
  }

  public setIntendedOutcome(raw: string): void {
    this.ensureState(
      [ProjectLifecycleState.ACTIVE, ProjectLifecycleState.PAUSED],
      'set intended outcome for',
    );

    const openCycle = this.getOpenCycle();
    if (!openCycle) {
      throw new ProjectCycleNotFoundException(this.props.id.value);
    }

    openCycle.setIntendedOutcome(IntendedOutcome.create(raw));
    this.trackChange();
  }

  public canBeDeleted(): boolean {
    return this.props.cycles.length === 0;
  }

  public toPrimitives(): ProjectPrimitives {
    return {
      id: this.props.id.value,
      ownerId: this.props.ownerId,
      title: this.props.title,
      description: this.props.description,
      lifecycleState: this.props.lifecycleState,
      revision: this.props.revision,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }

  private getOpenCycle(): ProjectCycle | null {
    return this.props.cycles.find((cycle) => cycle.isOpen) ?? null;
  }

  private ensureState(allowed: ProjectLifecycleState[], action: string): void {
    if (!allowed.includes(this.props.lifecycleState)) {
      throw new InvalidProjectTransitionException(
        this.props.lifecycleState,
        action,
      );
    }
  }

  private trackChange(): void {
    this.props.revision += 1;
    this.props.updatedAt = new Date();
  }

  private static normalizeTitle(title: string): string {
    const normalizedTitle = title.trim();

    if (!normalizedTitle || [...normalizedTitle].length > MAX_TITLE_LENGTH) {
      throw new InvalidProjectTitleException();
    }

    return normalizedTitle;
  }

  private static normalizeDescription(
    description?: string | null,
  ): string | null {
    return description?.trim() || null;
  }
}
