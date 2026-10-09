import { ChroniclePeriod } from '../../domain/value-objects';
import { ChronicleModule } from '../section-data';

export const CHRONICLE_SNAPSHOT_REPOSITORY = Symbol(
  'CHRONICLE_SNAPSHOT_REPOSITORY',
);

/** 1 section như đang lưu — `module` là string vì có thể là module đã bị gỡ. */
export interface StoredChronicleSection {
  module: string;
  schemaVersion: number;
  data: unknown;
}

export interface StoredChronicleSnapshot {
  id: string;
  /** Múi giờ owner lúc đóng băng — ranh giới kỳ của snapshot này. */
  timeZone: string;
  computedAt: Date;
  sections: StoredChronicleSection[];
}

export interface ChronicleSectionToStore {
  module: ChronicleModule;
  schemaVersion: number;
  data: unknown;
}

/**
 * Lưu/đọc snapshot của kỳ đã đóng (02-domain-analysis.md §4). Mọi race
 * (2 request cùng tạo snapshot, cùng tính bù 1 section) được xử lý BÊN
 * TRONG repository: hàm `...OrGet` luôn trả về bản đã thực sự được lưu —
 * của request này hoặc của request thắng — nên handler không cần biết
 * tới lỗi trùng khóa của database.
 */
export interface ChronicleSnapshotRepository {
  findForPeriod(
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<StoredChronicleSnapshot | null>;

  /** Tạo snapshot cùng mọi section trong 1 transaction, hoặc trả về snapshot đã có. */
  createOrGet(
    ownerId: string,
    period: ChroniclePeriod,
    computedAt: Date,
    sections: ChronicleSectionToStore[],
  ): Promise<StoredChronicleSnapshot>;

  /** Thêm section còn thiếu (DAP-CHR-007), hoặc trả về section đã có. */
  addSectionOrGet(
    snapshotId: string,
    section: ChronicleSectionToStore,
    computedAt: Date,
  ): Promise<StoredChronicleSection>;

  /** Thay section phiên bản cũ — chỉ cho reader thuần lịch sử (DAP-CHR-008 loại b). */
  replaceSection(
    snapshotId: string,
    section: ChronicleSectionToStore,
    computedAt: Date,
  ): Promise<StoredChronicleSection>;
}
