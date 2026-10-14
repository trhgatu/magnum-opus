# Crucible — Project Activity Evidence — Use Cases & Acceptance Criteria

> **Status:** Analysis / Candidate Baseline
>
> **Domain:** Crucible / Projects / Activity Evidence
>
> **Purpose:** Mô tả các Use Case của Phase 1 (GitHub) và Acceptance Criteria có thể kiểm chứng của từng Use Case, dựa trên Functional Requirements và Business Rules của `04`.

---

## 1. Related Documentation

| File                                             | Cung cấp cho tài liệu này                                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `01-ba-overview.md`                              | User Needs, Scope, Decisions                                                                          |
| `02-evidence-behavior-analysis.md`               | Hành vi chi tiết, ca biên, ví dụ                                                                      |
| `03-integration-architecture.md`                 | Luồng đồng bộ, luồng event                                                                            |
| `04-functional-requirements-business-rules.md`   | FR-PAC, BR-PAC, Candidate Use Cases                                                                   |
| `../project/04-use-cases-acceptance-criteria.md` | UC-PRJ-007 (Resume), UC-PRJ-008 (Stop), UC-PRJ-009 (Complete), UC-PRJ-014 (View Closed Cycle History) |

---

## 2. Use Case Principles

Các nguyên tắc UCP-PRJ-001 → 004 của Projects áp dụng nguyên vẹn. Thêm:

### UCP-PAC-001 — Activity Never Moves Lifecycle

Không Use Case nào trong tài liệu này được kết thúc bằng một thay đổi lifecycle mà người dùng không trực tiếp chọn. Khi một Use Case dẫn tới lifecycle action (UC-PAC-007), action đó chính là Use Case lifecycle tương ứng của Projects.

### UCP-PAC-002 — Failure Is Local

Exception flow của một nguồn chỉ ảnh hưởng phần hoạt động. Mọi Acceptance Criteria liên quan lỗi nguồn phải kiểm chứng rằng phần còn lại của Project vẫn dùng được.

### UCP-PAC-003 — No Data Is Distinguishable

Acceptance Criteria phải phân biệt được "không có dữ liệu" với "không có hoạt động" ở mọi nơi hiển thị hoạt động (RP-PAC-002).

---

# 3. Use Case Summary

```text
UC-PAC-001 — Connect GitHub
UC-PAC-002 — View or Replace GitHub Connection
UC-PAC-003 — Disconnect GitHub

UC-PAC-004 — Link Repository to Project
UC-PAC-005 — Unlink Repository from Project

UC-PAC-006 — View Current Cycle Activity
UC-PAC-007 — Resume from a Paused-but-Active Notice

UC-PAC-008 — View Closed Cycle Activity Snapshot
```

Hành vi hệ thống không có Use Case riêng (`04` §13) được kiểm chứng ở:

| Hành vi                               | Kiểm chứng tại                                         |
| ------------------------------------- | ------------------------------------------------------ |
| Ingest / Keep Fresh (FR-PAC-008, 009) | UC-PAC-004, UC-PAC-006                                 |
| Capture Snapshot (FR-PAC-012)         | §12 — mở rộng postcondition của UC-PRJ-008, UC-PRJ-009 |
| Degrade Gracefully (FR-PAC-014)       | Exception flow của từng Use Case                       |

---

# 4. UC-PAC-001 — Connect GitHub

## Goal

Cho phép Magnum Opus đọc hoạt động GitHub của người dùng, một lần cho mọi Project.

## Primary Actor

User

## Preconditions

- Người dùng đã đăng nhập.
- Người dùng chưa có kết nối GitHub (trường hợp đã có: UC-PAC-002).

## Trigger

Người dùng muốn Project của mình hiển thị hoạt động từ GitHub.

## Input

```text
token → required, fine-grained personal access token chỉ đọc
```

## Main Flow

1. Người dùng mở phần kết nối GitHub trong Cài đặt.
2. Hệ thống giải thích token cần tạo (quyền chỉ đọc, chọn repository, ngày hết hạn) và lưu ý về email commit đã xác minh (`02` §6.6).
3. Người dùng dán token và xác nhận.
4. Hệ thống kiểm tra token với GitHub.
5. Hệ thống ghi nhận tài khoản GitHub và ngày hết hạn của token.
6. Hệ thống lưu token ở dạng mã hóa.
7. Hệ thống hiển thị kết nối thành công: tên tài khoản, ngày hết hạn.

## Exception Flow A — Invalid Token

4a. GitHub từ chối token.
4b. Hệ thống không lưu gì và báo token không hợp lệ.

## Exception Flow B — GitHub Unreachable

4a. Không kiểm tra được token (GitHub lỗi, mạng lỗi).
4b. Hệ thống không lưu gì và báo không kết nối được tới GitHub, mời thử lại.

## Postconditions

```text
Connection exists, status = ACTIVE
Connection.account = tài khoản sở hữu token
Token chỉ tồn tại ở dạng mã hóa
```

