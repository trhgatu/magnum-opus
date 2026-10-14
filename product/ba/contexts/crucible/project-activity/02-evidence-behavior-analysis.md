# Crucible — Project Activity Evidence — Behavior Analysis

> **Status:** Draft / Discovery
>
> **Domain:** Crucible / Projects / Activity Evidence
>
> **Purpose:** Phân tích chi tiết cách một hoạt động (commit, pull request) được ghi vào sổ hoạt động, được gắn vào Project Cycle, cách chỗ lệch giữa lời tuyên bố và hành vi được xác định, cách bằng chứng được đóng băng, và các ca biên — trước khi baseline Functional Requirements và Business Rules.

---

## 1. Scope of This Analysis

Tài liệu này áp dụng cho **Phase 1 (GitHub)** của `01-ba-overview.md`.

Khái niệm, nhu cầu và quyết định nền: `01-ba-overview.md` §5, §11, §14. Kiến trúc và thiết kế DB: `03-integration-architecture.md`.

Lifecycle và Project Cycle được dùng nguyên như baseline: `../project/02-lifecycle-behavior-analysis.md` §4–§9, §21. Tài liệu này không thay đổi chúng.

---

## 2. Activity Event

### 2.1. Event Types

Mỗi Activity Event là **một sự kiện có thời điểm**, không phải một đối tượng.

| Type              | Thời điểm                                 | Nguồn GitHub |
| ----------------- | ----------------------------------------- | ------------ |
| `COMMIT_AUTHORED` | Lúc commit được viết (author date)        | Commit       |
| `PR_OPENED`       | Lúc pull request được mở (`created_at`)   | Pull request |
| `PR_MERGED`       | Lúc pull request được merge (`merged_at`) | Pull request |

Một pull request sinh tối đa 2 event. Pull request bị đóng mà không merge chỉ có `PR_OPENED`.

### 2.2. Why Author Date

Commit có hai thời điểm:

```text
author date     lúc người dùng viết thay đổi        → giữ nguyên qua rebase / cherry-pick
committer date  lúc commit được ghi lần cuối        → đổi khi rebase, amend, cherry-pick
```

Author date là thời điểm người dùng **thực sự làm việc**, nên là thời điểm của `COMMIT_AUTHORED`.

```text
05/10  viết commit
08/10  rebase nhánh lên main      (committer date → 08/10)
12/10  merge PR                    (merge commit → 12/10, không tính)

COMMIT_AUTHORED rơi vào 05/10.
```

Ngày push và ngày merge không phải thời điểm của commit.

### 2.3. Whose Activity

Chỉ event thuộc về **công việc của chính người dùng** được tính (DEC-PAC-007):

- Commit: tác giả là tài khoản GitHub của Connection.
- Pull request: người mở là tài khoản GitHub của Connection.
- `PR_MERGED` là **kết quả của PR do người dùng mở** — được tính khi PR đó được merge, bất kể ai bấm merge. Nó đánh dấu lúc công việc của người dùng được đưa vào sản phẩm, không phải hành động của người bấm merge.

Không được tính:

| Loại                                            | Lý do                                               |
| ----------------------------------------------- | --------------------------------------------------- |
| Commit/PR của bot (vd Dependabot)               | Không phải công sức của người dùng                  |
| Commit/PR của người khác                        | Phase 1 chỉ dành cho một người dùng                 |
| Merge commit (commit có từ 2 parent trở lên)    | Là thao tác merge, đã được đại diện bởi `PR_MERGED` |
| Commit GitHub không liên kết được với tài khoản | Không xác định được tác giả — xem §6.6              |

### 2.4. Which Commits Are Visible

Người dùng làm việc trên nhánh rồi mới merge. Nếu chỉ đọc nhánh mặc định, công việc trên nhánh chưa merge sẽ vô hình trong lúc Cycle đang mở.

Do đó:

- Commit được đọc từ **mọi nhánh đang tồn tại** của repository.
- Một commit có thể xuất hiện trên nhiều nhánh → chỉ được ghi một lần nhờ khóa chống trùng (§2.5).
- Nhánh đã xóa sau khi merge không gây mất dữ liệu: với merge commit (ASM-PAC-003), commit gốc vẫn nằm trên nhánh mặc định.
- Commit đã được chép vào sổ thì được giữ lại, kể cả khi nhánh chứa nó bị xóa sau đó (§6.2).

### 2.5. Ledger Entry and De-duplication

Mỗi Activity Event được ghi vào sổ hoạt động (DEC-PAC-008) dưới dạng tối thiểu:

```text
{ feed, loại, thời điểm, số lượng, khóa chống trùng }
```

Sổ được chép đi chép lại (mỗi lần mở trang, mỗi lần khép Cycle, với khoảng đệm chồng lên lần trước). Khóa chống trùng đảm bảo một sự kiện chỉ có **một** dòng, dù được chép bao nhiêu lần (DEC-PAC-012):

| Type              | Khóa chống trùng                          | Lý do                                                                                                                                                  |
| ----------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `COMMIT_AUTHORED` | Mã băm của (author date + commit message) | Rebase và cherry-pick tạo SHA mới nhưng giữ nguyên author date và message → cùng một công sức không bị đếm hai lần. Chỉ lưu mã băm, không lưu message. |
| `PR_OPENED`       | Số hiệu PR                                | Mỗi PR được mở một lần                                                                                                                                 |
| `PR_MERGED`       | Số hiệu PR                                | Mỗi PR được merge một lần (khác loại nên không đụng `PR_OPENED`)                                                                                       |

Hệ quả có chủ đích: một dòng sổ không bao giờ bị sửa. Sổ chỉ được thêm dòng.

**Va chạm khóa commit (chấp nhận):** hai commit khác nhau có cùng author date (độ chính xác tới giây) **và** cùng message sẽ bị gộp thành một dòng. Điều này chỉ xảy ra khi commit được tạo hàng loạt bằng script hoặc message trống/lặp trong cùng một giây. Hệ quả là đếm thiếu commit; ngày hoạt động không bị ảnh hưởng (cùng ngày). Đánh đổi này được chọn vì khóa dựa trên SHA đếm trùng mọi commit bị rebase — sai số lớn và thường gặp hơn nhiều. Khóa dựa trên nội dung thay đổi (patch-id) tránh được cả hai nhưng đòi hỏi tải diff của từng commit; để lại cho thiết kế kỹ thuật nếu va chạm trở thành vấn đề thực tế.

---

## 3. Attribution

Attribution trả lời hai câu hỏi cho mỗi Activity Event:

1. Event thuộc **Cycle nào**?
2. Lúc đó người dùng đang **tuyên bố** gì?

Attribution chỉ đọc sổ hoạt động và lịch sử chuyển trạng thái; nó không biết nguồn của event là gì (DEC-PAC-010).

### 3.1. Declaration Timeline

Từ lịch sử chuyển trạng thái (`ProjectLifecycleTransition`, mỗi bản ghi có `occurredAt`), dựng được một dòng thời gian liên tục của lời tuyên bố:

```text
Transition:    Start        Pause        Resume       Complete     Reopen
               01/10 09:00  06/10 20:00  10/10 08:00  12/10 17:00  20/10 10:00
                  │            │            │            │            │
Timeline:  ───────┼────────────┼────────────┼────────────┼────────────┼──────►
 Declaration  NOT_STARTED │  ACTIVE   │  PAUSED   │  ACTIVE   │ COMPLETED │ ACTIVE
 Cycle          (none)    │◄──────────── Cycle 1 ───────────►│  (none)   │ Cycle 2
```

Mỗi khoảng là **nửa mở** `[bắt đầu, kết thúc)`: một event xảy ra đúng thời điểm Pause thuộc về khoảng PAUSED.

