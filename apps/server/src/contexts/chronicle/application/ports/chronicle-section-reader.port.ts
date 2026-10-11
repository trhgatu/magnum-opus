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

  /**
   * true khi mọi nguồn dữ liệu của reader bất biến theo thời gian (lịch sử
   * Forge, check-in, transition) — chỉ khi đó section cũ mới được tính lại
   * khi nâng phiên bản (DAP-CHR-008 loại b). false khi reader lọc theo
   * trạng thái hiện tại (vd thùng rác của Journal/Memory).
   */
  readonly historyOnly: boolean;

  getSummary(
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<ChronicleSectionDataByModule[M]>;

  /**
   * Nâng section đã lưu ở phiên bản cũ lên phiên bản hiện tại NGAY TRONG BỘ
   * NHỚ, không ghi lại (DAP-CHR-008 loại a/c) — vd thêm field mới với giá
   * trị mặc định, hoặc null cho reader không thuần lịch sử. Khi có hook này,
   * handler luôn dùng nó trước khi cân nhắc tính lại.
   */
  upgrade?(data: unknown, fromVersion: number): ChronicleSectionDataByModule[M];
}
