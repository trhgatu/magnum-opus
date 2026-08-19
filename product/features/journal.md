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
- Phục hồi có chủ đích khi cùng một entry được sửa ở nhiều tab hoặc thiết bị.
- Danh sách entry theo thời gian cập nhật gần nhất.
- Tìm kiếm trong tiêu đề và nội dung.
- Mở và tiếp tục chỉnh sửa entry.
- Focus mode để giảm nhiễu khi viết.
- Phím tắt cho lưu ngay, preview và focus mode.
- Đưa entry vào thùng rác và khôi phục.
- Xóa vĩnh viễn bằng một hành động xác nhận riêng.
- Phân trang hoặc infinite loading để lịch sử không bị giới hạn giả tạo.
- Gắn Mood riêng cho entry mà không làm thay đổi revision của nội dung Journal.
- Chủ động chọn lọc một entry thành Memory độc lập.
- Xem danh sách Memory đã được tạo từ chính entry đang mở, ngay tại trang chi tiết.

### Chưa có trong v1

- Public journal hoặc chia sẻ entry.
- AI analysis, sentiment score hay suggested action.
- Tag và các quan hệ với module khác ngoài Mood và Memory.
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
5. Giao diện hiển thị một trong bốn trạng thái: `Saving`, `Saved`, `Save failed`, hoặc `Conflict`.
6. Chỉ hiển thị `Saved` sau khi server xác nhận.
7. Nếu save thất bại, nội dung trên màn hình không bị mất và người dùng có thể retry.
8. Nếu người dùng chọn một link khác khi nội dung chưa được lưu, giao diện yêu cầu xác nhận trước khi rời editor.

Kết quả: entry tồn tại bền vững và có thể mở lại từ thiết bị khác sau khi save thành công.

### Khi hai nơi cùng sửa một entry

Nếu một tab hoặc thiết bị khác đã lưu trước, server từ chối request dùng revision cũ. Client giữ nguyên phần đang gõ và đưa ra hai lựa chọn rõ ràng:

1. **Dùng bản mới nhất**: tải nội dung đã được server xác nhận và bỏ phần đang gõ ở tab hiện tại.
2. **Ghi nội dung đang gõ**: tải revision mới nhất, sau đó ghi phần đang gõ lên revision đó bằng một request mới.

Client không tự chọn thay người dùng vì cả hai hướng đều có thể làm mất một phiên bản nội dung. Nếu entry mới nhất đã được seal hoặc đưa vào Trash, client chuyển sang bản mới nhất ở chế độ đọc và không cho ghi đè lifecycle đó.

Các phím tắt trong editor:

| Phím tắt               | Hành động                            |
| ---------------------- | ------------------------------------ |
| `Ctrl/Cmd + S`         | Lưu ngay thay vì chờ autosave        |
| `Ctrl/Cmd + Shift + P` | Chuyển giữa viết và Markdown preview |
| `Ctrl/Cmd + Shift + F` | Bật hoặc tắt focus mode              |
| `Escape`               | Thoát focus mode                     |

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
3. Tiêu đề là tùy chọn, được trim; chuỗi trắng trở thành `null` và tiêu đề có nội dung không vượt quá 200 ký tự.
4. Nội dung có thể rỗng ngay khi tạo để editor mở tức thì, nhưng entry rỗng không nên sinh ra vô hạn do click lặp hoặc retry.
5. Autosave phải chống việc response cũ ghi đè nội dung mới. Mỗi update cần revision hoặc optimistic concurrency token.
6. `Saved` chỉ phản ánh revision đã được server xác nhận.
7. Search, list và get-by-id đều áp dụng cùng một ownership boundary.
8. Entry trong Trash không xuất hiện ở list/search mặc định.
9. Seal không thay đổi privacy.
10. Reopen là hành động có chủ đích; edit không âm thầm phá trạng thái sealed.
11. Server quyết định timestamps và lifecycle transition hợp lệ.

## Dữ liệu tối thiểu

