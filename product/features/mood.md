# Mood v1

Mood bổ sung bối cảnh cảm xúc cho một Journal entry. Nó giúp người dùng nhớ lại không chỉ điều đã xảy ra, mà còn trạng thái bên trong của mình khi trải nghiệm điều đó.

Mood v1 không chẩn đoán tâm lý, không đánh giá cảm xúc là tốt hay xấu và không tự suy luận từ nội dung Journal.

## Trạng thái triển khai

Mood v1 đã hoàn thành theo chiều dọc từ database, domain model và HTTP API đến giao diện Journal. Flow trình duyệt đã kiểm chứng việc tạo, tải lại, thay đổi, đọc ở trạng thái Sealed, mở lại và loại bỏ Mood mà không làm mất Journal entry.

Client tải Journal entry và Mood song song ở Server Component. Các thao tác tạo, cập nhật và loại bỏ đi qua Server Action, vì vậy access token và địa chỉ backend không bị đưa xuống trình duyệt. Mood dùng revision riêng; khi revision cũ gây conflict, giao diện yêu cầu tải snapshot mới thay vì ghi đè âm thầm.

## Vấn đề cần giải quyết

Một Journal entry có thể mô tả sự kiện rất rõ nhưng vẫn thiếu trạng thái cảm xúc đi cùng sự kiện đó. Khi đọc lại sau một khoảng thời gian, người dùng có thể nhớ chuyện gì đã xảy ra nhưng không còn nhớ mình đã trải nghiệm nó như thế nào.

Mood giữ lại phần bối cảnh này bằng một thao tác ngắn, không biến editor thành biểu mẫu theo dõi sức khỏe phức tạp.

## Lời hứa của v1

Khi viết một Journal entry, người dùng có thể ghi lại một Mood tùy chọn. Mood này có thể được thay đổi hoặc loại bỏ trong khi entry vẫn còn là Draft.

Khi đọc lại entry, người dùng nhìn thấy mood như một phần bối cảnh của trải nghiệm, không phải điểm số đánh giá bản thân.

## Phạm vi

### Có trong v1

- Một Journal entry có tối đa một Mood.
- Chọn một mood label từ vocabulary được kiểm soát.
- Cường độ tùy chọn từ 1 đến 5.
- Ghi chú ngắn tùy chọn.
- Thêm, thay đổi hoặc loại bỏ mood khi entry còn là Draft.
- Hiển thị mood khi đọc lại Draft hoặc Sealed entry.
- Bảo vệ ownership thông qua Journal entry.
- Chống ghi đè thay đổi từ tab hoặc thiết bị khác bằng revision.

### Chưa có trong v1

- Mood check-in không gắn với Journal.
- Nhiều mood trên cùng một entry.
- Biểu đồ và thống kê mood.
- AI suy luận mood từ nội dung.
- AI đưa ra chẩn đoán hoặc lời khuyên tâm lý.
- Tự động tạo Habit, Routine hoặc Task từ mood.
- Custom mood label.
- Chia sẻ mood với người dùng khác.

Những phần bị hoãn chỉ được đưa vào roadmap khi flow cơ bản đã tạo ra giá trị thật.

## Khái niệm

### Mood

Mood là trạng thái người dùng chủ động ghi nhận trong bối cảnh một Journal entry.

Nó là một dấu vết tại thời điểm viết, không phải kết luận cố định về con người hoặc toàn bộ ngày hôm đó.

### Mood label

Mood label là từ gần nhất với trạng thái người dùng muốn ghi lại.

Vocabulary của v1 gồm:

| Giá trị kỹ thuật | Hiển thị        |
| ---------------- | --------------- |
| `JOYFUL`         | Vui             |
| `CALM`           | Bình yên        |
| `HOPEFUL`        | Hy vọng         |
| `ENERGETIC`      | Tràn năng lượng |
| `NEUTRAL`        | Trung tính      |
| `TIRED`          | Mệt             |
| `ANXIOUS`        | Lo âu           |
| `SAD`            | Buồn            |
| `ANGRY`          | Tức giận        |
| `OVERWHELMED`    | Quá tải         |

Danh sách không chia cảm xúc thành tích cực và tiêu cực. Một cảm xúc khó chịu vẫn có thể chứa thông tin quan trọng.

### Intensity

Intensity cho biết cảm xúc đang nhẹ hay mạnh theo thang từ 1 đến 5.

Intensity là tùy chọn. Người dùng không bị buộc phải biến trải nghiệm thành một con số nếu không muốn.

### Note

Note là phần diễn giải ngắn dành riêng cho mood, ví dụ: “Bình yên sau khi hoàn thành cuộc trò chuyện”.

Note không thay thế nội dung Journal và không nên trở thành một editor thứ hai.

## Flow 1 — thêm mood

1. Người dùng mở một Journal entry đang ở trạng thái Draft.
2. Người dùng chọn thêm mood.
3. Người dùng chọn một label.
4. Người dùng có thể chọn intensity và nhập note.
5. Client gửi Mood cùng revision hiện tại nếu record đã tồn tại.
6. Server xác nhận entry thuộc về người dùng và vẫn còn là Draft.
7. Server tạo hoặc cập nhật Mood.
8. Giao diện chỉ báo đã lưu sau khi server xác nhận.

Kết quả: Journal entry có thêm bối cảnh cảm xúc mà không làm gián đoạn việc viết.

## Flow 2 — thay đổi mood