## Related Requirements

```text
FR-PAC-001 — Connect GitHub
```

## Related Business Rules

```text
BR-PAC-001, BR-PAC-002, BR-PAC-003, BR-PAC-004
```

## Acceptance Criteria

### AC-PAC-001-01 — Connect With a Valid Token

```gherkin
Given người dùng chưa có kết nối GitHub
When người dùng cung cấp một token hợp lệ
And xác nhận kết nối
Then kết nối được tạo với trạng thái ACTIVE
And người dùng thấy tên tài khoản GitHub của token
And người dùng thấy ngày hết hạn của token khi GitHub cung cấp
```

### AC-PAC-001-02 — Invalid Token Is Rejected

```gherkin
Given người dùng chưa có kết nối GitHub
When người dùng cung cấp một token bị GitHub từ chối
Then không có kết nối nào được tạo
And người dùng được báo token không hợp lệ
```

### AC-PAC-001-03 — Unreachable GitHub Does Not Save

```gherkin
Given GitHub không phản hồi
When người dùng xác nhận kết nối
Then không có kết nối nào được tạo
And người dùng được mời thử lại
```

### AC-PAC-001-04 — Token Is Never Shown Back

```gherkin
Given người dùng đã kết nối GitHub
When người dùng xem bất kỳ màn hình hay phản hồi nào của Magnum Opus
Then token không xuất hiện ở bất kỳ đâu
```

---

# 5. UC-PAC-002 — View or Replace GitHub Connection

## Goal

Cho người dùng biết kết nối GitHub còn dùng được không, và thay token khi cần.

## Primary Actor

User

## Preconditions

Người dùng đã đăng nhập.

## Trigger

Người dùng mở phần kết nối GitHub, hoặc được nhắc token sắp hết hạn / đã hết hạn.

## Main Flow — View

1. Người dùng mở phần kết nối GitHub.
2. Hệ thống hiển thị: tên tài khoản, trạng thái, ngày hết hạn.
3. Nếu token sắp hết hạn, hệ thống nhắc trước.

## Alternative Flow A — Replace With a Token of the Same Account

1. Người dùng dán token mới.
2. Hệ thống kiểm tra token (như UC-PAC-001 bước 4–6).
3. Token mới thay token cũ; kết nối trở lại `ACTIVE`.
4. Các feed của tài khoản này tiếp tục được chép như trước.

## Alternative Flow B — Replace With a Token of a Different Account

1. Người dùng dán token thuộc một tài khoản GitHub khác.
2. Hệ thống cảnh báo: các repository đã gắn bằng tài khoản cũ sẽ ngừng được cập nhật.
3. Người dùng xác nhận.
4. Kết nối mới thay thế kết nối cũ.
5. Các feed của tài khoản cũ chuyển `DISCONNECTED`; sổ và snapshot của chúng giữ nguyên.

## Alternative Flow C — Not Connected

2a. Người dùng chưa kết nối → hệ thống mời kết nối (UC-PAC-001).

## Postconditions

```text
Tối đa một kết nối GitHub cho người dùng
Feed chỉ được chép bằng đúng tài khoản đã tạo ra nó
```

## Related Requirements

```text
FR-PAC-001 — Connect GitHub
FR-PAC-002 — View Connection
```

## Related Business Rules

```text
BR-PAC-002, BR-PAC-003, BR-PAC-004, BR-PAC-008
```

## Acceptance Criteria

### AC-PAC-002-01 — Connection Status Is Visible

```gherkin
Given người dùng đã kết nối GitHub
When người dùng mở phần kết nối GitHub
Then người dùng thấy tên tài khoản, trạng thái và ngày hết hạn
```

### AC-PAC-002-02 — Expiring Token Is Announced Ahead

```gherkin
Given token của người dùng sắp hết hạn
When người dùng mở phần kết nối GitHub
Then người dùng được nhắc thay token trước ngày hết hạn
```

### AC-PAC-002-03 — Expired or Revoked Connection Is Shown as Such

```gherkin
Given token đã quá ngày hết hạn hoặc bị GitHub thu hồi
When người dùng mở phần kết nối GitHub
Then trạng thái kết nối là EXPIRED hoặc REVOKED
And người dùng được mời thay token
```

### AC-PAC-002-04 — Same-Account Replacement Keeps Feeds Working

```gherkin
Given người dùng có kết nối GitHub với tài khoản A
And Project "Magnum Opus" có nguồn là một repository của A
When người dùng thay bằng một token hợp lệ khác của tài khoản A
Then kết nối trở lại ACTIVE
And nguồn của "Magnum Opus" tiếp tục được cập nhật
```

### AC-PAC-002-05 — Different-Account Replacement Disconnects Old Feeds