| Field              | Ý nghĩa                              |
| ------------------ | ------------------------------------ |
| `id`               | Định danh ổn định của entry          |
| `ownerId`          | Chủ sở hữu bắt buộc                  |
| `title`            | Tiêu đề tùy chọn                     |
| `content`          | Nội dung do người dùng viết          |
| `state`            | `DRAFT`, `SEALED`, hoặc `TRASHED`    |
| `stateBeforeTrash` | Trạng thái để khôi phục đúng         |
| `revision`         | Chống xung đột autosave              |
| `createdAt`        | Thời điểm server tạo entry           |
| `updatedAt`        | Thời điểm revision gần nhất được lưu |
| `trashedAt`        | Thời điểm vào Trash, nếu có          |

`ownerId` chỉ tồn tại bên trong server và database. API không trả field này cho client vì danh tính owner đã được xác định từ access token.

## Hợp đồng API của v1

Tất cả endpoint đều yêu cầu access token. Server luôn lấy `ownerId` từ token, không nhận `ownerId` do client gửi lên. Nhờ vậy, việc sửa request trên trình duyệt không thể biến entry của người khác thành entry của mình.

| Hành động     | Endpoint                                         | Dữ liệu chính                                                 |
| ------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| Tạo draft     | `POST /journal/entries`                          | `title?`, `content?`                                          |
| Xem danh sách | `GET /journal/entries`                           | `page`, `limit`, `search?`, `state?`, `sortBy?`, `sortOrder?` |
| Xem một entry | `GET /journal/entries/:id`                       | ID nằm trên URL                                               |
| Autosave      | `PUT /journal/entries/:id`                       | `title`, `content`, `expectedRevision`                        |
| Seal          | `PATCH /journal/entries/:id/seal`                | `expectedRevision`                                            |
| Reopen        | `PATCH /journal/entries/:id/reopen`              | `expectedRevision`                                            |
| Đưa vào Trash | `PATCH /journal/entries/:id/trash`               | `expectedRevision`                                            |
| Khôi phục     | `PATCH /journal/entries/:id/restore`             | `expectedRevision`                                            |
| Xóa vĩnh viễn | `DELETE /journal/entries/:id?expectedRevision=n` | Chỉ hợp lệ khi entry đang ở Trash                             |

### Vì sao request thay đổi phải gửi `expectedRevision`?

Giả sử cùng một entry đang được mở ở hai tab. Cả hai tab đều đọc revision 4. Tab A save trước và server tạo revision 5. Khi tab B vẫn gửi `expectedRevision: 4`, server trả lỗi conflict thay vì âm thầm ghi đè nội dung mới của tab A.

Sau mỗi response thành công, client phải giữ lại `revision` mới nhất. Nếu nhận lỗi `JOURNAL_ENTRY_REVISION_CONFLICT`, client không được tự retry cùng nội dung như thể không có chuyện gì xảy ra; nó phải tải bản mới nhất hoặc cho người dùng chọn cách xử lý.

### Ownership được biểu hiện như thế nào?

Nếu user B yêu cầu ID của entry thuộc user A, API trả not found giống như entry không tồn tại. Response không tiết lộ rằng ID đó hợp lệ hoặc ai là owner. Quy tắc này áp dụng đồng nhất cho đọc, sửa, đổi trạng thái và xóa.

## Events

`journal.entry-sealed` (`JournalEntrySealedEvent`) đã được phát thật, đi qua Outbox transactional cùng transaction với việc seal, và có đúng một consumer thật: ghi một dòng vào read model Timeline nội bộ (`contexts/reflection/timeline`, chưa có API/UI — xem `docs/modules/backend.md`).

Các vocabulary còn lại vẫn chỉ là dự kiến, chưa được phát:

- `journal.entry-created`
- `journal.entry-content-updated`
- `journal.entry-reopened`
- `journal.entry-trashed`
- `journal.entry-restored`
- `journal.entry-permanently-deleted`

Nguyên tắc không đổi: chỉ thêm event mới khi có consumer thật. Việc phát event chưa có consumer sẽ làm outbox phức tạp hơn mà chưa tạo giá trị sản phẩm.