1. Người dùng mở Draft đã có mood.
2. Người dùng thay đổi label, intensity hoặc note.
3. Client gửi revision của mood đang hiển thị.
4. Server chỉ cập nhật nếu revision vẫn còn khớp.
5. Response trả về revision mới.

Nếu nơi khác đã thay đổi mood trước, server trả conflict thay vì âm thầm ghi đè.

## Flow 3 — loại bỏ mood

1. Người dùng chọn loại bỏ mood khỏi Draft.
2. Giao diện nói rõ rằng Journal entry không bị xóa.
3. Client gửi revision hiện tại của mood.
4. Server kiểm tra ownership, trạng thái entry và revision.
5. Mood bị xóa khỏi entry.

Kết quả: Journal entry vẫn tồn tại và chỉ phần mood context được loại bỏ.

## Business rules

1. Mood luôn thuộc về đúng một Journal entry.
2. Một Journal entry có tối đa một Mood.
3. Mood chỉ được thêm, thay đổi hoặc loại bỏ khi entry đang ở trạng thái Draft.
4. Mood của Sealed entry chỉ được đọc.
5. Mood của Trashed entry không được thay đổi.
6. Mood label phải thuộc vocabulary của v1.
7. Intensity là tùy chọn; nếu có thì phải là số nguyên từ 1 đến 5.
8. Note là tùy chọn, được trim và có tối đa 500 ký tự.
9. Note rỗng sau khi trim được lưu thành `null`.
10. Client không được gửi `ownerId`.
11. Server xác định ownership thông qua Journal entry.
12. Update và delete phải dùng expected revision.
13. Server quyết định thời gian tạo và cập nhật.
14. Mood không làm thay đổi revision nội dung của Journal entry.

## Vì sao Mood có revision riêng?

Journal content và mood là hai phần có thể được lưu ở thời điểm khác nhau.

Nếu việc thay mood làm tăng revision của Journal entry, autosave nội dung đang chạy ở tab khác có thể nhận conflict dù nội dung Journal không hề thay đổi. Vì vậy Mood giữ revision riêng để bảo vệ dữ liệu của nó mà không gây xung đột giả với editor.

## Dữ liệu tối thiểu

| Field            | Ý nghĩa                                |
| ---------------- | -------------------------------------- |
| `id`             | Định danh của Mood                     |
| `journalEntryId` | Journal entry chứa mood                |
| `label`          | Mood label do người dùng chọn          |
| `intensity`      | Cường độ tùy chọn từ 1 đến 5           |
| `note`           | Diễn giải ngắn tùy chọn                |
| `revision`       | Chống ghi đè thay đổi mới hơn          |
| `createdAt`      | Thời điểm server tạo Mood              |
| `updatedAt`      | Thời điểm server lưu revision gần nhất |

Mood không lưu `ownerId` riêng trong v1. Ownership được truy ngược qua Journal entry, tránh tồn tại hai owner khác nhau cho cùng một dữ liệu.

## Hợp đồng API dự kiến

Tất cả endpoint đều yêu cầu access token.

| Hành động         | Endpoint                                                   | Dữ liệu chính                                       |
| ----------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| Xem mood          | `GET /journal/entries/:entryId/mood`                       | Entry ID trên URL                                   |
| Tạo hoặc cập nhật | `PUT /journal/entries/:entryId/mood`                       | `label`, `intensity?`, `note?`, `expectedRevision?` |
| Loại bỏ           | `DELETE /journal/entries/:entryId/mood?expectedRevision=n` | Revision hiện tại                                   |

Khi mood chưa tồn tại, request `PUT` không gửi `expectedRevision`.

Khi Journal entry tồn tại nhưng chưa có Mood, request `GET` trả `204 No Content`. Trạng thái này khác với `404 Not Found`: `204` nghĩa là entry thuộc về người gọi nhưng chưa được gắn Mood; `404` nghĩa là entry không tồn tại hoặc không thuộc về người gọi.

Khi mood đã tồn tại, `expectedRevision` là bắt buộc. Nếu revision không khớp, server trả lỗi conflict.

Nếu entry không tồn tại hoặc thuộc về người khác, API luôn trả not found.

## Quyền riêng tư

Mood được bảo vệ bởi cùng ownership boundary với Journal.

Server không cung cấp cách tìm mood của người dùng khác, kể cả khi người gọi biết mood ID hoặc Journal entry ID. Nội dung mood không xuất hiện trong Admin.

## Sự kiện

Mood v1 chưa phát domain event.

Các event như `mood.recorded` chỉ được thêm khi có consumer thật như Timeline hoặc reflection engine. Không tạo event chỉ để dự phòng.

## Tiêu chí hoàn thành

Mood v1 được xem là hoàn thành khi flow sau chạy được qua client thật và API thật:

```text
Đăng nhập
→ tạo Journal entry
→ thêm mood
→ reload và vẫn thấy mood
→ thay đổi mood
→ seal entry
→ đọc được mood nhưng không thể chỉnh sửa
→ reopen entry
→ loại bỏ mood mà Journal entry vẫn còn
```

Bài kiểm thử ownership phải chứng minh user B không thể đọc hoặc thay đổi mood thuộc Journal entry của user A.

Bài kiểm thử concurrency phải chứng minh revision cũ không thể ghi đè mood mới hơn.

## Giá trị cần kiểm chứng

Mood v1 tạo ra giá trị nếu người dùng có thể đọc lại một Journal entry và hiểu rõ hơn trạng thái bên trong của mình tại thời điểm đó.

Số mood được ghi lại không phải thước đo thành công. Mood chỉ có giá trị khi nó làm ký ức và reflection trở nên có bối cảnh hơn.