```gherkin
Given người dùng có kết nối GitHub với tài khoản A
And Project "Magnum Opus" có nguồn là một repository của A
When người dùng thay bằng token của tài khoản B và xác nhận cảnh báo
Then kết nối mới thuộc tài khoản B
And nguồn của "Magnum Opus" có trạng thái DISCONNECTED
And hoạt động đã chép và các snapshot đã có vẫn hiển thị như trước
```

---

# 6. UC-PAC-003 — Disconnect GitHub

## Goal

Cho phép người dùng thu hồi quyền đọc GitHub của Magnum Opus.

## Primary Actor

User

## Preconditions

Người dùng có kết nối GitHub.

## Trigger

Người dùng không muốn Magnum Opus đọc GitHub nữa.

## Main Flow

1. Người dùng chọn ngắt kết nối GitHub.
2. Hệ thống giải thích: hoạt động đã chép và snapshot được giữ lại; nguồn sẽ ngừng được cập nhật.
3. Người dùng xác nhận.
4. Hệ thống xóa thông tin xác thực.
5. Các feed GitHub của người dùng ngừng được chép.

## Postconditions

```text
Không còn thông tin xác thực GitHub
Feed, sổ hoạt động, snapshot giữ nguyên
Project và lifecycle không thay đổi
```

## Related Requirements

```text
FR-PAC-003 — Disconnect GitHub
```

## Related Business Rules

```text
BR-PAC-002, BR-PAC-007
```

## Acceptance Criteria

### AC-PAC-003-01 — Disconnect Removes Credentials

```gherkin
Given người dùng có kết nối GitHub
When người dùng ngắt kết nối và xác nhận
Then Magnum Opus không còn lưu thông tin xác thực GitHub của người dùng
```

### AC-PAC-003-02 — History Survives Disconnect

```gherkin
Given Project "Magnum Opus" có snapshot cho Cycle 1 và hoạt động đã chép cho Cycle 2
When người dùng ngắt kết nối GitHub
Then snapshot của Cycle 1 vẫn hiển thị nguyên vẹn
And hoạt động đã chép của Cycle 2 vẫn hiển thị
And nguồn của Project được báo là không thể cập nhật
```

### AC-PAC-003-03 — Reconnecting the Same Account Resumes

```gherkin
Given người dùng đã ngắt kết nối tài khoản A
When người dùng kết nối lại bằng một token hợp lệ của tài khoản A
Then các nguồn trước đó của tài khoản A tiếp tục được cập nhật
And hoạt động đã chép trước đó không bị chép trùng
```

---

# 7. UC-PAC-004 — Link Repository to Project

## Goal

Cho Project biết hoạt động của repository nào là bằng chứng theo đuổi Project đó.

## Primary Actor

User

## Preconditions

- Người dùng sở hữu Project.
- Người dùng có kết nối GitHub ở trạng thái `ACTIVE`.

## Trigger

Người dùng muốn Project hiển thị hoạt động của một repository.

## Main Flow

1. Người dùng mở phần nguồn hoạt động của Project.
2. Hệ thống hiển thị danh sách repository mà kết nối đọc được, đánh dấu repository đã được Project khác dùng.
3. Người dùng chọn một repository và xác nhận.
4. Hệ thống gắn repository làm nguồn của Project.
5. Nếu Project đang có Cycle mở, hệ thống chép hoạt động của repository từ lúc Cycle mở (hoặc từ phần còn thiếu).
6. Hệ thống hiển thị nguồn mới và hoạt động của Cycle đang mở (nếu có).

## Alternative Flow A — Repository Used by Another Project

2a. Repository đã là nguồn của Project khác.
2b. Hệ thống cảnh báo cùng một hoạt động sẽ xuất hiện ở cả hai Project.
2c. Người dùng vẫn có thể gắn; feed được dùng chung, không chép lại.

## Alternative Flow B — Project Has No Open Cycle

5a. Project đang `NOT_STARTED`, `STOPPED` hoặc `COMPLETED`.
5b. Hệ thống không cần chép bù cho Cycle; hoạt động sau thời điểm gắn được dùng cho D4 (NOT_STARTED) hoặc D3 (đã khép).

## Exception Flow A — Not Connected or Connection Not Active

1a. Người dùng chưa kết nối hoặc kết nối không `ACTIVE`.
1b. Hệ thống mời kết nối hoặc thay token (UC-PAC-001/002); không gắn được nguồn.

## Exception Flow B — Initial Sync Fails

5a. Chép hoạt động thất bại (GitHub lỗi, giới hạn request).
5b. Nguồn vẫn được gắn; hệ thống hiển thị nguồn chưa có dữ liệu cho Cycle hiện tại và sẽ thử lại khi người dùng xem lại.

## Postconditions

```text
Project có nguồn mới
Đúng một feed cho repository + tài khoản
Lifecycle và Cycle của Project không thay đổi
```

## Related Requirements

```text
FR-PAC-004 — List Available Repositories
FR-PAC-005 — Link Repository to Project
FR-PAC-008 — Ingest Activity
```

## Related Business Rules

