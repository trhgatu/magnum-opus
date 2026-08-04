# Forge OS capability map

Forge OS là nơi các ý tưởng đầu tiên của Magnum Opus được khám phá. Nó chứng minh rằng sản phẩm không chỉ là một ý niệm: nhiều flow đã có giao diện, API và dữ liệu thật. Tuy nhiên, Magnum Opus không tiếp tục Forge OS bằng cách sao chép code. Nó giữ lại ý nghĩa đã được khám phá, rồi xây lại từng capability trên nền tảng mới.

## Cách đọc bản đồ này

Mỗi capability được xếp vào một trong ba hướng:

- **Kế thừa ý tưởng**: mục đích và trải nghiệm có giá trị, nhưng domain model và code sẽ được thiết kế lại.
- **Giữ làm nguyên liệu**: có những phần đáng dùng về sau, chưa đủ rõ để trở thành cam kết sản phẩm.
- **Hoãn**: không thuộc vòng lặp cốt lõi hiện tại hoặc có thể làm sản phẩm mất trọng tâm.

Đây là quyết định về sản phẩm, không phải đánh giá công sức đã bỏ vào Forge OS.

## Những gì Forge OS đã khám phá

Forge OS có chín khu vực nghiệp vụ phía backend, hơn hai mươi khu vực trải nghiệm phía frontend và khoảng ba mươi nhóm dữ liệu. Các capability không có cùng độ hoàn thiện: có flow nối xuyên suốt tới database, có màn hình dùng dữ liệu giả lập, và có ý tưởng mới chỉ xuất hiện trong giao diện.

| Nhóm                       | Capability đã xuất hiện                             | Hướng của Magnum Opus                                                                    |
| -------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Không gian cá nhân         | Identity, authentication, roles, permissions, audit | Dùng foundation mới; chỉ đưa quản trị ra trước người dùng khi thật sự cần                |
| Capture & reflection       | Journal, Mood, Memory, Quote, Timeline              | Kế thừa ý tưởng; bắt đầu từ Journal rồi kết nối dần                                      |
| Chuyển hóa thành hành động | Habits, Routines, Tasks, Goals                      | Kế thừa ý tưởng sau khi reflection tạo ra nhu cầu thật                                   |
| Học hỏi                    | Knowledge, Vocabulary, Flashcards                   | Giữ làm nguyên liệu; cần chứng minh mối liên hệ với journey                              |
| Sự hiện diện và cơ thể     | Echoes, Presence, Vitality                          | Giữ làm nguyên liệu có giá trị cao; thiết kế lại để không biến thành chấm điểm con người |
| Phản chiếu tiến trình      | Quests, XP, attributes, status effects              | Hoãn gamification đầy đủ; chỉ giữ phản hồi giúp người dùng hiểu tiến trình               |
| Sáng tạo và dự án          | Forge Lab, engineering projects                     | Hoãn khỏi product core                                                                   |
| Tài chính                  | Wealth                                              | Hoãn; đây có thể là một product area độc lập                                             |
| AI companion               | Chamber, Nova, analysis panels                      | Kế thừa nguyên tắc “AI là chất xúc tác”; chưa giữ thiết kế agent cũ như một cam kết      |
| Trải nghiệm biểu tượng     | Shadow Work, cosmic views, alchemical language      | Giữ làm ngôn ngữ trải nghiệm, nhưng không để mỹ học che khuất hành vi thật               |

## Điều đáng giữ

### Một hệ thống có linh hồn

Forge OS không đối xử với journal, habit hay deep work như những bảng dữ liệu lạnh. Tên gọi, chuyển động và nghi thức tạo cảm giác người dùng đang bước vào một không gian của riêng mình. Magnum Opus cần giữ phẩm chất này.

### Các capability muốn kết nối với nhau

Journal có thể xuất hiện trên Timeline; habit và routine có thể đóng góp vào goal; hành động có thể tạo phản hồi ở gamification. Ý tưởng về một hành trình liên tục là đúng, dù cơ chế liên kết cũ còn quá rộng và lỏng.

### Reflection phải dẫn tới đời sống thật

Journal cũ đã thử đưa ra mood, phân tích, chủ đề và bước tiếp theo. Hướng đi này phù hợp với journey `Capture → Reflect → Understand → Transform → Integrate`, miễn là hệ thống không trình bày suy đoán của AI như sự thật.

## Điều phải thiết kế lại

### Không dùng database schema cũ làm product model

Schema cũ cho phép nhiều khái niệm mở bằng chuỗi hoặc JSON. Cách này giúp thử nghiệm nhanh nhưng làm business rule trở nên mơ hồ. Magnum Opus chỉ tạo field và relation sau khi biết chúng phục vụ flow nào.

### Không triển khai tất cả module cùng lúc

Độ rộng của Forge OS khiến nhiều capability tồn tại song song nhưng chưa tạo thành một hành trình hoàn chỉnh. Magnum Opus sẽ hoàn thiện một vertical slice có giá trị trước khi mở capability tiếp theo.

### Không đồng nhất “đã có màn hình” với “đã có sản phẩm”

Một số khu vực vẫn dùng mock data hoặc mô phỏng phân tích. Chúng là prototype hữu ích, không phải bằng chứng rằng business flow đã hoàn chỉnh.

### Không bê nguyên cơ chế gamification

XP, quest và attributes có thể tạo phản hồi thú vị, nhưng cũng có thể biến tự quan sát thành tối ưu hóa điểm số. Magnum Opus chỉ đưa chúng trở lại khi chứng minh được rằng chúng củng cố sự tự chủ thay vì gây áp lực.

## Thứ tự kế thừa đề xuất

```text
Journal v1
  ↓
Mood trong bối cảnh Journal
  ↓
Memory và Timeline
  ↓
Reflection được người dùng xác nhận
  ↓
Insight có thể truy nguồn
  ↓
Habit hoặc Routine được tạo từ lựa chọn của người dùng
  ↓
Quan sát kết quả và quay lại Journal
```

Knowledge, Vitality, Echoes và AI companion chỉ nên đi vào roadmap khi vòng lặp trên đã chạy được và có dữ liệu sử dụng thật.

## Nguyên tắc migration

Trong giai đoạn hiện tại, Magnum Opus không migration code hay database của Forge OS.

Khi cần dữ liệu cũ, quá trình migration phải tách thành ba bước:

1. Xuất dữ liệu Forge OS sang định dạng trung gian có version.
2. Xác thực quyền sở hữu, kiểu dữ liệu và những field không còn tương ứng.
3. Import qua application use case của Magnum Opus thay vì ghi thẳng vào database.

Cách này giữ Forge OS như một nguồn lịch sử có thể đối chiếu và tránh kéo những giả định cũ vào domain model mới.
