import { ChronicleSectionReader } from '../ports/chronicle-section-reader.port';
import { CHRONICLE_MODULES, ChronicleModule } from '../section-data';

/**
 * Gom mọi reader đã đăng ký thành registry theo module và kiểm tra đủ —
 * mỗi module trong CHRONICLE_MODULES có đúng 1 reader (DAP-CHR-006).
 * Gọi lúc khởi tạo provider để cấu hình sai làm app không khởi động được,
 * thay vì lỗi âm thầm lúc người dùng mở Chronicle.
 */
export class ChronicleSectionReaderRegistry {
  private constructor(
    private readonly readersByModule: ReadonlyMap<
      ChronicleModule,
      ChronicleSectionReader
    >,
  ) {}

  public static from(
    readers: readonly ChronicleSectionReader[],
  ): ChronicleSectionReaderRegistry {
    const readersByModule = new Map<ChronicleModule, ChronicleSectionReader>();

    for (const reader of readers) {
      if (!CHRONICLE_MODULES.includes(reader.module)) {
        throw new Error(
          `Chronicle reader registered for unknown module "${reader.module}"`,
        );
      }

      if (readersByModule.has(reader.module)) {
        throw new Error(
          `Chronicle module "${reader.module}" has more than one reader`,
        );
      }

      if (!Number.isInteger(reader.schemaVersion) || reader.schemaVersion < 1) {
        throw new Error(
          `Chronicle reader for "${reader.module}" has invalid schemaVersion ${reader.schemaVersion}`,
        );
      }

      readersByModule.set(reader.module, reader);
    }

    const missing = CHRONICLE_MODULES.filter(
      (module) => !readersByModule.has(module),
    );

    if (missing.length > 0) {
      throw new Error(
        `Chronicle modules without a reader: ${missing.join(', ')}`,
      );
    }

    return new ChronicleSectionReaderRegistry(readersByModule);
  }

  /** Mọi reader, theo đúng thứ tự của CHRONICLE_MODULES. */
  public all(): ChronicleSectionReader[] {
    return CHRONICLE_MODULES.map((module) => this.get(module));
  }

  public get<M extends ChronicleModule>(module: M): ChronicleSectionReader<M> {
    const reader = this.readersByModule.get(module);

    if (!reader) {
      throw new Error(`Chronicle module "${module}" has no reader`);
    }

    return reader as unknown as ChronicleSectionReader<M>;
  }
}