```text
BR-PAC-005, BR-PAC-006, BR-PAC-009, BR-PAC-015, BR-PAC-016
```

## Acceptance Criteria

### AC-PAC-004-01 — Only Readable Repositories Are Offered

```gherkin
Given người dùng có kết nối GitHub ACTIVE
When người dùng mở phần nguồn hoạt động của Project
Then danh sách chỉ gồm repository mà kết nối đọc được
```

### AC-PAC-004-02 — Linking Mid-Cycle Covers the Whole Cycle

```gherkin
Given Project "Magnum Opus" đang ACTIVE với Cycle mở từ 01/10
And repository có commit của người dùng ngày 02/10 và 05/10
When người dùng gắn repository vào ngày 10/10
Then hoạt động của Cycle bao gồm các ngày 02/10 và 05/10
```

### AC-PAC-004-03 — Shared Repository Is Not Duplicated

```gherkin
Given repository R đã là nguồn của Project A
When người dùng gắn R làm nguồn của Project B
Then người dùng được cảnh báo R đang được Project A dùng
And mỗi hoạt động của R chỉ được lưu một lần
And cả Project A và Project B đều hiển thị hoạt động của R theo Cycle của riêng mình
```

### AC-PAC-004-04 — Linking Never Changes Lifecycle

```gherkin
Given Project ở bất kỳ lifecycle state nào
When người dùng gắn một repository
Then lifecycle state, Cycle và lịch sử chuyển trạng thái của Project không thay đổi
```

### AC-PAC-004-05 — Linking Without an Active Connection Is Not Possible

```gherkin
Given người dùng không có kết nối GitHub ACTIVE
When người dùng muốn gắn repository
Then không có nguồn nào được gắn
And người dùng được mời kết nối hoặc thay token
```

### AC-PAC-004-06 — Failed Initial Sync Keeps the Link

```gherkin
Given GitHub đang lỗi
When người dùng gắn repository vào Project đang có Cycle mở
Then nguồn vẫn được gắn
And phần hoạt động cho biết nguồn chưa có dữ liệu
And phần hoạt động không hiển thị "không có hoạt động" cho Cycle
```

---

# 8. UC-PAC-005 — Unlink Repository from Project

## Goal

Cho phép người dùng thôi coi một repository là bằng chứng của Project.

## Primary Actor

User

## Preconditions

Project có ít nhất một nguồn.

## Trigger

Người dùng gắn nhầm, hoặc repository không còn liên quan tới Project.

## Main Flow

1. Người dùng chọn gỡ một nguồn của Project.
2. Hệ thống giải thích: hoạt động của nguồn sẽ không còn tính cho Cycle đang mở; snapshot đã chụp giữ nguyên.
3. Người dùng xác nhận.
4. Hệ thống xóa mối nối giữa Project và feed.
5. Hệ thống hiển thị lại hoạt động của Cycle đang mở mà không có nguồn đó.

## Alternative Flow — Last Source Removed

5a. Project không còn nguồn nào.
5b. Phần hoạt động không còn hiển thị (BR-PAC-034). Snapshot của Cycle đã khép vẫn hiển thị trong lịch sử.

## Postconditions

```text
Project không còn mối nối tới feed
Feed và sổ hoạt động còn nguyên
Snapshot đã chụp không đổi
```

## Related Requirements

```text
FR-PAC-006 — Unlink Repository
```

## Related Business Rules

```text
BR-PAC-007, BR-PAC-031, BR-PAC-034
```

## Acceptance Criteria

### AC-PAC-005-01 — Unlinked Source Leaves Current Activity

```gherkin
Given Project có nguồn R1 và R2 trong Cycle đang mở
When người dùng gỡ R2
Then hoạt động của Cycle đang mở chỉ còn tính từ R1
```

### AC-PAC-005-02 — Snapshots Do Not Change

```gherkin
Given Cycle 1 đã khép với snapshot gồm nguồn R2
When người dùng gỡ R2 khỏi Project
Then snapshot của Cycle 1 vẫn hiển thị đúng như lúc chụp, kể cả tên R2
```

### AC-PAC-005-03 — Relinking Reuses the Ledger

```gherkin
Given người dùng đã gỡ R2 khỏi Project
When người dùng gắn lại R2
Then hoạt động của R2 xuất hiện lại cho Cycle đang mở
And không có hoạt động nào bị đếm hai lần
```

### AC-PAC-005-04 — Last Source Removes the Activity Section

```gherkin
Given Project chỉ có một nguồn
When người dùng gỡ nguồn đó
Then trang Project không còn phần hoạt động hay khung trống nào
```

---

# 9. UC-PAC-006 — View Current Cycle Activity

## Goal

Cho người dùng thấy bằng chứng theo đuổi của Cycle đang mở, cạnh lời tuyên bố của Cycle đó, và các chỗ lệch nếu có.

## Primary Actor

User

## Preconditions

