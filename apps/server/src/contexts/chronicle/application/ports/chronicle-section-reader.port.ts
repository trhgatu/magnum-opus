import { ChroniclePeriod } from '../../domain/value-objects';
import { ChronicleModule, ChronicleSectionDataByModule } from '../section-data';

/** Token của MẢNG mọi reader đã đăng ký (02-domain-analysis.md DAP-CHR-006). */
export const CHRONICLE_SECTION_READERS = Symbol('CHRONICLE_SECTION_READERS');

/**
 * Hợp đồng chung cho mọi module-reader của Chronicle. Mỗi reader tự khai
 * báo nó thuộc module nào và phiên bản shape `data` hiện tại, nên query
 * handler chỉ duyệt registry — không biết có bao nhiêu module.
 */
export interface ChronicleSectionReader<
  M extends ChronicleModule = ChronicleModule,
> {
  readonly module: M;

  /** Phiên bản shape của section data — DAP-CHR-008. Bắt đầu từ 1. */
  readonly schemaVersion: number;

  getSummary(
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<ChronicleSectionDataByModule[M]>;
}
