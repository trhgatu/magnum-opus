export const PROJECT_ACTIVITY_SOURCE_REPOSITORY = Symbol(
  'PROJECT_ACTIVITY_SOURCE_REPOSITORY',
);

/** Mối nối Project ↔ feed. Gỡ chỉ xóa mối nối; feed, sổ và snapshot ở lại. */
export interface ProjectActivitySourceLink {
  projectId: string;
  feedId: string;
  ownerId: string;
  linkedAt: Date;
}

export interface ProjectActivitySourceRepository {
  /** Nguồn của Project, theo linkedAt tăng dần. */
  listByProject(
    ownerId: string,
    projectId: string,
  ): Promise<ProjectActivitySourceLink[]>;
  findOne(
    ownerId: string,
    projectId: string,
    feedId: string,
  ): Promise<ProjectActivitySourceLink | null>;
  /**
   * Gắn feed vào Project và trả mối nối đã lưu. Feed đã là nguồn thì trả
   * mối nối có sẵn với created = false — không tạo mối nối thứ hai.
   */
  link(
    link: ProjectActivitySourceLink,
  ): Promise<{ link: ProjectActivitySourceLink; created: boolean }>;
  /** Trả false nếu feed không phải nguồn của Project. */
  unlink(ownerId: string, projectId: string, feedId: string): Promise<boolean>;
}
