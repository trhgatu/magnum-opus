# Memory v1

Memory lưu giữ những trải nghiệm mà người dùng chủ động lựa chọn vì chúng vẫn còn ý nghĩa trong cuộc sống.

Memory không phải bản sao tự động của Journal, không phải bài phân tích và không phải một Insight. Nó là phiên bản cô đọng của một khoảnh khắc đã thực sự được sống.

## Trạng thái triển khai

Backend v1 đã có đầy đủ database model, domain rules, repository, CQRS handlers và bảy endpoint được mô tả trong tài liệu này. Các thao tác đọc và ghi đều giới hạn theo owner lấy từ access token; update, trash, restore và xóa vĩnh viễn đều dùng revision để phát hiện ghi đè đồng thời.

Giao diện Memory trên `apps/client` chưa được triển khai. Vì vậy Memory hiện đã hoàn thành **backend vertical slice**, nhưng chưa hoàn thành **product vertical slice** từ trình duyệt đến database. Phần UI và E2E browser là bước tiếp theo.

## Vấn đề cần giải quyết

Journal giúp ghi lại suy nghĩ và trải nghiệm khi chúng còn đang diễn ra. Tuy nhiên, không phải toàn bộ nội dung Journal đều cần được giữ lại lâu dài.

Một Journal entry có thể chứa nhiều suy nghĩ, câu hỏi và chi tiết tạm thời. Bên trong đó đôi khi có một khoảnh khắc mà người dùng muốn giữ lại như một phần của cuộc đời:

- một buổi chiều đặc biệt;
- một cuộc trò chuyện có ý nghĩa;
- một lần vượt qua nỗi sợ;
- một khoảnh khắc bình yên;
- một sự kiện đã làm thay đổi cách nhìn.

Memory tạo ra một không gian riêng cho những khoảnh khắc như vậy.

## Lời hứa của v1

Người dùng có thể chủ động lưu một Memory trực tiếp hoặc kết tinh nó từ một Journal entry.

Memory giữ lại nội dung độc lập, thời điểm sự kiện xảy ra và nguồn hình thành nếu có. Sau khi được tạo, Memory vẫn tồn tại ngay cả khi Journal nguồn bị xóa vĩnh viễn.

Người dùng có thể đọc lại Memory theo dòng thời gian, chỉnh sửa cách diễn đạt, đưa vào Trash, khôi phục hoặc xóa vĩnh viễn.

## Phạm vi

### Có trong v1

- Tạo Memory trực tiếp.
- Tạo Memory từ một Journal entry thuộc cùng người dùng.
- Tiêu đề bắt buộc.
- Nội dung bắt buộc.
- Ghi nhận thời điểm sự kiện xảy ra nếu còn nhớ.
- Hỗ trợ thời gian có độ chính xác theo ngày, tháng hoặc năm.
- Cho phép không xác định được thời gian.
- Hiển thị Memory theo dòng thời gian.
- Tìm kiếm trong tiêu đề và nội dung.
- Chỉnh sửa Memory đang hoạt động.
- Chống ghi đè thay đổi mới hơn bằng revision.
- Đưa Memory vào Trash.
- Khôi phục Memory từ Trash.
- Xóa vĩnh viễn một Memory đang ở trong Trash.
- Giữ Memory khi Journal nguồn bị xóa vĩnh viễn.
- Bảo vệ mọi thao tác bằng ownership.

### Chưa có trong v1

- Chia sẻ Memory hoặc công khai Memory.
- Attachment, album ảnh hoặc video.
- Tag tự do.
- Phân loại `moment`, `milestone`, `insight` hoặc `challenge`.
- Mood riêng cho Memory.
- AI analysis hoặc AI tự tạo Memory.
- Reflection và Insight nằm bên trong Memory.
- Điểm số, reflection depth hoặc gamification.
- Nội dung đa ngôn ngữ dạng JSON.
- Timeline tổng hợp Journal, Habit, Routine và các module khác.
- Admin đọc nội dung Memory của người dùng.

Những khả năng bị hoãn chỉ được đưa vào khi có nhu cầu sản phẩm thật. Chúng không được thêm chỉ vì đã từng tồn tại trong Forge OS.

## Khái niệm

### Memory

Memory là một trải nghiệm đã xảy ra và được người dùng chủ động lựa chọn để giữ lại.

Memory phải có nội dung độc lập. Việc đọc Memory không được phụ thuộc vào việc Journal nguồn còn tồn tại hay đã thay đổi.

### Journal nguồn

Một Memory có thể được tạo từ một Journal entry.

Journal nguồn giải thích Memory đã được kết tinh từ đâu. Nó không sở hữu Memory và không quyết định vòng đời của Memory.

Một Journal entry có thể tạo ra nhiều Memory vì một entry dài có thể chứa nhiều khoảnh khắc đáng giữ lại.

Một Memory chỉ có tối đa một Journal nguồn.

### Thời điểm xảy ra

Thời điểm xảy ra mô tả khi trải nghiệm thực sự diễn ra. Nó khác với thời điểm Memory được tạo trong hệ thống.