- Người dùng sở hữu Project.
- Project có ít nhất một nguồn.

## Trigger

Người dùng mở trang Project.

## Main Flow

1. Người dùng mở trang Project.
2. Hệ thống hiển thị lời tuyên bố của Project như hiện tại (trạng thái, outcome, ngày dự kiến).
3. Với mỗi nguồn mà lần chép gần nhất đã cách hơn 10 phút, hệ thống chép hoạt động mới.
4. Hệ thống gắn hoạt động vào Cycle đang mở theo lời tuyên bố tại từng thời điểm.
5. Hệ thống hiển thị, **sau** lời tuyên bố:
   - số ngày hoạt động (trong đó lúc tạm dừng), commit, PR mở, PR merge;
   - hoạt động gần nhất;
   - dải ngày từ lúc Cycle mở tới hôm nay, theo múi giờ tài khoản.
6. Hệ thống hiển thị chỗ lệch hiện tại (D1, D2) nếu có.

## Alternative Flow A — Project Has No Open Cycle

4a. Project `NOT_STARTED`, `STOPPED` hoặc `COMPLETED`.
4b. Không có Cycle Activity. Hệ thống chỉ hiển thị dòng thông tin D4 (NOT_STARTED) hoặc D3 (đã khép) nếu có.

## Alternative Flow B — No Source

Precondition không thỏa → trang Project không có phần hoạt động (BR-PAC-034).

## Exception Flow A — A Source Cannot Be Synced

3a. Một nguồn lỗi (token hết hạn, mất quyền, GitHub lỗi, giới hạn request).
3b. Hệ thống dùng hoạt động đã chép của nguồn đó, báo lỗi gắn với nguồn kèm cách khắc phục.
3c. Các nguồn khác được chép bình thường.
3d. D1 không được đánh giá khi có nguồn lỗi.

## Exception Flow B — Part of the Cycle Has No Data

5a. Một khoảng của Cycle chưa được nguồn nào chép đầy đủ.
5b. Những ngày đó được hiển thị là không có dữ liệu, không phải không hoạt động.

## Postconditions

```text
Sổ hoạt động có thể nhận thêm event mới
Lifecycle, Cycle, outcome, ngày dự kiến không thay đổi
```

## Related Requirements

```text
FR-PAC-007, FR-PAC-008, FR-PAC-009, FR-PAC-010, FR-PAC-011, FR-PAC-014
```

## Related Business Rules

```text
BR-PAC-010 → BR-PAC-027, BR-PAC-034 → BR-PAC-036
```

## Acceptance Criteria

### AC-PAC-006-01 — Activity Follows the Declaration

```gherkin
Given Project "Magnum Opus" đang ACTIVE với outcome và ngày dự kiến
And Project có nguồn có hoạt động
When người dùng mở trang Project
Then outcome và ngày dự kiến được hiển thị trước
And phần hoạt động được hiển thị sau
```

### AC-PAC-006-02 — Only the User's Own Work Counts

```gherkin
Given trong Cycle đang mở, repository có
  | loại                                   | số lượng |
  | commit của người dùng                  | 3        |
  | commit của Dependabot                  | 1        |
  | merge commit                           | 1        |
  | commit của người khác                  | 2        |
When người dùng xem hoạt động của Cycle
Then số commit là 3
```

### AC-PAC-006-03 — Commit Counts on the Day It Was Written

```gherkin
Given người dùng viết một commit ngày 05/10 theo múi giờ tài khoản
And commit đó được rebase ngày 08/10 và merge ngày 12/10
When người dùng xem hoạt động của Cycle
Then commit được tính cho ngày 05/10
And commit chỉ được đếm một lần
```

### AC-PAC-006-04 — Unmerged Branch Work Is Visible

```gherkin
Given người dùng có commit trên một nhánh chưa merge trong Cycle đang mở
When người dùng xem hoạt động của Cycle
Then commit đó được tính
```

### AC-PAC-006-05 — Days Follow the Account Time Zone

```gherkin
Given múi giờ tài khoản là Asia/Ho_Chi_Minh
And người dùng commit lúc 01:30 sáng 12/10 giờ Việt Nam (18:30 UTC ngày 11/10)
When người dùng xem dải ngày
Then hoạt động thuộc ngày 12/10
```

### AC-PAC-006-06 — Paused Work Belongs to the Cycle and Is Marked

```gherkin
Given Cycle đang mở có hoạt động ngày 08/10 trong lúc Project PAUSED
When người dùng xem hoạt động của Cycle
Then ngày 08/10 được tính vào số ngày hoạt động
And được tính vào số ngày hoạt động lúc tạm dừng
And được phân biệt trên dải ngày
```

### AC-PAC-006-07 — Pull Request Events Are Counted Separately

```gherkin
Given trong Cycle đang mở, người dùng mở 2 PR và 1 trong số đó được merge
When người dùng xem hoạt động của Cycle
Then PR mở là 2
And PR merge là 1
```