**Ranh giới Cycle 1:** BA Project (`../project/02` §8) mô tả Cycle 1 bắt đầu khi tạo Project, ở trạng thái NOT_STARTED; implementation chỉ tạo bản ghi Cycle khi Start. Capability này **không phụ thuộc** vào cách hiểu nào: hoạt động lúc NOT_STARTED luôn được coi là chưa có vòng theo đuổi nào đang diễn ra — nằm ngoài Cycle và chỉ dùng cho D4 (DEC-PAC-014). Việc thống nhất câu chữ BA Project được theo dõi ở OQ-PAC-005.

### 3.2. Attribution Rule

| Lúc event xảy ra, Declaration là | Cycle         | Nhãn                               |
| -------------------------------- | ------------- | ---------------------------------- |
| `ACTIVE`                         | Cycle đang mở | `ACTIVE`                           |
| `PAUSED`                         | Cycle đang mở | `PAUSED`                           |
| `NOT_STARTED`                    | Không có      | Ngoài Cycle — trước khi bắt đầu    |
| `STOPPED` / `COMPLETED`          | Không có      | Ngoài Cycle — sau khi khép Cycle N |

Lý do PAUSED vẫn thuộc Cycle (DEC-PAC-004): Pause không kết thúc vòng theo đuổi (`../project/02` §8). Công sức bỏ ra lúc đó vẫn là công sức của vòng này. Bỏ nó đi làm bằng chứng sai sự thật; tách nó thành một bộ số liệu riêng làm bằng chứng khó đọc. Thay vào đó, event giữ nhãn `PAUSED` để chỉ ra chỗ lệch (§4).

Một pull request có thể vắt qua nhiều khoảng. Mỗi event của nó được gắn **độc lập**:

```text
PR #150   mở 11/10 (Cycle 1, ACTIVE)   merge 21/10 (Cycle 2, ACTIVE)
→ PR_OPENED thuộc Cycle 1, PR_MERGED thuộc Cycle 2. Không đếm trùng.
```

### 3.3. From Events to Days

Cycle Activity được tổng hợp theo **ngày lịch trong múi giờ của tài khoản** (cùng quy ước với Today và nhãn quá hạn V1.1).

Mỗi ngày trong phạm vi Cycle có một trong các trạng thái:

| Trạng thái ngày           | Mã              | Điều kiện                                              |
| ------------------------- | --------------- | ------------------------------------------------------ |
| Có hoạt động              | `ACTIVE`        | ≥ 1 event nhãn `ACTIVE` trong ngày                     |
| Có hoạt động lúc tạm dừng | `PAUSED_ACTIVE` | ≥ 1 event trong ngày và mọi event đều nhãn `PAUSED`    |
| Tạm dừng, không hoạt động | `PAUSED_IDLE`   | Ngày nằm hoàn toàn trong khoảng PAUSED, không có event |
| Không hoạt động           | `IDLE`          | Còn lại                                                |

Một ngày có thể vừa ACTIVE vừa PAUSED (vd Pause lúc 20:00). Ngày đó là `ACTIVE` nếu có ít nhất một event lúc ACTIVE.

### 3.4. Cycle Activity Metrics

| Metric                      | Định nghĩa                                  |
| --------------------------- | ------------------------------------------- |
| Ngày hoạt động              | Số ngày `ACTIVE` + `PAUSED_ACTIVE`          |
| Ngày hoạt động lúc tạm dừng | Số ngày `PAUSED_ACTIVE`                     |
| Commit                      | Số `COMMIT_AUTHORED`                        |
| PR mở                       | Số `PR_OPENED`                              |
| PR merge                    | Số `PR_MERGED`                              |
| Hoạt động gần nhất          | Thời điểm của event mới nhất                |
| Dải ngày                    | Trạng thái của từng ngày trong Cycle (§3.3) |

