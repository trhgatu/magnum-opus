# Crucible — Project Activity Evidence — Functional Requirements & Business Rules

> **Status:** Analysis / Candidate Baseline
>
> **Domain:** Crucible / Projects / Activity Evidence
>
> **Purpose:** Chuyển problem, needs, decisions (`01`), hành vi (`02`) và kiến trúc (`03`) của Phase 1 (GitHub) thành các Functional Requirement và Business Rule có thể được tiếp tục specification, implementation và verification.

---

## 1. Related Documentation

| File                                                      | Cung cấp cho tài liệu này                                                  |
| --------------------------------------------------------- | -------------------------------------------------------------------------- |
| `01-ba-overview.md`                                       | User Needs (UN-PAC), Scope, Out of Scope, Decisions (DEC-PAC), Assumptions |
| `02-evidence-behavior-analysis.md`                        | Activity Event, Attribution, Divergence, Snapshot, Edge Cases              |
| `03-integration-architecture.md`                          | Ràng buộc kiến trúc: sổ hoạt động, feed, đồng bộ, event, DB                |
| `../project/03-functional-requirements-business-rules.md` | Lifecycle và Project Cycle được dùng nguyên (FR-PRJ, BR-PRJ)               |

```text
User Need (UN-PAC)
    +
Phase 1 Scope + Decisions (DEC-PAC)
    +
Behavior Analysis (02)
    ↓
Functional Requirement (FR-PAC)
    ↓
Business Rule (BR-PAC)
    ↓
Use Case (05)
    ↓
Acceptance Criteria (05)
```

Tài liệu này áp dụng cho **Phase 1 (GitHub)**. WakaTime, nguồn nội bộ và Reflection link (`01` §9 Phase 2) không có requirement ở đây.

---

## 2. Requirement Principles

Các nguyên tắc RP-PRJ-001 → RP-PRJ-004 của Projects (traceable, FR mô tả capability, BR ràng buộc behavior, độc lập công nghệ) áp dụng nguyên vẹn. Thêm:

### RP-PAC-001 — Evidence Never Changes Declaration

Không requirement nào trong tài liệu này được phép tạo, sửa hay xóa lifecycle state, transition, Cycle, outcome, target end date hay closing note của Project. Mọi tương tác với lifecycle đi qua đúng các FR-PRJ hiện có.

### RP-PAC-002 — Missing Evidence Is Not Absence of Activity

Requirement phải phân biệt "không có dữ liệu" (chưa kết nối, nguồn lỗi, ngoài phạm vi đã chép) với "có dữ liệu và không có hoạt động". Hai trường hợp không bao giờ được trình bày giống nhau.

### RP-PAC-003 — Requirements Do Not Name the Provider Model

Requirement nói về Activity Event, Feed, Cycle và ngày. Chi tiết của GitHub (branch, SHA, API) chỉ xuất hiện khi chúng định nghĩa **nguồn dữ liệu** của một event (BR-PAC-010 → 013), không định nghĩa behavior của Magnum Opus.

---

## 3. Requirement Scope

```text
Connection
    ├── Connect GitHub
    ├── View Connection
    └── Disconnect GitHub
        │
        ▼
Project Sources
    ├── List Available Repositories
    ├── Link Repository to Project
    ├── Unlink Repository
    └── View Sources and Their Status
        │
        ▼
Activity Ledger                      (hệ thống)
    ├── Ingest Activity
    └── Keep Activity Fresh
        │
        ▼
Cycle Evidence
    ├── View Current Cycle Activity
    ├── Show Divergence
    ├── Capture Activity Snapshot     (hệ thống)
    └── View Snapshot of Closed Cycle
        │
        ▼
Resilience
    └── Degrade Gracefully on Source Failure
```

---

# 4. Connection Requirements

## FR-PAC-001 — Connect GitHub

Hệ thống phải cho phép người dùng kết nối tài khoản GitHub của mình bằng một token chỉ đọc.

Khi kết nối, hệ thống:

