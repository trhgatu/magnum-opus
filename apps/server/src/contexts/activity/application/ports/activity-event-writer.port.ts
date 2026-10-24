import type {
  ActivityEventInput,
  TimeWindow,
} from '@shared/application/activity';

export const ACTIVITY_EVENT_WRITER = Symbol('ACTIVITY_EVENT_WRITER');

export interface ActivityEventWriter {
  /**
   * Ghi các event vào sổ của feed. Event đã có (trùng khóa) bị bỏ qua — sổ
   * chỉ thêm dòng, không sửa. Trả số dòng thực sự được thêm.
   */
  append(feedId: string, events: ActivityEventInput[]): Promise<number>;
  /**
   * Thay CODING_TIME của feed trong từng khoảng bằng events thuộc khoảng đó,
   * trong một transaction. Event nằm ngoài mọi khoảng bị bỏ qua. Trả số dòng
   * được ghi.
   */
  replace(
    feedId: string,
    windows: TimeWindow[],
    events: ActivityEventInput[],
  ): Promise<number>;
}