"Ngày hoạt động" là metric chính (ASM-PAC-004). Không có metric nào được trình bày như điểm số hay mục tiêu.

---

## 4. Divergence

### 4.1. Matrix

Đặt lời tuyên bố cạnh hành vi cho ra sáu ô:

| Declaration             | Có hoạt động                       | Không hoạt động một thời gian      |
| ----------------------- | ---------------------------------- | ---------------------------------- |
| `NOT_STARTED`           | **D4** — chưa bắt đầu nhưng đã làm | ✅ khớp                            |
| `ACTIVE`                | ✅ khớp                            | **D1** — nói đang làm nhưng im lìm |
| `PAUSED`                | **D2** — nói tạm gác nhưng vẫn làm | ✅ khớp                            |
| `STOPPED` / `COMPLETED` | **D3** — đã khép nhưng vẫn làm     | ✅ khớp                            |

Bốn ô lệch được đối xử **như nhau** về nguyên tắc (Analysis Principle 2): đều được chỉ ra, đều không bị hệ thống tự sửa.

### 4.2. Why the System Does Not Resolve Divergence

Cùng một chỗ lệch có nhiều nguyên nhân mà hệ thống không phân biệt được:

| Divergence | Nguyên nhân có thể                                                           |
| ---------- | ---------------------------------------------------------------------------- |
| D1         | Bận; đang nghĩ/thiết kế chứ chưa code; đã thực sự buông nhưng chưa thừa nhận |
| D2         | Quên bấm Tiếp tục; sửa gấp; chưa buông được                                  |
| D3         | Sửa vặt sau khi xong; một vòng mới bắt đầu mà chưa Mở lại                    |
| D4         | Đã bắt đầu mà quên bấm Bắt đầu; dọn dẹp trước khi bắt đầu                    |

Chỉ người dùng biết nguyên nhân. Vì vậy hệ thống chỉ chỉ ra chỗ lệch và để người dùng tự dùng các hành động lifecycle sẵn có.

Hệ thống **không** tự chuyển trạng thái (DEC-PAC-005). Một transition tự động sẽ được ghi vĩnh viễn vào lịch sử bất biến như thể người dùng đã tuyên bố điều đó.

### 4.3. Divergence Definitions

| ID  | Điều kiện                                                                                                | Hiển thị (ví dụ)                                                         | Ngưỡng ban đầu |
| --- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------- |
| D1  | `ACTIVE` và không có event trong N ngày gần nhất, tính từ `max(event gần nhất, lần vào ACTIVE gần nhất)` | Dòng thông tin: "Đã 7 ngày chưa có hoạt động."                           | N = 7          |
| D2  | `PAUSED` và trong lần tạm dừng hiện tại có event ở ≥ K ngày khác nhau                                    | Lời nhắc: "Có hoạt động trong 2 ngày dù đang tạm dừng." + **[Tiếp tục]** | K = 2          |
| D3  | `STOPPED`/`COMPLETED` và có ≥ 1 event sau khi Cycle cuối khép lại                                        | Dòng thông tin: "4 commit kể từ khi hoàn thành (gần nhất 14/10)."        | 1 event        |
| D4  | `NOT_STARTED` và có ≥ 1 event sau khi nguồn được gắn                                                     | Dòng thông tin: "Đã có hoạt động dù chưa bắt đầu."                       | 1 event        |

Các ngưỡng là tham số hiệu chỉnh (OQ-PAC-002, ASM-PAC-005), không phải bản thân logic.

Ghi chú:

- D1 tính từ lần vào ACTIVE gần nhất để vừa Start/Resume xong không bị nhắc ngay.
- D2 dùng ngưỡng ngày khác nhau, không phải số commit: một tối sửa gấp nhiều commit vẫn chỉ là 1 ngày.
- D4 chỉ tính event sau khi nguồn được gắn, để repository có sẵn lịch sử lâu năm không bị coi là "đã làm trước khi bắt đầu".