- kiểm tra token với GitHub trước khi lưu;
- ghi nhận tài khoản GitHub mà token thuộc về và ngày hết hạn của token (nếu GitHub cung cấp);
- lưu token ở dạng mã hóa.

Nếu người dùng đã có kết nối GitHub, việc kết nối lại **thay thế** kết nối hiện có (BR-PAC-003).

### Traceability

```text
UN-PAC-005 — No Extra Logging
Phase 1 Scope — Kết nối GitHub ở cấp tài khoản
DEC-PAC-009
```

---

## FR-PAC-002 — View Connection

Hệ thống phải cho phép người dùng xem trạng thái kết nối GitHub của mình:

- đã kết nối hay chưa;
- tên tài khoản GitHub;
- trạng thái (`ACTIVE` | `EXPIRED` | `REVOKED`);
- ngày hết hạn của token, kèm nhắc trước khi token sắp hết hạn.

Thông tin xác thực không bao giờ được hiển thị hay trả về (BR-PAC-002).

### Traceability

```text
UN-PAC-005 — No Extra Logging
Phase 1 Scope — Xử lý mềm khi token hết hạn
```

---

## FR-PAC-003 — Disconnect GitHub

Hệ thống phải cho phép người dùng ngắt kết nối GitHub.

Ngắt kết nối:

- xóa thông tin xác thực đã lưu;
- không xóa feed, sổ hoạt động hay snapshot (BR-PAC-007);
- làm các feed GitHub không thể được chép thêm cho tới khi kết nối lại cùng tài khoản.

### Traceability

```text
UN-PAC-004 — Stay in Control
Privacy and Minimal Data (01 §6)
```

---

# 5. Project Source Requirements

## FR-PAC-004 — List Available Repositories

Hệ thống phải cho phép người dùng xem danh sách repository mà kết nối GitHub hiện tại có quyền đọc, để chọn nguồn cho Project.

Danh sách cho biết repository nào đã được Project khác dùng làm nguồn.

### Traceability

```text
Phase 1 Scope — Gắn repository làm nguồn
```

---

## FR-PAC-005 — Link Repository to Project

Hệ thống phải cho phép người dùng gắn một repository làm nguồn hoạt động cho một Project của mình.

- Một Project có thể có nhiều nguồn.
- Một repository có thể là nguồn của nhiều Project (BR-PAC-006); khi đó hệ thống cảnh báo nhưng không chặn.
- Gắn nguồn được phép ở mọi lifecycle state.
- Sau khi gắn, hoạt động của repository được chép về đủ để tính Cycle đang mở (nếu có) — kể cả phần trước thời điểm gắn (BR-PAC-016).

### Traceability

```text
UN-PAC-001 — See Evidence of Pursuit
UN-PAC-005 — No Extra Logging
DEC-PAC-003, DEC-PAC-011
02 §6.11
```

---

## FR-PAC-006 — Unlink Repository

Hệ thống phải cho phép người dùng gỡ một repository khỏi nguồn của Project.

Gỡ nguồn:

- chỉ xóa mối nối giữa Project và feed;
- không xóa feed hay sổ hoạt động (BR-PAC-007);
- làm hoạt động của nguồn đó biến mất khỏi Cycle Activity đang tính;
- không thay đổi snapshot đã chụp (BR-PAC-031).

### Traceability

```text
UN-PAC-004 — Stay in Control
DEC-PAC-011
02 §6.11
```

---

## FR-PAC-007 — View Sources and Their Status

Hệ thống phải cho phép người dùng xem các nguồn của Project, với mỗi nguồn:

- tên hiển thị;
- trạng thái (`ACTIVE` | `ERROR` | `DISCONNECTED`);
- lần chép gần nhất;
- lý do lỗi và cách khắc phục khi nguồn không ở trạng thái `ACTIVE`.

### Traceability

```text
Phase 1 Scope — Xử lý mềm khi nguồn lỗi
FR-PAC-014
```

---

# 6. Activity Ledger Requirements

## FR-PAC-008 — Ingest Activity

Hệ thống phải chép hoạt động của mỗi feed từ GitHub vào sổ hoạt động của Magnum Opus.

