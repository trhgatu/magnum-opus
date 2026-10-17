import type { ActivityEventInput } from '@shared/application/activity';

export const ACTIVITY_EVENT_WRITER = Symbol('ACTIVITY_EVENT_WRITER');

export interface ActivityEventWriter {
  /**
   * Ghi các event vào sổ của feed. Event đã có (trùng khóa) bị bỏ qua — sổ
   * chỉ thêm dòng, không sửa. Trả số dòng thực sự được thêm.
   */
  append(feedId: string, events: ActivityEventInput[]): Promise<number>;
}