### 4.4. Presentation

Bốn ô lệch giống nhau về nguyên tắc nhưng khác nhau về **mức cần một quyết định**:

| Divergence | Hình thức                         | Lý do                                                                                                                                                                                 |
| ---------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D2         | Lời nhắc nổi bật + nút [Tiếp tục] | Ca phổ biến nhất là quên bấm Tiếp tục; một nút giải quyết ngay. Tự biến mất khi trạng thái đổi hoặc khi lần tạm dừng kết thúc.                                                        |
| D1, D3, D4 | Dòng thông tin nhỏ, không nút     | Không có hành động đúng mặc định (D1 có thể chỉ là một tuần bận; repository của một Project đã hoàn thành có thể vẫn nhận commit mãi). Người dùng dùng nút lifecycle sẵn có nếu muốn. |

Không có thao tác "bỏ qua" và không có trạng thái "đã bỏ qua" được lưu: lời nhắc D2 tự biến mất theo trạng thái, các dòng thông tin không đòi hỏi phản hồi. Việc này giữ cho chỗ lệch là **thông tin**, không phải việc phải xử lý.

Nút [Tiếp tục] **chính là** lifecycle action Resume hiện có, đi qua đúng luồng hiện tại: cùng revision check, cùng business rule. Divergence không tạo đường tắt nào vượt qua lifecycle.

---

## 5. Snapshot

### 5.1. When and How

Khi một Cycle **thực sự** khép lại (Stop hoặc Complete từ ACTIVE/PAUSED — không phải Stop từ NOT_STARTED, vốn không có Cycle), module Project phát event "Cycle đã khép" qua outbox (`03` §6). Module Project Activity nhận event và:

```text
0. Đã có snapshot cho Cycle này? → dừng (event có thể được gửi lại)
1. Xác định nguồn của Cycle: các Project Source được gắn trước thời điểm khép
      └── không có nguồn nào → không tạo snapshot, dừng
2. Thử chép lần cuối các feed đó (giới hạn thời gian ngắn)
      ├── thành công → sổ của feed đầy đủ tới bây giờ
      └── thất bại   → bỏ qua, dùng sổ như hiện có
3. Tính Cycle Activity từ sổ (§3)
4. Lưu Activity Snapshot, kèm mức đầy đủ của sổ cho từng nguồn
```

Lifecycle action **không chờ** bước này: người dùng bấm Hoàn thành và Cycle khép ngay như hiện tại.

Quy tắc:

- **Chỉ Cycle có nguồn mới có snapshot.** Project không có nguồn (vd "Học piano") không bao giờ nhận một snapshot "0 hoạt động" — thiếu bằng chứng không được trình bày như không hoạt động (`01` §6).
- **Nguồn của snapshot là nguồn đang gắn lúc khép.** Nguồn gắn sau thời điểm khép không được tính. Việc gỡ nguồn trong vài giây giữa lúc khép và lúc event được xử lý là trường hợp chấp nhận được (nguồn bị gỡ không được tính).
- **Mức đầy đủ được ghi theo từng nguồn.** Mỗi nguồn trong snapshot mang `dataUntil` của chính nó; `dataUntil` chung của snapshot là giá trị **nhỏ nhất** trong số đó — tức là mọi nguồn đều đầy đủ ít nhất tới thời điểm này. Nếu lần chép cuối thất bại, khoảng thiếu thường chỉ vài phút đến vài giờ, vì sổ được chép mỗi khi người dùng mở trang Project.
- **Ghi snapshot là thao tác tạo-nếu-chưa-có.** Outbox có thể gửi lại event; snapshot đã có được giữ nguyên, không bị ghi đè hay báo lỗi.

### 5.2. Content