## Trạng thái triển khai hiện tại

Journal v1 đã hoàn thành vertical slice từ giao diện đến database.

Ở client, người dùng có thể tạo entry, viết với autosave, lưu ngay bằng phím tắt, xem Markdown preview, bật focus mode, tìm kiếm, lọc theo trạng thái và thực hiện đầy đủ vòng đời seal, reopen, trash, restore. Nội dung đang gõ được giữ tại browser khi save thất bại. Khi revision conflict xảy ra, giao diện giữ local content và yêu cầu người dùng chọn bản mới nhất hoặc chủ động ghi phần đang gõ lên revision mới. Entry còn có thể ghi lại Mood riêng, mở flow chọn lọc nội dung thành một Memory độc lập, và xem lại mọi Memory đã tạo từ chính entry đó ngay dưới nội dung.

Ở backend, slice gồm validation, authentication, ownership, command/query handlers, domain lifecycle, optimistic concurrency, Prisma repository và response presenter. Bài E2E cấp API chứng minh user B không thể truy cập entry của user A. Bài E2E trình duyệt chạy flow thật qua Next.js BFF và xác nhận access token không xuất hiện trong JavaScript, đồng thời browser không gọi trực tiếp backend.

Đây là module tham chiếu cho feature tiếp theo: bắt đầu từ business language và state machine, giữ domain độc lập, đặt orchestration trong application, cô lập persistence sau repository port, rồi nối presentation và client bằng contract có kiểu rõ ràng. Không sao chép máy móc mọi file; module đơn giản hơn không cần lifecycle service, revision hay client editor nếu nghiệp vụ không yêu cầu.

## Khi việc lưu bị gián đoạn

Journal ưu tiên giữ lại phần đang viết. Giao diện chỉ báo `Saved` sau khi server đã xác nhận; việc nội dung còn xuất hiện trong ô soạn thảo chưa có nghĩa là nó đã được lưu.

### Mất kết nối trong lúc autosave

Nếu trình duyệt không gửi được yêu cầu lưu, nội dung vẫn nằm nguyên trong editor và trạng thái chuyển sang `Save failed`. Khi kết nối trở lại, người dùng chọn **Thử lưu lại**. Autosave không âm thầm xóa hoặc thay nội dung bằng bản cũ từ server.

### Cùng một entry được mở ở hai nơi

Nếu nơi khác đã lưu trước, Journal dừng autosave và báo xung đột. Người dùng có thể dùng bản mới nhất trên server hoặc giữ phần đang gõ để lưu lên revision mới. Journal không tự chọn vì cả hai quyết định đều có thể làm mất một phiên bản có ý nghĩa.

### Entry bị đưa vào Trash hoặc xóa ở nơi khác

Journal dừng autosave thay vì cố ghi đè trạng thái mới. Phần đang gõ vẫn còn trên màn hình và có thể được sao chép thành văn bản Markdown. Sau đó người dùng quay lại danh sách Journal hoặc đăng nhập lại nếu phiên làm việc đã kết thúc. Cách xử lý này bảo toàn nội dung ngay cả khi entry trên server không còn có thể chỉnh sửa.

### Phiên đăng nhập hết hạn

Trước khi mở trang được bảo vệ hoặc gửi một Server Action, lớp bảo vệ của client thử làm mới phiên đăng nhập bằng refresh cookie. Nếu không thể khôi phục phiên, editor giữ nguyên nội dung, dừng autosave và đưa ra hành động đăng nhập lại. Nhiều yêu cầu đồng thời dùng chung một lần refresh để tránh tạo một chuỗi refresh trùng lặp.

Các hành vi mất kết nối, xung đột hai tab, remote Trash và remote delete đều có bài E2E chạy qua trình duyệt, Next.js BFF, API và database thật. Những trường hợp còn lại cần tiếp tục được theo dõi khi sản phẩm phát triển là lỗi tải thêm ở danh sách và trải nghiệm tìm kiếm không có kết quả.

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