Ví dụ:

````text
Sự kiện xảy ra: năm 2018
Memory được tạo: năm 2026```

Timeline phải đặt Memory ở năm 2018 thay vì năm 2026.

### Độ chính xác của thời gian

Memory dùng `DAY`, `MONTH`, `YEAR` và `UNKNOWN`. Giao diện chỉ hiển thị độ chính xác đã cung cấp; “năm 2018” không được biến thành ngày giả “01/01/2018”.

### Timeline và Trash

Timeline là projection đọc Memory theo thời điểm trải nghiệm xảy ra, không phải entity hay bảng riêng. Memory không rõ thời gian nằm trong nhóm “Không rõ thời gian”. Memory trong Trash không xuất hiện ở collection mặc định nhưng vẫn có thể khôi phục.

## Trạng thái

```text
Active ──trash──> Trashed
   ▲                  │
   └────restore───────┘

Trashed ──delete permanently──> Deleted
````

`Deleted` không phải state được lưu. Memory không có `DRAFT` hoặc `SEALED`: Journal là không gian đang viết, còn Memory xuất hiện sau quyết định chủ động giữ lại.

## Các flow chính

### Tạo trực tiếp

Người dùng nhập tiêu đề, nội dung và thời gian nếu còn nhớ. Client không gửi `ownerId`; server lấy owner từ access token và tạo Memory `ACTIVE` ở revision 1.

### Tạo từ Journal

Nút “Giữ lại như một ký ức” mở form đã điền trước, không tự động tạo record. Người dùng chọn lọc nội dung. Server chỉ chấp nhận `sourceJournalEntryId` của Journal cùng owner và không ở trong Trash. Memory được tạo độc lập; Journal giữ nguyên.

### Đọc lại

Collection có thể sắp xếp theo ngày cập nhật hoặc thời điểm xảy ra. Timeline ưu tiên thời điểm xảy ra. Search tìm trong tiêu đề và nội dung. Trang chi tiết liên kết về Journal nguồn nếu Journal còn tồn tại.

### Chỉnh sửa và xung đột

Client gửi `expectedRevision`. Server chỉ cập nhật Memory `ACTIVE` khi revision khớp. Thay đổi thực sự làm revision tăng; revision cũ nhận conflict thay vì ghi đè.

### Trash và restore

Trash chuyển `ACTIVE` thành `TRASHED`, tăng revision và ghi `trashedAt`. Restore làm điều ngược lại. Xóa vĩnh viễn chỉ hợp lệ trong `TRASHED`.

## Business rules

1. Owner lấy từ access token; chỉ owner được thao tác Memory.
2. Tiêu đề được trim, không rỗng và tối đa 200 ký tự.
3. Nội dung được trim và không rỗng.
4. Memory mới luôn là `ACTIVE`, revision 1.
5. Chỉ `ACTIVE` được sửa hoặc trash; chỉ `TRASHED` được restore hoặc xóa vĩnh viễn.
6. Update và lifecycle transition phải có `expectedRevision`.
7. `occurredOn` có giá trị với `DAY`, `MONTH`, `YEAR`; nó là `null` với `UNKNOWN`.
8. `occurredOnPrecision` là nguồn sự thật khi hiển thị ngày chuẩn hóa.
9. `sourceJournalEntryId` là tùy chọn, bất biến sau khi tạo và phải trỏ tới Journal cùng owner.
10. Một Journal có thể là nguồn của nhiều Memory.
11. Cập nhật Journal không cập nhật Memory; xóa Journal đặt liên kết nguồn thành `null`, không xóa Memory.
12. Mọi truy vấn áp dụng ownership; ID của owner khác được xử lý như không tồn tại.

## Dữ liệu tối thiểu

| Field                    | Ý nghĩa                   |
| ------------------------ | ------------------------- |
| `id`, `ownerId`          | Định danh và chủ sở hữu   |
| `sourceJournalEntryId`   | Journal nguồn nếu có      |
| `title`, `content`       | Trải nghiệm được giữ lại  |
| `occurredOn`             | Ngày chuẩn hóa            |
| `occurredOnPrecision`    | Độ chính xác của ngày     |
| `state`, `revision`      | Vòng đời và chống ghi đè  |
| `trashedAt`              | Thời điểm vào Trash       |
| `createdAt`, `updatedAt` | Thời gian quản trị record |

`occurredOn` là calendar date. Với `MONTH`, server lưu ngày đầu tháng; với `YEAR`, server lưu ngày đầu năm; với `UNKNOWN`, giá trị là `null`. Client luôn dựa vào precision để hiển thị.

## Hợp đồng API backend hiện tại

| Hành động     | Endpoint                                  |
| ------------- | ----------------------------------------- |
| Tạo           | `POST /memories`                          |
| Danh sách     | `GET /memories`                           |
| Chi tiết      | `GET /memories/:id`                       |
| Cập nhật      | `PUT /memories/:id`                       |
| Trash         | `PATCH /memories/:id/trash`               |
| Restore       | `PATCH /memories/:id/restore`             |
| Xóa vĩnh viễn | `DELETE /memories/:id?expectedRevision=n` |