| Field          | Ghi chú                                                       |
| -------------- | ------------------------------------------------------------- |
| Phạm vi        | Từ lúc Cycle mở đến lúc Cycle khép                            |
| Metrics        | Toàn bộ §3.4, bao gồm ngày hoạt động lúc tạm dừng             |
| Dải ngày       | Trạng thái từng ngày                                          |
| Nguồn          | Tên và `dataUntil` của từng nguồn đã dùng, tại thời điểm chụp |
| Múi giờ        | Múi giờ đã dùng để chia ngày                                  |
| `dataUntil`    | Nhỏ nhất trong `dataUntil` của các nguồn                      |
| Thời điểm chụp |                                                               |

### 5.3. Immutability

Snapshot không bao giờ đổi, kể cả khi:

- commit cũ bị rebase, force-push hay xóa;
- repository bị xóa, đổi tên hay mất quyền;
- nguồn bị gỡ khỏi Project;
- người dùng đổi múi giờ;
- sổ nhận thêm event trễ có thời điểm nằm trong Cycle đã khép;
- ngưỡng hay định nghĩa metric thay đổi trong các phiên bản sau.

### 5.4. Cycles Closed Before Sources Existed

Cycle đã khép trước khi capability tồn tại, hoặc trước khi nguồn được gắn, chưa có snapshot.

GitHub cho phép đọc lại lịch sử, nên về kỹ thuật có thể chép bù và tính bù. Tuy nhiên tính bù dùng các nguồn **hiện tại** cho một vòng trong quá khứ — đây là quyết định sản phẩm, không phải kỹ thuật (OQ-PAC-006).

---

## 6. Edge Cases

### 6.1. Rebase / Force-push

Rebase giữ nguyên author date và message, nên commit sau rebase có cùng khóa chống trùng và không tạo dòng mới (§2.5). Commit bị loại bỏ bằng force-push **sau khi đã được chép** vẫn nằm trong sổ: công sức đó đã thực sự diễn ra.

### 6.2. Deleted Unmerged Branch

Commit chỉ nằm trên một nhánh chưa merge:

- đã được chép trước khi nhánh bị xóa → giữ trong sổ;
- chưa kịp chép (nhánh tạo và xóa giữa hai lần chép) → không bao giờ thấy được. Chấp nhận.

### 6.3. Cherry-pick

Cherry-pick giữ author date và message → cùng khóa chống trùng → một dòng. (Nếu message bị sửa khi cherry-pick, hai dòng được tạo; ngày hoạt động không bị ảnh hưởng.)

### 6.4. Squash Merge

Squash merge thay các commit gốc bằng một commit mới. Nếu commit gốc đã được chép từ nhánh trước khi squash, chúng vẫn nằm trong sổ; commit squash là một sự kiện thêm (author date thường là lúc merge). Nếu chưa được chép, hoạt động của cả nhánh dồn về một commit. Repository hiện tại dùng merge commit (ASM-PAC-003).

### 6.5. Wrong Author Date

Author date do máy người viết quyết định và có thể sai (đồng hồ lệch, ngày tương lai). Event được gắn theo đúng ngày ghi trên commit; event rơi ngoài mọi khoảng thì nằm ngoài Cycle. Không sửa dữ liệu nguồn.

### 6.6. Unlinked Commit Author

GitHub chỉ liên kết commit với tài khoản khi email commit đã được xác minh trên tài khoản đó. Commit dùng email khác bị coi là không xác định tác giả và không được tính (§2.3). Giao diện kết nối nên giải thích điều này (OQ-PAC-007).

### 6.7. Repository Renamed or Transferred

Feed nhận diện repository bằng định danh số ổn định, không bằng tên. Đổi tên không làm mất liên kết; tên hiển thị được cập nhật ở lần chép sau.

### 6.8. Access Lost / Token Expired / Repository Deleted

Feed chuyển trạng thái lỗi, kèm hướng xử lý (cập nhật token, kiểm tra quyền). Sổ đã chép, snapshot đã có, lifecycle, outcome, ngày dự kiến, ghi chú đều không bị ảnh hưởng.