### AC-PAC-006-08 — D1 Appears After Seven Silent Days

```gherkin
Given Project ACTIVE
And mốc tham chiếu là 7 ngày trước
And không có hoạt động nào từ mốc tham chiếu
When người dùng mở trang Project
Then người dùng thấy dòng thông tin "Đã 7 ngày chưa có hoạt động."
And dòng này không có nút hành động
```

### AC-PAC-006-09 — D1 Does Not Fire Right After Resume

```gherkin
Given hoạt động gần nhất là 10 ngày trước
And người dùng vừa Resume hôm nay
When người dùng mở trang Project
Then không có dòng D1
```

### AC-PAC-006-10 — D1 Is Not Shown When a Source Fails

```gherkin
Given Project ACTIVE không có hoạt động 7 ngày theo sổ hiện có
And một nguồn của Project đang lỗi
When người dùng mở trang Project
Then không có dòng D1
And lỗi của nguồn được hiển thị
```

### AC-PAC-006-11 — D2 Needs Two Distinct Days

```gherkin
Given Project PAUSED
And trong lần tạm dừng hiện tại có 5 commit, tất cả cùng một ngày
When người dùng mở trang Project
Then không có lời nhắc D2
```

```gherkin
Given Project PAUSED
And trong lần tạm dừng hiện tại có hoạt động ở 2 ngày khác nhau
When người dùng mở trang Project
Then người dùng thấy lời nhắc D2 kèm hành động Tiếp tục
```

### AC-PAC-006-12 — D3 and D4 Are Informational

```gherkin
Given Project COMPLETED và có 4 commit sau khi Cycle cuối khép, gần nhất ngày 14/10
When người dùng mở trang Project
Then người dùng thấy "4 commit kể từ khi hoàn thành (gần nhất 14/10)."
And dòng này không có nút hành động
```

```gherkin
Given Project NOT_STARTED
And nguồn được gắn ngày 28/09
And có commit ngày 29/09
When người dùng mở trang Project
Then người dùng thấy dòng thông tin D4
```

```gherkin
Given Project NOT_STARTED
And repository chỉ có commit trước ngày nguồn được gắn
When người dùng mở trang Project
Then không có dòng D4
```

### AC-PAC-006-13 — Viewing Never Changes Lifecycle

```gherkin
Given Project ở bất kỳ trạng thái nào với bất kỳ chỗ lệch nào
When người dùng mở trang Project
Then lifecycle state và lịch sử chuyển trạng thái không thay đổi
```

### AC-PAC-006-14 — A Failing Source Is Isolated

```gherkin
Given Project có nguồn R1 hoạt động bình thường và nguồn R2 có token hết hạn
When người dùng mở trang Project
Then trang Project tải đầy đủ
And hoạt động của R1 được cập nhật
And R2 được báo lỗi kèm cách khắc phục
And mọi lifecycle action của Project vẫn dùng được
```

### AC-PAC-006-15 — Missing Data Is Not Shown as Idle

```gherkin
Given một khoảng của Cycle chưa được nguồn nào chép đầy đủ
When người dùng xem dải ngày
Then các ngày trong khoảng đó được hiển thị là không có dữ liệu
And không được hiển thị như ngày không hoạt động
```

### AC-PAC-006-16 — Fresh Enough Without Re-fetching Every Time

```gherkin
Given lần chép gần nhất của nguồn cách đây 3 phút
When người dùng mở lại trang Project
Then hoạt động được hiển thị từ sổ hiện có mà không chép lại
```

---

# 10. UC-PAC-007 — Resume from a Paused-but-Active Notice

## Goal

Cho người dùng sửa lời tuyên bố "tạm dừng" khi họ thực ra đã quay lại làm, bằng một thao tác.

## Primary Actor

User

## Preconditions

- Project `PAUSED`.
- Lời nhắc D2 đang hiển thị.

## Trigger

Người dùng thấy lời nhắc D2 và nhận ra mình đã quay lại làm.

## Main Flow

1. Người dùng chọn Tiếp tục trên lời nhắc D2.
2. Hệ thống thực hiện **UC-PRJ-007 — Resume Project** với revision hiện tại của Project.
3. Project trở về `ACTIVE`, trong cùng Cycle.
4. Lời nhắc D2 biến mất.

## Alternative Flow — User Chooses Not to Resume

1a. Người dùng không làm gì. Project giữ `PAUSED`; D2 vẫn hiển thị cho tới khi lần tạm dừng kết thúc.

## Exception Flow — Project Changed Elsewhere

2a. Revision đã đổi (Project được thay đổi ở phiên khác).
2b. Hệ thống từ chối như UC-PRJ-007 và mời tải bản mới nhất.

## Postconditions

Như UC-PRJ-007:

```text
Project.state = ACTIVE
Cùng Cycle, không tạo Cycle mới
Lịch sử chuyển trạng thái có thêm Resume do người dùng thực hiện
```

## Related Requirements