Mỗi hoạt động được ghi thành một Activity Event tối thiểu: loại, thời điểm, số lượng, khóa chống trùng (BR-PAC-013, BR-PAC-014). Attribution, Divergence và Snapshot chỉ đọc sổ này (DEC-PAC-008).

### Traceability

```text
UN-PAC-005 — No Extra Logging
DEC-PAC-008, DEC-PAC-010, DEC-PAC-012
02 §2
```

---

## FR-PAC-009 — Keep Activity Fresh

Hệ thống phải giữ sổ hoạt động đủ mới cho nhu cầu nhìn lại mà không cần worker hay đồng bộ thời gian thực, bằng cách chép lại feed tại các thời điểm của BR-PAC-016.

### Traceability

```text
ASM-PAC-006
03 §5.1
```

---

# 7. Cycle Evidence Requirements

## FR-PAC-010 — View Current Cycle Activity

Với Project có ít nhất một nguồn và đang có Cycle mở, hệ thống phải hiển thị Cycle Activity của Cycle đó:

- số ngày hoạt động, trong đó số ngày hoạt động lúc tạm dừng;
- số commit, PR mở, PR merge;
- thời điểm hoạt động gần nhất;
- dải ngày từ lúc Cycle mở tới hôm nay, phân biệt trạng thái từng ngày (BR-PAC-020);
- các khoảng không có dữ liệu (BR-PAC-015), phân biệt với ngày không hoạt động.

Cycle Activity được đặt **sau** lời tuyên bố của Cycle (outcome, ngày dự kiến) (BR-PAC-035).

### Traceability

```text
UN-PAC-001 — See Evidence of Pursuit
DO-PAC-001 — Evidence Beside Declaration
02 §3
```

---

## FR-PAC-011 — Show Divergence

Hệ thống phải chỉ ra chỗ lệch giữa lời tuyên bố hiện tại của Project và hoạt động, theo bốn trường hợp D1–D4 (BR-PAC-022 → 025).

- D2 (tạm dừng nhưng vẫn có hoạt động) được hiển thị như một lời nhắc kèm hành động Resume.
- D1, D3, D4 được hiển thị như dòng thông tin, không kèm hành động.

Divergence không bao giờ thay đổi lifecycle (BR-PAC-026).

### Traceability

```text
UN-PAC-003 — Notice Divergence
UN-PAC-004 — Stay in Control of State
DO-PAC-003 — Visible Divergence
DEC-PAC-005
02 §4
```

---

## FR-PAC-012 — Capture Activity Snapshot

Khi một Cycle thực sự khép lại, hệ thống phải chụp Cycle Activity của Cycle đó thành một Activity Snapshot bất biến, theo BR-PAC-028 → 033.

Việc chụp không làm chậm hay chặn hành động Stop/Complete của người dùng.

### Traceability

```text
UN-PAC-002 — Preserve Evidence with History
DO-PAC-002 — Frozen Cycle Evidence
DEC-PAC-006, DEC-PAC-014
02 §5
```

---

## FR-PAC-013 — View Snapshot of Closed Cycle

Hệ thống phải hiển thị Activity Snapshot cùng với thông tin của Cycle đã đóng trong lịch sử các Cycle đã đóng (mở rộng FR-PRJ-017):

- các metric và dải ngày đã chụp;
- các nguồn đã dùng, theo tên tại thời điểm chụp;
- dữ liệu đầy đủ tới thời điểm nào.

Cycle đã đóng không có snapshot không hiển thị phần hoạt động.

### Traceability

```text
UN-PAC-002 — Preserve Evidence with History
FR-PRJ-017 — View Closed Cycle History
02 §5.2
```

---

# 8. Resilience Requirements

## FR-PAC-014 — Degrade Gracefully on Source Failure

Khi một nguồn hoặc kết nối không dùng được (token hết hạn, bị thu hồi, mất quyền, repository bị xóa, GitHub lỗi hoặc giới hạn request), hệ thống phải:

- tiếp tục cho phép mọi chức năng Project khác hoạt động bình thường;
- tiếp tục dùng sổ hoạt động đã có;
- chỉ báo lỗi ở phần hoạt động, kèm lý do và cách khắc phục;
- không để lỗi của một nguồn ảnh hưởng tới nguồn khác.

### Traceability

```text
Project Independence (01 §6)
Analysis Principle 5
02 §6.8, 03 §5.5
```

---

# 9. Business Rules

## 9.1. Connection

### BR-PAC-001 — Read-Only Access

Kết nối chỉ được dùng để đọc. Magnum Opus không ghi, sửa hay xóa bất cứ thứ gì trên GitHub.

### BR-PAC-002 — Credential Confidentiality

- Thông tin xác thực được mã hóa khi lưu bằng khóa riêng của capability này.
- Thông tin xác thực không bao giờ được trả về client, ghi log hay xuất hiện trong thông báo lỗi.

### BR-PAC-003 — One Account per Provider

Phase 1: mỗi người dùng có tối đa một kết nối GitHub. Kết nối một tài khoản GitHub khác thay thế kết nối hiện có.

### BR-PAC-004 — Credential Verification and Status

- Token chỉ được lưu sau khi GitHub xác nhận hợp lệ.
- Kết nối chuyển `EXPIRED` khi quá ngày hết hạn, `REVOKED` khi GitHub từ chối token.
- Kết nối không ở trạng thái `ACTIVE` không được dùng để chép.

## 9.2. Feeds and Sources

### BR-PAC-005 — Accessible Repository Only

Chỉ repository mà kết nối hiện tại đọc được mới có thể được gắn làm nguồn.

### BR-PAC-006 — One Feed per Resource and Account

Mỗi repository của mỗi tài khoản GitHub có đúng một feed, dùng chung cho mọi Project gắn với nó. Repository được nhận diện bằng định danh ổn định, không bằng tên.

### BR-PAC-007 — Ledger Survives Unlinking and Disconnecting

Gỡ nguồn, ngắt kết nối hay xóa Project không xóa feed và sổ hoạt động. Feed không thể bị xóa khi vẫn còn Project dùng nó.

### BR-PAC-008 — Feed Is Bound to Its Account

Feed chỉ được chép bằng đúng tài khoản GitHub đã tạo ra nó. Nếu kết nối hiện tại thuộc một tài khoản khác, feed chuyển `DISCONNECTED`. Gắn lại repository dưới tài khoản mới tạo feed mới.

### BR-PAC-009 — Source Ownership

Người dùng chỉ có thể gắn, gỡ và xem nguồn của Project thuộc về chính mình, và chỉ với feed thuộc về chính mình.

## 9.3. Activity Events

### BR-PAC-010 — Only the User's Own Work Counts

| Event             | Được tính khi                                         |
| ----------------- | ----------------------------------------------------- |
| `COMMIT_AUTHORED` | Tác giả commit là tài khoản GitHub của kết nối        |
| `PR_OPENED`       | Người mở PR là tài khoản GitHub của kết nối           |
| `PR_MERGED`       | PR do tài khoản đó mở được merge, bất kể ai bấm merge |

Không được tính: commit/PR của bot hoặc người khác; merge commit (từ 2 parent trở lên); commit GitHub không liên kết được với tài khoản nào.

### BR-PAC-011 — Event Time

| Event             | Thời điểm                          |
| ----------------- | ---------------------------------- |
| `COMMIT_AUTHORED` | Author date — lúc commit được viết |
| `PR_OPENED`       | Lúc PR được mở                     |
| `PR_MERGED`       | Lúc PR được merge                  |

Thời điểm push, committer date và thời điểm merge của commit không phải thời điểm của `COMMIT_AUTHORED`.

### BR-PAC-012 — All Existing Branches

Commit được đọc từ mọi nhánh đang tồn tại của repository, không chỉ nhánh mặc định.

### BR-PAC-013 — One Ledger Entry per Event

| Event             | Khóa chống trùng                         |
| ----------------- | ---------------------------------------- |
| `COMMIT_AUTHORED` | Mã băm của author date và commit message |
| `PR_OPENED`       | Số hiệu PR                               |
| `PR_MERGED`       | Số hiệu PR                               |

