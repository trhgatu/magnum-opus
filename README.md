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

## Trạng thái hiện tại

Repository đã hoàn thành foundation sản phẩm và vertical slice đầu tiên là Journal v1. Nền tảng kỹ thuật ban đầu được kế thừa từ một starter đã được kiểm chứng; các capability của Forge OS sẽ tiếp tục được đánh giá rồi chuyển sang Magnum Opus từng slice, không port nguyên khối.

Client hiện dùng một ngôn ngữ trải nghiệm thống nhất: yên, riêng tư, ưu tiên nội dung và không biến hành trình cá nhân thành dashboard năng suất. [Product vision](product/vision.md) ghi lại các nguyên tắc để những capability tiếp theo không tự phát minh một phong cách hoặc interaction contract khác.

Tài liệu cài đặt, kiến trúc nền tảng, Docker, CI/CD và deployment được duy trì tại repository starter. Magnum Opus chỉ ghi lại product intent, business flow và hành vi của các tính năng.