```text
FR-PAC-011 — Show Divergence
FR-PRJ-007 — Resume Project
```

## Related Business Rules

```text
BR-PAC-023, BR-PAC-026, BR-PAC-027
BR-PRJ-005, BR-PRJ-013
```

## Acceptance Criteria

### AC-PAC-007-01 — Resume From the Notice

```gherkin
Given Project PAUSED và lời nhắc D2 đang hiển thị
When người dùng chọn Tiếp tục trên lời nhắc
Then Project trở về ACTIVE trong cùng Cycle
And lời nhắc D2 không còn hiển thị
```

### AC-PAC-007-02 — The Notice Never Resumes by Itself

```gherkin
Given Project PAUSED và có hoạt động ở nhiều ngày sau khi tạm dừng
When người dùng không chọn Tiếp tục
Then Project vẫn PAUSED
And không có transition nào được ghi
```

### AC-PAC-007-03 — Stale Revision Is Rejected

```gherkin
Given Project đã được thay đổi ở một phiên khác
When người dùng chọn Tiếp tục trên lời nhắc D2 ở phiên cũ
Then Project không thay đổi bởi yêu cầu này
And người dùng được mời tải bản mới nhất
```

---

# 11. UC-PAC-008 — View Closed Cycle Activity Snapshot

## Goal

Cho người dùng thấy, khi nhìn lại một Cycle đã khép, bằng chứng theo đuổi đúng như lúc Cycle khép.

## Primary Actor

User

## Preconditions

Project có ít nhất một Cycle đã khép.

## Trigger

Người dùng xem lịch sử các Cycle đã đóng (UC-PRJ-014).

## Main Flow

1. Người dùng xem lịch sử Cycle đã đóng.
2. Với mỗi Cycle có snapshot, hệ thống hiển thị **sau** outcome và ghi chú khép lại:
   - các metric và dải ngày đã chụp;
   - tên các nguồn tại thời điểm chụp;
   - dữ liệu đầy đủ tới thời điểm nào.

## Alternative Flow — Cycle Without Snapshot

2a. Cycle khép khi Project không có nguồn, hoặc khép trước khi có nguồn.
2b. Cycle hiển thị như hiện tại, không có phần hoạt động và không có khung trống.

## Postconditions

Không thay đổi gì.

## Related Requirements

```text
FR-PAC-013 — View Snapshot of Closed Cycle
FR-PRJ-017 — View Closed Cycle History
```

## Related Business Rules

```text
BR-PAC-029, BR-PAC-031, BR-PAC-032, BR-PAC-033, BR-PAC-035
```

## Acceptance Criteria

### AC-PAC-008-01 — Snapshot Shows What Was True at Close

```gherkin
Given Cycle 1 khép ngày 12/10 với snapshot "8 ngày hoạt động, 23 commit"
And sau đó repository nhận thêm commit có author date trong Cycle 1
When người dùng xem Cycle 1 trong lịch sử
Then người dùng vẫn thấy "8 ngày hoạt động, 23 commit"
```

### AC-PAC-008-02 — Snapshot Survives Source Changes

```gherkin
Given Cycle 1 có snapshot với nguồn "trhgatu/magnum-opus"
When repository được đổi tên, bị gỡ khỏi Project hoặc kết nối GitHub bị ngắt
Then snapshot của Cycle 1 vẫn hiển thị với tên "trhgatu/magnum-opus"
And các metric không thay đổi
```

### AC-PAC-008-03 — Snapshot Keeps Its Time Zone

```gherkin
Given Cycle 1 được chụp với múi giờ Asia/Ho_Chi_Minh
When người dùng đổi múi giờ tài khoản
Then dải ngày của snapshot Cycle 1 không thay đổi
```

### AC-PAC-008-04 — No Snapshot, No Frame

```gherkin
Given Cycle 1 khép khi Project chưa có nguồn nào
When người dùng xem Cycle 1 trong lịch sử
Then Cycle 1 không có phần hoạt động
And không có khung trống hay "0 hoạt động"
```

### AC-PAC-008-05 — Incomplete Data Is Disclosed

```gherkin
Given lần chép cuối khi khép Cycle 1 thất bại
And sổ chỉ đầy đủ tới 14:30 ngày khép
When người dùng xem Cycle 1 trong lịch sử
Then người dùng thấy dữ liệu đầy đủ tới 14:30 ngày khép
```

---

# 12. Snapshot Capture — Extension of UC-PRJ-008 and UC-PRJ-009

Capture Activity Snapshot (FR-PAC-012) không có Use Case riêng. Nó mở rộng **postcondition** của UC-PRJ-008 (Stop) và UC-PRJ-009 (Complete):

```text
Khi Stop/Complete khép một Cycle và Project có nguồn tại thời điểm khép:
  → Cycle đó có đúng một Activity Snapshot
```

## Acceptance Criteria

### AC-PAC-SNAP-01 — Completing a Cycle With Sources Creates a Snapshot

