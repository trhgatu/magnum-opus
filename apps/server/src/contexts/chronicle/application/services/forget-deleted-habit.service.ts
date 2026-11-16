import { Inject, Injectable } from '@nestjs/common';

import {
  CHRONICLE_SNAPSHOT_REPOSITORY,
  type ChronicleSnapshotRepository,
} from '../ports/chronicle-snapshot.repository.port';
import { HabitSectionData } from '../section-data';

type HabitRef = { habitId: string | null; habitTitle: string | null };

/**
 * Quên tên habit trong section đã lưu. Trả null khi section không nhắc tới
 * habit này. Snapshot v1 không có habitId nên không bao giờ khớp.
 */
export function forgetHabitTitle(
  data: HabitSectionData,
  habitId: string,
): HabitSectionData | null {
  const matches = (item: HabitRef | null): boolean => item?.habitId === habitId;

  if (
    !matches(data.bestStreak) &&
    !matches(data.mostConsistentHabit) &&
    !data.quitHabits.some(matches)
  ) {
    return null;
  }

  const forget = <T extends HabitRef>(item: T): T =>
    matches(item) ? { ...item, habitTitle: null } : item;

  return {
    ...data,
    bestStreak: data.bestStreak && forget(data.bestStreak),
    mostConsistentHabit:
      data.mostConsistentHabit && forget(data.mostConsistentHabit),
    quitHabits: data.quitHabits.map(forget),
  };
}

// BR-HAB4-007: xóa vĩnh viễn thì tên habit không còn trong Chronicle.
// Chạy lại an toàn: lần 2 không còn tên để quên.
@Injectable()
export class ForgetDeletedHabitService {
  constructor(
    @Inject(CHRONICLE_SNAPSHOT_REPOSITORY)
    private readonly snapshots: ChronicleSnapshotRepository,
  ) {}

  public async execute(ownerId: string, habitId: string): Promise<void> {
    const sections = await this.snapshots.findSectionsForOwner(
      ownerId,
      'habit',
    );

    for (const section of sections) {
      const forgotten = forgetHabitTitle(
        section.data as HabitSectionData,
        habitId,
      );

      if (forgotten) {
        await this.snapshots.updateSectionData(section.id, forgotten);
      }
    }
  }
}