Khi feed đang lỗi, Divergence dựa trên **sự vắng mặt** của hoạt động (D1) không được tính — không hiển thị "7 ngày chưa có hoạt động" chỉ vì không đọc được nguồn.

### 6.9. Same Repository on Several Projects

Được phép. Repository có **một** feed, được chép một lần; mỗi Project nối vào feed đó và tự tính theo Cycle của mình (DEC-PAC-011). Cùng một commit có thể xuất hiện trong bằng chứng của hai Project. Giao diện gắn nguồn cảnh báo khi repository đã được Project khác dùng.

### 6.10. Time Zone Change

Cycle Activity đang tính dùng múi giờ hiện tại của tài khoản. Snapshot giữ múi giờ lúc chụp và không tính lại.

### 6.11. Source Added or Removed Mid-Cycle

- Gắn nguồn giữa Cycle: hoạt động của nguồn được tính cho **toàn bộ** Cycle đang mở. Nếu sổ của feed chưa phủ tới lúc Cycle mở, feed được chép bù tới đó (`03` §5.3).
- Gỡ nguồn giữa Cycle: hoạt động của nguồn đó biến mất khỏi Cycle Activity đang tính. Feed và sổ vẫn còn; gắn lại không phải chép lại. Snapshot đã chụp không đổi.

### 6.12. Reopened on the Same Day

Complete lúc 17:00, Reopen lúc 21:00 cùng ngày. Event 17:00–21:00 nằm ngoài Cycle (D3 có thể xuất hiện ngắn). Ngày đó xuất hiện ở cuối dải ngày của Cycle cũ và đầu dải ngày của Cycle mới; mỗi event chỉ thuộc một nơi.

### 6.13. Late Events

Commit viết từ trước nhưng push muộn có author date cũ. Việc chép luôn lùi lại một khoảng đệm so với lần trước (`03` §5.2) để bắt các event này. Event trễ có thời điểm nằm trong một Cycle **đang mở** được tính bình thường; nằm trong Cycle **đã khép** thì vào sổ nhưng không làm đổi snapshot (§5.3).

### 6.14. Query Window vs Author Date

Bộ lọc thời gian của API commit (cả REST lẫn GraphQL) dựa trên **committer date**, không phải author date — đã kiểm chứng (`03` §10, TQ-PAC-01).

Trong luồng làm việc thông thường (commit, rebase, cherry-pick, amend), committer date **không sớm hơn** author date, nên truy vấn theo khoảng của lần chép rồi lọc lại theo author date sẽ không bỏ sót. Tuy nhiên Git cho phép đặt hai ngày này tùy ý: một commit có committer date sớm hơn author date (thường do chỉnh ngày bằng tay) có thể nằm ngoài khoảng truy vấn và bị bỏ sót. Phase 1 chấp nhận giới hạn này; lần chép bù đầu tiên của mỗi feed (`03` §5.3) dùng khoảng đệm rộng để giảm rủi ro. Đây là ràng buộc cho thiết kế, không thay đổi hành vi.

### 6.15. Volume, Rate Limits and Freshness

Đọc mọi nhánh của repository lớn tốn nhiều request. Feed chỉ được chép lại khi lần chép trước đã cách một khoảng ngắn (vd 10 phút), nên mở trang Project nhiều lần không tạo lại toàn bộ truy vấn. Khi bị giới hạn request, feed đợi tới lúc giới hạn được mở lại và dùng sổ như hiện có.

---

## 7. End-to-End Example

Project "Magnum Opus", repository `trhgatu/magnum-opus` gắn ngày 28/09. Múi giờ tài khoản `Asia/Ho_Chi_Minh`.

