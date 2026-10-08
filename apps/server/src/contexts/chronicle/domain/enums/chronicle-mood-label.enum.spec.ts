import { MoodLabel } from '@repo/database';

import { ChronicleMoodLabel } from './chronicle-mood-label.enum';

describe('ChronicleMoodLabel', () => {
  it('stays in sync with the persisted MoodLabel enum', () => {
    // Chronicle cố ý giữ bản sao riêng để không phụ thuộc kiểu của
    // Reflection — test này bắt lỗi khi thêm/bớt mood ở schema mà quên
    // cập nhật bản sao.
    expect(Object.values(ChronicleMoodLabel).sort()).toEqual(
      Object.values(MoodLabel).sort(),
    );
  });
});
