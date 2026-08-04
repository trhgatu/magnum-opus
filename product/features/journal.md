# Journal v1

Journal là vertical slice đầu tiên của Magnum Opus. Nó phải giúp người dùng giữ lại một trải nghiệm khi nó còn sống động, rồi quay lại nhìn nó bằng một khoảng cách vừa đủ. Phiên bản đầu tiên chưa cố gắng tự động tạo insight, habit hay lời khuyên.

## Vấn đề cần giải quyết

Một suy nghĩ có ý nghĩa thường xuất hiện khi người dùng chưa sẵn sàng phân loại hay phân tích nó. Nếu việc ghi lại đòi hỏi quá nhiều lựa chọn, khoảnh khắc sẽ trôi qua. Nếu chỉ lưu một khối chữ không có bối cảnh, người dùng lại khó tìm và nhìn lại về sau.

Journal v1 cân bằng hai nhu cầu:

1. Bắt đầu viết gần như ngay lập tức.
2. Giữ đủ bối cảnh để entry có ý nghĩa khi được mở lại.

## Lời hứa của v1

Người dùng có thể tạo một entry riêng tư, viết và lưu an toàn, tìm lại nó, mở lại để đọc, tiếp tục chỉnh sửa hoặc đưa vào thùng rác. Mọi entry luôn thuộc về đúng người tạo ra nó.

## Phạm vi

### Có trong v1

- Tạo entry mới.
- Tiêu đề không bắt buộc.
- Nội dung văn bản hỗ trợ Markdown ở mức trình bày.
- Autosave có trạng thái rõ ràng.
- Danh sách entry theo thời gian cập nhật gần nhất.
- Tìm kiếm trong tiêu đề và nội dung.
- Mở và tiếp tục chỉnh sửa entry.
- Focus mode để giảm nhiễu khi viết.
- Đưa entry vào thùng rác và khôi phục.
- Xóa vĩnh viễn bằng một hành động xác nhận riêng.
- Phân trang hoặc infinite loading để lịch sử không bị giới hạn giả tạo.

### Chưa có trong v1

- Public journal hoặc chia sẻ entry.
- AI analysis, sentiment score hay suggested action.
- Mood, tag và relation với module khác.
- Nhiều loại journal entry.
- Gamification, XP hoặc quest completion.
- Attachment và rich-text editor đầy đủ.
- Admin đọc nội dung journal của người dùng.

Những phần bị hoãn không bị loại bỏ vĩnh viễn. Chúng chỉ chưa được phép làm phức tạp flow cốt lõi.

## Khái niệm

### Entry

Một entry là bản ghi do người dùng tạo. Entry có nội dung, có thể có tiêu đề và mang dấu thời gian tạo/cập nhật.

### Draft

Entry đang được người dùng viết hoặc vẫn muốn tiếp tục thay đổi. Draft không có nghĩa là dữ liệu chưa được lưu.

### Sealed

Người dùng có thể đánh dấu một entry là “sealed” để biểu thị rằng reflection này đã khép lại ở thời điểm hiện tại. Sealed là lifecycle cá nhân, không có nghĩa là published hoặc public. Người dùng vẫn có thể chủ động mở lại nó để chỉnh sửa; việc mở lại phải được ghi nhận rõ.

### Trash

Entry trong Trash không xuất hiện ở danh sách chính nhưng vẫn có thể khôi phục. Chỉ thao tác “xóa vĩnh viễn” mới làm entry không thể phục hồi qua sản phẩm.

## Trạng thái

```text
Draft ──seal──> Sealed
  ▲                │
  └────reopen──────┘

Draft/Sealed ──move to trash──> Trashed
Trashed ──restore──> trạng thái trước khi xóa
Trashed ──delete permanently──> Deleted
```

Privacy không phải một status. Trong v1, mọi trạng thái đều riêng tư và chỉ owner được đọc nội dung.

## Flow 1 — tạo và viết

1. Người dùng chọn “New entry”.
2. Hệ thống tạo một draft riêng tư và mở editor ngay.
3. Người dùng có thể viết nội dung trước, không bị buộc đặt tiêu đề.
4. Sau khi người dùng ngừng nhập trong một khoảng ngắn, autosave gửi phiên bản mới nhất.
5. Giao diện hiển thị một trong ba trạng thái: `Saving`, `Saved`, hoặc `Save failed`.
6. Chỉ hiển thị `Saved` sau khi server xác nhận.
7. Nếu save thất bại, nội dung trên màn hình không bị mất và người dùng có thể retry.

Kết quả: entry tồn tại bền vững và có thể mở lại từ thiết bị khác sau khi save thành công.

## Flow 2 — tìm và đọc lại

1. Người dùng mở Journal.
2. Hệ thống tải trang đầu tiên, sắp xếp theo thời gian cập nhật giảm dần.
3. Người dùng nhập từ khóa; tìm kiếm chỉ bắt đầu sau một debounce ngắn.
4. Kết quả khớp tiêu đề hoặc nội dung và luôn bị giới hạn theo owner.
5. Người dùng mở một entry để đọc hoặc chuyển sang edit.

Kết quả: người dùng tìm lại được dấu vết mà không phải nhớ ngày chính xác.

## Flow 3 — seal và mở lại

