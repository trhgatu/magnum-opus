# Magnum Opus

Magnum Opus là một hệ điều hành cá nhân dành cho việc quan sát, thấu hiểu và chuyển hóa đời sống. Sản phẩm bắt đầu từ nhu cầu của chính người tạo ra nó: giữ lại trải nghiệm, nhận ra những mẫu hình đang lặp lại và biến điều đã hiểu thành hành động có chủ đích.

Đây không phải một ứng dụng năng suất nhằm ép người dùng làm được nhiều việc hơn. Mỗi capability chỉ có lý do tồn tại khi nó phục vụ vòng lặp cốt lõi:

```text
Ghi nhận điều đang xảy ra
        ↓
Nhìn lại và tìm ra ý nghĩa
        ↓
Nhận biết mẫu hình
        ↓
Chọn điều cần thay đổi
        ↓
Hành động trong đời sống thật
        ↓
Quay lại quan sát
```

## Product map

- [Vision](product/vision.md): mục đích, nguyên tắc và những điều sản phẩm không cố trở thành.
- [Journey](product/journey.md): hành trình chuyển hóa xuyên suốt các capability.
- [Features](product/features/README.md): trạng thái và flow của từng tính năng.

## Engineering handbook

[Engineering Handbook](docs/README.md) là lộ trình đọc kỹ thuật từ kiến trúc tổng thể đến từng module, runtime flow, CI/CD, bản đồ file và cách xây một vertical slice mới. Phần `product/` giải thích hệ thống cần phục vụ điều gì; phần `docs/` giải thích code hiện thực điều đó như thế nào.

## Trạng thái hiện tại

Repository đã hoàn thành foundation sản phẩm, ba vertical slice Reflection là Journal, Mood, Memory và read model Timeline nối Journal/Memory theo thời gian. Forge hiện có Habit và Habit Check-in chạy full-stack từ PostgreSQL/NestJS tới Next.js, gồm quản lý lifecycle, check-in theo timezone và heatmap 90 ngày. Routine và trang Today sẽ tiếp tục được xây theo từng lát nhỏ, không port nguyên khối từ Forge OS.

Client hiện dùng một ngôn ngữ trải nghiệm thống nhất: yên, riêng tư, ưu tiên nội dung và không biến hành trình cá nhân thành dashboard năng suất. [Product vision](product/vision.md) ghi lại các nguyên tắc để những capability tiếp theo không tự phát minh một phong cách hoặc interaction contract khác.

Magnum Opus duy trì tài liệu kỹ thuật gắn trực tiếp với code hiện tại trong `docs/`. Những hướng dẫn nền tảng chung vẫn có thể được cải tiến ở starter, nhưng architecture, flow và quyết định riêng của Magnum Opus phải được cập nhật ngay tại repository này khi code thay đổi.
