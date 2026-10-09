import { MoodLabel } from '@repo/database';

import { ChronicleMoodLabel } from './chronicle-mood-label.enum';

describe('ChronicleMoodLabel', () => {
  it('stays in sync with the persisted MoodLabel enum', () => {
    // Chronicle cố ý giữ bản sao riêng để không phụ thuộc kiểu của
    // Reflection — test này bắt lỗi khi thêm/bớt mood ở schema mà quên
    // cập nhật bản sao.
    // So cả cặp tên–giá trị: đổi tên member mà giữ giá trị, hay tráo giá
    // trị giữa 2 member, đều phải bị bắt.
    expect(Object.entries(ChronicleMoodLabel).sort()).toEqual(
      Object.entries(MoodLabel).sort(),
    );
  });
});