- Cùng một feed, cùng loại, cùng khóa → đúng một dòng sổ, bất kể chép bao nhiêu lần.
- Dòng sổ không bao giờ bị sửa. Event của nguồn bên ngoài không bao giờ bị xóa khỏi sổ, kể cả khi đã biến mất ở GitHub.
- Va chạm khóa commit (cùng giây, cùng message) được chấp nhận (`02` §2.5).

### BR-PAC-014 — Minimal Data

Về **nội dung hoạt động**, sổ chỉ lưu loại, thời điểm, số lượng và khóa chống trùng. Không lưu message, code, tên nhánh, đường dẫn file hay nội dung PR.

Ngoài nội dung, mỗi dòng sổ mang metadata cần cho vận hành: feed mà nó thuộc về và thời điểm nó được ghi vào sổ (phục vụ chẩn đoán đồng bộ). Metadata này không chứa thông tin nào về nội dung công việc.

### BR-PAC-015 — Coverage

- Mỗi feed có một khoảng **đã chép đầy đủ** `[coveredFrom, syncedUntil)`.
- `syncedUntil` chỉ tiến; `coveredFrom` chỉ lùi, và chỉ lùi tới mốc thực sự lấy được.
- Thời gian ngoài khoảng đã chép đầy đủ là **không có dữ liệu**, không phải không có hoạt động (RP-PAC-002).

### BR-PAC-016 — When Activity Is Synced

Một feed được chép:

- khi người dùng xem hoạt động của Project và lần chép gần nhất đã cách hơn 10 phút;
- khi một Cycle của Project dùng feed khép lại (lần chép cuối, giới hạn thời gian). Lần chép này chạy khi sổ chưa phủ tới lúc khép, kể cả khi lần chép trước chưa quá 10 phút hay vừa lỗi; nếu không, khép ngay sau khi mở trang sẽ cho snapshot thiếu vài phút cuối và bị ghi là thiếu dữ liệu;
- khi feed được gắn vào Project và khoảng đã chép chưa phủ tới thời điểm cần:
  - Project có Cycle mở: lúc Cycle đó bắt đầu;
  - Project `STOPPED`/`COMPLETED` sau khi đã có ít nhất một Cycle: lúc Cycle cuối cùng khép (để D3 thấy được hoạt động sau khi khép, kể cả trước lúc gắn);
  - Project `NOT_STARTED`: lúc gắn (D4 chỉ xét hoạt động sau lúc gắn).

Mỗi lần chép lùi lại một khoảng đệm so với `syncedUntil` để bắt event đến trễ.

## 9.4. Attribution

### BR-PAC-017 — Declaration Timeline

Lời tuyên bố tại mỗi thời điểm được dựng từ lịch sử chuyển trạng thái của Project. Mỗi khoảng là nửa mở `[bắt đầu, kết thúc)`.

### BR-PAC-018 — Event Belongs to the Open Cycle

| Lời tuyên bố lúc event xảy ra | Thuộc về                      | Nhãn     |
| ----------------------------- | ----------------------------- | -------- |
| `ACTIVE`                      | Cycle đang mở                 | `ACTIVE` |
| `PAUSED`                      | Cycle đang mở                 | `PAUSED` |
| `NOT_STARTED`                 | Ngoài mọi Cycle (DEC-PAC-014) | —        |
| `STOPPED` / `COMPLETED`       | Ngoài mọi Cycle               | —        |

### BR-PAC-019 — Independent Event Attribution

Mỗi event được gắn độc lập theo thời điểm của chính nó. `PR_OPENED` và `PR_MERGED` của cùng một PR có thể thuộc hai Cycle khác nhau.

### BR-PAC-020 — Days in the Account Time Zone

Ngày được xác định theo múi giờ hiện tại của tài khoản. Mỗi ngày trong phạm vi Cycle có đúng một trạng thái:

| Trạng thái      | Điều kiện                                              |
| --------------- | ------------------------------------------------------ |
| `ACTIVE`        | ≥ 1 event nhãn `ACTIVE`                                |
| `PAUSED_ACTIVE` | ≥ 1 event và mọi event đều nhãn `PAUSED`               |
| `PAUSED_IDLE`   | Ngày nằm hoàn toàn trong khoảng PAUSED, không có event |
| `IDLE`          | Còn lại                                                |

Trạng thái của một ngày chỉ được tính từ các nguồn đã chép đầy đủ ngày đó. Ngày không được nguồn nào chép đầy đủ được đánh dấu là **không có dữ liệu** thay vì `IDLE`. Ngày chỉ được một phần nguồn chép đầy đủ vẫn được tính từ các nguồn đó, và phần hoạt động cho biết nguồn nào đang thiếu dữ liệu (BR-PAC-036).

### BR-PAC-021 — Metric Definitions

| Metric                      | Định nghĩa                         |
| --------------------------- | ---------------------------------- |
| Ngày hoạt động              | Số ngày `ACTIVE` + `PAUSED_ACTIVE` |
| Ngày hoạt động lúc tạm dừng | Số ngày `PAUSED_ACTIVE`            |
| Commit                      | Số `COMMIT_AUTHORED`               |
| PR mở                       | Số `PR_OPENED`                     |
| PR merge                    | Số `PR_MERGED`                     |
| Hoạt động gần nhất          | Thời điểm event mới nhất           |

Không metric nào được trình bày như điểm số, mục tiêu, xếp hạng hay so sánh với Cycle/Project khác.

## 9.5. Divergence

### BR-PAC-022 — D1: Declared Active, No Activity

Xuất hiện khi Project `ACTIVE` và đã qua **7** ngày kể từ **mốc tham chiếu** mà không có event nào.

Mốc tham chiếu:

- nếu Cycle đang mở có event: thời điểm muộn hơn giữa event gần nhất và lần gần nhất Project vào `ACTIVE`;
- nếu Cycle đang mở chưa có event nào: lần gần nhất Project vào `ACTIVE` (Start, Resume hoặc Reopen).

Không được đánh giá khi bất kỳ nguồn nào của Project không ở trạng thái `ACTIVE` hoặc khoảng cần xét chưa được chép đầy đủ (RP-PAC-002).

### BR-PAC-023 — D2: Declared Paused, Still Active

Xuất hiện khi Project `PAUSED` và trong lần tạm dừng hiện tại có event ở **2** ngày khác nhau trở lên.

Đi kèm hành động Resume. Tự biến mất khi Project rời `PAUSED`.

### BR-PAC-024 — D3: Closed, Still Active

Xuất hiện khi Project `STOPPED` hoặc `COMPLETED`, Project **đã từng có ít nhất một Cycle khép lại**, và có ít nhất một event sau khi Cycle cuối cùng khép. Mốc là thời điểm Cycle cuối khép, không phụ thuộc thời điểm nguồn được gắn.

Project `STOPPED` mà chưa từng bắt đầu (Stop từ `NOT_STARTED`) không có Cycle nào khép, nên không có D3 — và cũng không có divergence nào khác. Hiển thị số event và thời điểm gần nhất.

### BR-PAC-025 — D4: Not Started, Already Active

Xuất hiện khi Project `NOT_STARTED` và có ít nhất một event xảy ra sau thời điểm **chính nguồn chứa event đó** được gắn vào Project. Với nhiều nguồn, mỗi nguồn được xét theo thời điểm gắn của riêng nó.

### BR-PAC-026 — Divergence Never Changes State

- Divergence không tạo, sửa hay xóa lifecycle state hay transition.
- Hành động đi kèm D2 chính là lifecycle action Resume hiện có (FR-PRJ-007), với cùng revision check và business rule.

### BR-PAC-027 — No Dismissal State

Không có thao tác bỏ qua và không lưu trạng thái "đã bỏ qua". D2 tự biến mất theo trạng thái; D1, D3, D4 là thông tin, không đòi phản hồi.