Mọi endpoint yêu cầu access token. Tạo trực tiếp và từ Journal dùng cùng endpoint; request từ Journal chỉ thêm `sourceJournalEntryId`.

### Flow thực thi một request ghi

Ví dụ với thao tác đưa Memory vào Trash:

```text
PATCH /memories/:id/trash
→ JwtAuthGuard xác thực access token
→ controller lấy ownerId từ token, không nhận ownerId từ body
→ CommandBus chuyển TrashMemoryCommand tới TrashMemoryHandler
→ MemoryMutationService tìm Memory bằng id + ownerId
→ kiểm tra expectedRevision trước khi thay đổi aggregate
→ Memory.moveToTrash() kiểm tra ACTIVE → TRASHED và tăng revision
→ repository update bằng điều kiện id + ownerId + revision cũ
→ presenter trả contract MemoryResponse
```

Việc kiểm tra revision diễn ra hai lần có chủ ý. Lần đầu tạo lỗi dễ hiểu trước khi mutation chạy. Lần thứ hai nằm trong câu lệnh update nguyên tử tại database, bắt trường hợp một request khác vừa cập nhật record trong khoảng thời gian giữa read và write.

### Vai trò của từng lớp

`MemoryController` chỉ xử lý HTTP, validation DTO, authentication context và chuyển kết quả thành response. Command/query handler điều phối use case. `MemoryMutationService` gom quy trình dùng chung của update, trash và restore. `Memory` aggregate bảo vệ state transition và dữ liệu hợp lệ. `MemoryRepository` là port do domain sở hữu; `PrismaMemoryRepository` là adapter thực thi port đó bằng Prisma.

Create có thêm `MemorySourceJournalReader` vì nó cần xác minh Journal nguồn. Reader là port do Memory sở hữu nên application Memory không phụ thuộc vào aggregate hoặc repository của Journal.

## Quyền riêng tư và ranh giới module

Memory là dữ liệu riêng tư. Admin không có endpoint đọc nội dung. Memory không lưu Mood riêng; Mood của Journal nguồn chỉ được đọc qua Journal.

Memory có thể dùng một Journal entry làm nguồn, nhưng application của Memory không import aggregate, state hay repository của Journal. Thay vào đó, Memory định nghĩa `MemorySourceJournalReader`: một cổng đọc nhỏ chỉ trả về ba kết quả mà use case tạo Memory cần hiểu.

```text
AVAILABLE  → nguồn tồn tại, thuộc đúng owner và có thể dùng
TRASHED    → nguồn thuộc đúng owner nhưng đang ở Trash
NOT_FOUND  → không tồn tại hoặc thuộc owner khác
```

`PrismaMemorySourceJournalReader` là adapter duy nhất biết cách đọc bảng `journal_entries` và chuyển trạng thái của Journal thành ba kết quả trên. Nhờ vậy, quy tắc tạo Memory không bị buộc vào model nội bộ của Journal. Điều kiện `id + ownerId` cũng khiến một Journal của người khác có cùng cách xử lý như một ID không tồn tại, tránh làm lộ dữ liệu.

Khóa ngoại `memories.source_journal_entry_id` vẫn tồn tại để bảo vệ tính toàn vẹn dữ liệu. Đây là quan hệ ở tầng database, không phải lý do để Memory application phụ thuộc trực tiếp vào Journal domain.

- Memory trả lời: điều gì đã xảy ra và đáng giữ lại?
- Reflection trả lời: trải nghiệm này có ý nghĩa gì?
- Insight trả lời: điều gì đã được hiểu từ các trải nghiệm?

Memory v1 không tự tạo Reflection hoặc Insight.

## Events dành cho giai đoạn sau

`memory.created`, `memory.updated`, `memory.trashed`, `memory.restored` và `memory.permanently-deleted` chỉ được phát khi có consumer thật. Timeline v1 đọc trực tiếp từ repository nên chưa cần event.

## Tiêu chí hoàn thành

Flow thật phải chứng minh có thể tạo, reload, tìm, sửa, xem đúng vị trí trên Timeline, trash và restore. Flow từ Journal phải chứng minh Journal vẫn còn sau khi tạo Memory và Memory vẫn còn sau khi Journal nguồn bị xóa.

Ownership test phải chặn user B; concurrency test phải chặn revision cũ.

## Giá trị cần kiểm chứng

Memory có giá trị khi người dùng nhận ra khoảnh khắc quan trọng mà không phải đọc lại toàn bộ Journal. Số lượng Memory không phải thước đo thành công.

## Bài học từ Forge OS

Magnum Opus giữ nghi thức chủ động lưu trải nghiệm và cách đọc theo thời gian. Memory không đồng thời là moment, milestone, insight và challenge. Privacy không trộn với lifecycle; Mood không thành string tự do; AI analysis, reflection depth, tag, đa ngôn ngữ và image chỉ được thêm khi có flow hoàn chỉnh.