1. Khi cảm thấy reflection đã đủ, người dùng chọn “Seal”.
2. Hệ thống flush thay đổi chưa save, sau đó chuyển entry sang `Sealed`.
3. Entry được hiển thị ở chế độ đọc và có dấu hiệu rõ rằng nó đã khép lại.
4. Nếu muốn tiếp tục, người dùng chọn “Reopen”.
5. Hệ thống chuyển entry về `Draft` rồi mới cho chỉnh sửa.

Kết quả: người dùng có một nghi thức kết thúc nhẹ nhàng mà không vô tình công khai nội dung.

## Flow 4 — xóa và khôi phục

1. Người dùng chọn đưa entry vào Trash.
2. Giao diện giải thích rằng entry có thể khôi phục.
3. Entry biến mất khỏi danh sách chính và xuất hiện trong Trash.
4. Tại Trash, người dùng có thể restore hoặc yêu cầu xóa vĩnh viễn.
5. Xóa vĩnh viễn yêu cầu xác nhận rõ entry nào sẽ mất.

Kết quả: thao tác xóa thông thường có thể sửa sai; thao tác không thể phục hồi không bị ngụy trang thành soft delete.

## Business rules

1. Mọi entry phải có `ownerId`; không tồn tại journal vô chủ.
2. Owner là người duy nhất được tạo, đọc, sửa, seal, trash, restore hoặc xóa vĩnh viễn entry trong v1.
3. Nội dung có thể rỗng ngay khi tạo để editor mở tức thì, nhưng entry rỗng không nên sinh ra vô hạn do click lặp hoặc retry.
4. Autosave phải chống việc response cũ ghi đè nội dung mới. Mỗi update cần revision hoặc optimistic concurrency token.
5. `Saved` chỉ phản ánh revision đã được server xác nhận.
6. Search, list và get-by-id đều áp dụng cùng một ownership boundary.
7. Entry trong Trash không xuất hiện ở list/search mặc định.
8. Seal không thay đổi privacy.
9. Reopen là hành động có chủ đích; edit không âm thầm phá trạng thái sealed.
10. Server quyết định timestamps và lifecycle transition hợp lệ.

## Dữ liệu tối thiểu

| Field              | Ý nghĩa                              |
| ------------------ | ------------------------------------ |
| `id`               | Định danh ổn định của entry          |
| `ownerId`          | Chủ sở hữu bắt buộc                  |
| `title`            | Tiêu đề tùy chọn                     |
| `content`          | Nội dung do người dùng viết          |
| `state`            | `draft`, `sealed`, hoặc `trashed`    |
| `stateBeforeTrash` | Trạng thái để khôi phục đúng         |
| `revision`         | Chống xung đột autosave              |
| `createdAt`        | Thời điểm server tạo entry           |
| `updatedAt`        | Thời điểm revision gần nhất được lưu |
| `trashedAt`        | Thời điểm vào Trash, nếu có          |

## Events có ý nghĩa

- `journal.entry-created`
- `journal.entry-content-updated`
- `journal.entry-sealed`
- `journal.entry-reopened`
- `journal.entry-trashed`
- `journal.entry-restored`
- `journal.entry-permanently-deleted`

V1 không dùng các event này để cộng XP. Chúng tạo audit trail và mở đường cho Timeline hoặc insight ở giai đoạn sau.

## Trạng thái lỗi cần thiết kế

- Mất mạng trong khi autosave.
- Hai tab chỉnh cùng một entry.
- Entry đã bị trash hoặc xóa trên thiết bị khác.
- Token hết hạn trong khi người dùng đang viết.
- Tìm kiếm không có kết quả.
- Trang danh sách hết dữ liệu hoặc load tiếp thất bại.

Trong mọi trường hợp, nội dung người dùng vừa nhập phải được ưu tiên bảo toàn và lỗi phải cho biết họ có thể làm gì tiếp theo.

## Tiêu chí hoàn thành vertical slice

Journal v1 được xem là dùng được khi một người có thể hoàn thành flow sau bằng client thật và API thật:

```text
Đăng nhập
→ tạo entry
→ viết và thấy save thành công
→ reload trang mà nội dung vẫn còn
→ tìm lại entry
→ seal rồi reopen
→ đưa vào Trash
→ khôi phục
```

Flow phải có kiểm thử ownership: user B không thể đọc hoặc thay đổi entry của user A dù biết ID.

## Bài học lấy từ Forge OS

Forge OS đã chứng minh giá trị của editor tập trung, autosave, search, mood context và nghi thức “seal reflection”. Magnum Opus giữ editor, autosave, search, focus mode và seal.

Những điểm sau được thiết kế lại thay vì port nguyên:

- Forge OS trộn `private`, `published`, `archived`, `shared` và `internal` trong cùng status. Magnum Opus tách lifecycle khỏi privacy.
- Client cũ gửi `search` trong khi API đọc `keyword`; v1 dùng một contract thống nhất.
- Client cũ gọi API analyze chưa tồn tại trong Journal controller; AI analysis không nằm trong v1.
- Update tag cũ chỉ cộng thêm mà không thể thay thế; tag chưa vào v1.
- UI cũ nói delete không thể hoàn tác trong khi backend dùng soft delete; v1 phân biệt Trash và delete permanently.
- Autosave cũ đánh dấu state đã gửi trước khi server xác nhận và chưa có revision; v1 yêu cầu concurrency contract.
- Schema cũ cho phép `userId` rỗng; v1 bắt buộc owner.