Ngưỡng 7 ngày (D1) và 2 ngày (D2) là tham số hiệu chỉnh (OQ-PAC-002).

## 9.6. Snapshot

### BR-PAC-028 — Only a Real Cycle Close

Snapshot chỉ được chụp khi một Cycle thực sự khép lại: Stop hoặc Complete từ `ACTIVE`/`PAUSED`. Stop từ `NOT_STARTED` không tạo snapshot.

### BR-PAC-029 — Only Cycles with Sources

- Nguồn của snapshot là các nguồn đã được gắn vào Project tại thời điểm Cycle khép.
- Ngoại lệ được chấp nhận: snapshot được chụp bất đồng bộ ngay sau khi Cycle khép (BR-PAC-030). Nếu người dùng gỡ một nguồn trong khoảng thời gian ngắn giữa lúc khép và lúc snapshot được chụp, nguồn đó không có trong snapshot. Phase 1 không lưu riêng danh sách nguồn tại thời điểm khép (`02` §5.1).
- Cycle không có nguồn nào tại thời điểm khép không có snapshot.

### BR-PAC-030 — Snapshot Does Not Block the Lifecycle

Stop/Complete hoàn tất ngay, không chờ việc chép hay chụp snapshot. Lần chép cuối thất bại không ngăn snapshot được tạo từ sổ hiện có.

### BR-PAC-031 — Snapshot Is Created Once and Never Changes

- Mỗi Cycle có tối đa một snapshot.
- Yêu cầu chụp lặp lại cho cùng Cycle giữ nguyên snapshot đã có, không ghi đè và không báo lỗi.
- Snapshot không thay đổi khi sổ nhận thêm event, khi nguồn bị gỡ, khi repository đổi tên/bị xóa, khi múi giờ đổi hay khi định nghĩa metric thay đổi.

### BR-PAC-032 — Snapshot Content

Snapshot gồm:

- toàn bộ metric của BR-PAC-021 và dải ngày;
- danh sách nguồn theo tên tại thời điểm chụp, kèm khoảng đã chép đầy đủ của từng nguồn;
- `dataUntil` = thời điểm nhỏ nhất mà mọi nguồn đều đã chép đầy đủ;
- múi giờ đã dùng;
- thời điểm chụp.

### BR-PAC-033 — No Retroactive Snapshot in Phase 1

Cycle đã khép trước khi có nguồn không được tính bù snapshot ở Phase 1 (OQ-PAC-006 còn mở).

## 9.7. Presentation

### BR-PAC-034 — No Source, No Activity Frame

Project hiện không có nguồn không hiển thị phần hoạt động của Cycle đang mở, khung trống hay lời mời kết nối nào trên trang Project.

Snapshot của các Cycle đã đóng **vẫn được hiển thị** trong lịch sử, kể cả khi mọi nguồn đã bị gỡ hoặc GitHub đã bị ngắt kết nối — chúng là lịch sử, không phụ thuộc nguồn hiện tại (BR-PAC-031).

### BR-PAC-035 — Declaration Before Evidence

Trên trang Project và trong lịch sử Cycle, lời tuyên bố của người dùng (outcome, ngày dự kiến, ghi chú khép lại) được trình bày trước; hoạt động đi sau.

### BR-PAC-036 — Isolated Failure Display

Lỗi của một nguồn chỉ được hiển thị ở phần hoạt động, gắn với đúng nguồn đó, kèm lý do và cách khắc phục. Không có lỗi nguồn nào làm trang Project không tải được.

---

# 10. Functional Requirement Traceability