```gherkin
Given Project ACTIVE với nguồn có hoạt động trong Cycle 1
When người dùng Complete Project
Then Cycle 1 có một snapshot
And snapshot gồm các metric, dải ngày, nguồn, múi giờ và mức đầy đủ của dữ liệu
```

### AC-PAC-SNAP-02 — Stopping From PAUSED Also Snapshots

```gherkin
Given Project PAUSED với nguồn
When người dùng Stop Project
Then Cycle vừa khép có một snapshot
```

### AC-PAC-SNAP-03 — Stop Before Start Creates No Snapshot

```gherkin
Given Project NOT_STARTED với nguồn
When người dùng Stop Project
Then không có snapshot nào được tạo
```

### AC-PAC-SNAP-04 — No Source, No Snapshot

```gherkin
Given Project ACTIVE không có nguồn nào
When người dùng Complete Project
Then không có snapshot nào được tạo
```

### AC-PAC-SNAP-05 — Closing Is Not Delayed by GitHub

```gherkin
Given GitHub đang lỗi hoặc chậm
When người dùng Complete Project
Then Project chuyển sang COMPLETED ngay như hiện tại
And snapshot vẫn được tạo từ hoạt động đã chép
And snapshot cho biết dữ liệu đầy đủ tới thời điểm nào
```

### AC-PAC-SNAP-06 — Snapshot Is Created Once

```gherkin
Given Cycle 1 đã có snapshot
When yêu cầu chụp snapshot cho Cycle 1 được xử lý thêm một lần
Then snapshot của Cycle 1 không thay đổi
And không có lỗi nào được hiển thị cho người dùng
```

### AC-PAC-SNAP-07 — Sources Linked After Close Are Not Included

```gherkin
Given Cycle 1 khép lúc 17:00
When người dùng gắn thêm nguồn R2 lúc 18:00
Then snapshot của Cycle 1 không bao gồm R2
```

### AC-PAC-SNAP-08 — Boundary Event Belongs to What Follows

```gherkin
Given người dùng Complete Project lúc 17:00:00
And có một commit với author date đúng 17:00:00
Then commit đó không được tính vào snapshot của Cycle vừa khép
And commit đó được tính là hoạt động sau khi hoàn thành (D3)
```

---

# 13. Cross-Use-Case Invariants

| ID        | Invariant                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------ |
| INV-PAC-1 | Không Use Case nào thay đổi lifecycle trừ khi người dùng trực tiếp chọn một lifecycle action.          |
| INV-PAC-2 | Mỗi hoạt động được đếm đúng một lần trong sổ, bất kể chép bao nhiêu lần hay gắn vào bao nhiêu Project. |
| INV-PAC-3 | Snapshot đã tạo không bao giờ thay đổi.                                                                |
| INV-PAC-4 | Thông tin xác thực không bao giờ được hiển thị hay trả về.                                             |
| INV-PAC-5 | Lỗi của nguồn không làm trang Project hay lifecycle action ngừng hoạt động.                            |
| INV-PAC-6 | "Không có dữ liệu" không bao giờ được hiển thị như "không hoạt động".                                  |
| INV-PAC-7 | Project không có nguồn không hiển thị bất kỳ phần hoạt động nào.                                       |

---

# 14. Use Case Traceability

| Use Case   | Functional Requirements             | User Needs           |
| ---------- | ----------------------------------- | -------------------- |
| UC-PAC-001 | FR-PAC-001                          | UN-PAC-005           |
| UC-PAC-002 | FR-PAC-001, 002                     | UN-PAC-005           |
| UC-PAC-003 | FR-PAC-003                          | UN-PAC-004           |
| UC-PAC-004 | FR-PAC-004, 005, 008                | UN-PAC-001, 005      |
| UC-PAC-005 | FR-PAC-006                          | UN-PAC-004           |
| UC-PAC-006 | FR-PAC-007, 008, 009, 010, 011, 014 | UN-PAC-001, 003, 004 |
| UC-PAC-007 | FR-PAC-011, FR-PRJ-007              | UN-PAC-003, 004      |
| UC-PAC-008 | FR-PAC-013, FR-PRJ-017              | UN-PAC-002           |
| §12        | FR-PAC-012                          | UN-PAC-002           |

Mọi FR-PAC-001 → 014 đều được ít nhất một Use Case hoặc §12 bao phủ.

---

# 15. Next Step

Các câu hỏi kỹ thuật TQ-PAC-01 → 05 đã được kiểm chứng bằng GitHub API thật (`03` §10); thiết kế không phải đổi, adapter GitHub dùng GraphQL làm đường chính. TQ-PAC-03 (ngày hết hạn của fine-grained token) còn phải kiểm chứng khi implement.

Tiếp theo:

```text
06 — Product Specification   (màn hình, câu chữ, trạng thái hiển thị)
07 — API Contract            (endpoint, request/response, mã lỗi)
```