| Thời điểm    | Sự kiện                                                                       | Gắn vào                                                   | Hiển thị                                                     |
| ------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| 29/09        | 2 commit dọn dẹp                                                              | Ngoài Cycle (NOT_STARTED, sau khi gắn nguồn)              | D4: "Đã có hoạt động dù chưa bắt đầu."                       |
| 01/10        | **Start** — Cycle 1, outcome "Ship Project V1.1", dự kiến 10/10               |                                                           | D4 biến mất                                                  |
| 02–05/10     | 14 commit; PR #144 mở 03/10, merge 05/10; 1 commit Dependabot; 1 merge commit | Cycle 1, `ACTIVE` (Dependabot và merge commit không tính) | 4 ngày hoạt động                                             |
| 06/10 20:00  | **Pause**                                                                     |                                                           |                                                              |
| 08/10, 09/10 | 3 commit                                                                      | Cycle 1, `PAUSED`                                         | D2: "Có hoạt động trong 2 ngày dù đang tạm dừng." [Tiếp tục] |
| 10/10        | **Resume** (từ nút của lời nhắc D2)                                           |                                                           | D2 biến mất                                                  |
| 11/10        | 6 commit; PR #145 mở + merge; PR #146 và #150 mở                              | Cycle 1, `ACTIVE`                                         | Nhãn V1.1 "Quá hạn dự kiến 1 ngày"                           |
| 12/10        | 16:50 PR #146 merge; 17:00 **Complete**, ghi chú "Lên production, trễ 2 ngày" | Cycle 1 khép                                              | Snapshot được chụp từ sổ                                     |
| 14/10        | 1 commit sửa chính tả                                                         | Ngoài Cycle (COMPLETED)                                   | D3: "1 commit kể từ khi hoàn thành."                         |
| 20/10        | **Reopen** — Cycle 2, outcome "Habit insight"                                 |                                                           | D3 biến mất                                                  |
| 21–23/10     | Code; PR #150 (mở 11/10 ở Cycle 1) được merge 21/10                           | Cycle 2, `ACTIVE`; `PR_MERGED` của #150 thuộc Cycle 2     |                                                              |
| 24–30/10     | Không hoạt động, không Pause                                                  |                                                           | Ngày 30/10: D1 "Đã 7 ngày chưa có hoạt động."                |

Snapshot của Cycle 1 (bất biến):

```text
Cycle 1 · 01/10 → 12/10 · Hoàn thành
  Ngày hoạt động: 8 (trong đó 2 ngày lúc tạm dừng)
  Commit: 23 · PR mở: 4 · PR merge: 3
  Hoạt động gần nhất: 12/10
  Nguồn: trhgatu/magnum-opus · Múi giờ: Asia/Ho_Chi_Minh · Dữ liệu tới: 12/10 17:00 (lần chép cuối thành công)
```

PR #150 xuất hiện ở hai Cycle qua hai event khác nhau (`PR_OPENED` ở Cycle 1, `PR_MERGED` ở Cycle 2); không có gì bị đếm hai lần và snapshot Cycle 1 không thay đổi.

---

## 8. Additional Open Questions

| ID         | Question                                                                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-PAC-006 | Có tính bù snapshot cho các Cycle đã khép trước khi nguồn được gắn không? Nếu có, đánh dấu là "tính bù" để phân biệt với snapshot chụp đúng lúc khép. |
| OQ-PAC-007 | Commit không liên kết được tác giả (§6.6) có nên được báo số lượng ("N commit không xác định tác giả") để người dùng tự sửa cấu hình email không?     |
| OQ-PAC-008 | D1 có nên tính cả các ngày cuối tuần, hay người dùng có nhịp làm việc riêng cần được tôn trọng? Phase 1 đề xuất tính mọi ngày.                        |

Các open question của overview: `01-ba-overview.md` §15.

---

## 9. Next Step

`03-integration-architecture.md` mô tả cách các hành vi trên được hiện thực: cấu trúc module, luồng chép, luồng event, thiết kế DB.