| FR         | User Need       | Decision / Analysis          | Business Rules                 |
| ---------- | --------------- | ---------------------------- | ------------------------------ |
| FR-PAC-001 | UN-PAC-005      | DEC-PAC-009                  | BR-PAC-001 → 004               |
| FR-PAC-002 | UN-PAC-005      | 01 §6                        | BR-PAC-002, 004                |
| FR-PAC-003 | UN-PAC-004      | 01 §6                        | BR-PAC-002, 007                |
| FR-PAC-004 | UN-PAC-001      | DEC-PAC-003                  | BR-PAC-005, 006                |
| FR-PAC-005 | UN-PAC-001, 005 | DEC-PAC-003, 011             | BR-PAC-005, 006, 009, 016      |
| FR-PAC-006 | UN-PAC-004      | DEC-PAC-011                  | BR-PAC-007, 031                |
| FR-PAC-007 | UN-PAC-001      | 02 §6.8                      | BR-PAC-008, 036                |
| FR-PAC-008 | UN-PAC-005      | DEC-PAC-007, 008, 010, 012   | BR-PAC-010 → 015               |
| FR-PAC-009 | UN-PAC-001      | ASM-PAC-006                  | BR-PAC-015, 016                |
| FR-PAC-010 | UN-PAC-001      | DO-PAC-001, DEC-PAC-004      | BR-PAC-017 → 021, 034, 035     |
| FR-PAC-011 | UN-PAC-003, 004 | DO-PAC-003, DEC-PAC-005      | BR-PAC-022 → 027               |
| FR-PAC-012 | UN-PAC-002      | DO-PAC-002, DEC-PAC-006, 014 | BR-PAC-028 → 033               |
| FR-PAC-013 | UN-PAC-002      | FR-PRJ-017                   | BR-PAC-029, 031, 032, 033, 035 |
| FR-PAC-014 | UN-PAC-004      | 01 §6, Principle 5           | BR-PAC-004, 008, 036           |

---

# 11. Out of Scope

Như `01` §10, cụ thể ở mức requirement:

- Không requirement nào thay đổi lifecycle hay Cycle của Project.
- Không có danh sách hay nội dung từng commit/PR.
- Không có thao tác bỏ qua lời nhắc.
- Không có snapshot tính bù cho Cycle đã khép.
- Không lọc theo nhánh, thư mục, nhãn.
- Không có nhiều tài khoản GitHub cho một người dùng.
- Không có webhook, không có chép định kỳ.
- Không hiển thị hoạt động trong Chronicle (OQ-PAC-004).

---

# 12. Open Analysis

| ID             | Ảnh hưởng tới requirement                              |
| -------------- | ------------------------------------------------------ |
| OQ-PAC-002     | Ngưỡng của BR-PAC-022, BR-PAC-023                      |
| OQ-PAC-004     | Có thêm FR hiển thị snapshot trong Chronicle hay không |
| OQ-PAC-006     | BR-PAC-033 có được nới hay không                       |
| OQ-PAC-007     | Có thêm FR báo commit không xác định tác giả hay không |
| OQ-PAC-008     | Định nghĩa "ngày" của BR-PAC-022                       |
| TQ-PAC-01 → 05 | Không đổi requirement; ràng buộc thiết kế kỹ thuật     |

---

# 13. Candidate Use Cases

```text
UC-PAC-001 — Connect GitHub
UC-PAC-002 — View or Replace GitHub Connection
UC-PAC-003 — Disconnect GitHub

UC-PAC-004 — Link Repository to Project
UC-PAC-005 — Unlink Repository from Project

UC-PAC-006 — View Current Cycle Activity
UC-PAC-007 — Resume from a Paused-but-Active Notice   (D2)

UC-PAC-008 — View Closed Cycle Activity Snapshot
```

Không có Use Case riêng cho:

- **Ingest Activity / Keep Fresh** (FR-PAC-008, 009) và **Capture Snapshot** (FR-PAC-012): hành vi của hệ thống, được verify qua postcondition của UC-PAC-004, UC-PAC-006 và các lifecycle Use Case Stop/Complete của Projects (UC-PRJ-008, UC-PRJ-009).
- **D1, D3, D4**: là thông tin hiển thị trong UC-PAC-006.
- **Degrade Gracefully** (FR-PAC-014): alternative flow của từng Use Case.

---

# 14. Next Step

`05-use-cases-acceptance-criteria.md`:

```text
Use Case
    ↓
Preconditions
    ↓
Main Flow
    ↓
Alternative / Exception Flow
    ↓
Postconditions
    ↓
Acceptance Criteria
```
