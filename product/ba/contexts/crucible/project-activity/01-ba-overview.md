# Crucible — Project Activity Evidence — BA Overview

> **Status:** Draft / Discovery
>
> **Domain:** Crucible / Projects / Activity Evidence
>
> **Purpose:** Xác định problem, user needs, desired outcomes, scope và product intent của việc đưa **bằng chứng hoạt động** từ nguồn bên ngoài (GitHub trước, WakaTime sau) và về sau từ các module nội bộ vào Project — trước khi phân tích requirement và implementation.

---

## 1. Related Documentation

### Projects BA (baseline đã implement)

Capability này xây trên Projects V1 + V1.1, đã chạy trên production:

- `../project/01-ba-overview.md` — Project concept, DEC-PRJ-004/008 (Project độc lập với integration; GitHub/WakaTime ngoài V1), ASM-PRJ-003 (liên kết Project với Reflection).
- `../project/02-lifecycle-behavior-analysis.md` — lifecycle, Project Cycle (§8–9), V1.1 Cycle Flexibility (§21).
- `../project/03-functional-requirements-business-rules.md` — FR/BR của Project.

Tài liệu này **không** thay đổi lifecycle, Cycle hay bất kỳ business rule nào của Project. Nó chỉ thêm một lớp quan sát đứng cạnh.

### Tài liệu trong bộ này

| File                                           | Nội dung                                                                          | Trạng thái                 |
| ---------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------- |
| `01-ba-overview.md`                            | Problem, needs, scope, khái niệm, quyết định                                      | Draft                      |
| `02-evidence-behavior-analysis.md`             | Gắn hoạt động vào Cycle, chỗ lệch, đóng băng, các ca biên                         | Draft                      |
| `03-integration-architecture.md`               | Kiến trúc tích hợp nhiều nguồn, cấu trúc module, thiết kế DB                      | Draft                      |
| `04-functional-requirements-business-rules.md` | Functional Requirements (FR-PAC) và Business Rules (BR-PAC) của Phase 1           | Candidate Baseline         |
| `05-use-cases-acceptance-criteria.md`          | Use Cases (UC-PAC) và Acceptance Criteria của Phase 1                             | Candidate Baseline         |
| `06-product-specification.md`                  | Baseline sản phẩm: bề mặt, trạng thái hiển thị, câu chữ                           | Product Baseline Candidate |
| `07-api-contract.md`                           | Endpoint, request/response, mã lỗi                                                | Contract Candidate         |
| `08-wakatime-phase-2.md`                       | Phase 2: thời gian code từ WakaTime — hành vi, kiến trúc, yêu cầu, giao diện, API | Draft for review           |

Bộ tài liệu BA của Phase 1 đã đủ (01 → 07) và đã được implement. Phase 2 (WakaTime) nằm trọn trong `08`; implementation theo thứ tự PR ở `08` §10.

---

## 2. Context

Projects V1.1 cho phép người dùng ghi lại **lời tuyên bố** về một vòng theo đuổi:

```text
Project Cycle
├── Lifecycle state     (Start / Pause / Resume / Stop / Complete / Reopen)
├── Outcome history     (V1.1)
├── Target end date     (V1.1)
└── Closing note        (V1.1)
```

Mọi thông tin trên đều do người dùng **tự khai**.

Giữa lúc Start và lúc Stop/Complete, Magnum Opus không biết người dùng **thực sự** đã làm gì.

Với các Project là phần mềm, phần lớn hành vi đó đã tồn tại sẵn ở GitHub (commit, pull request) và WakaTime (thời gian code) — được ghi lại tự động, không cần người dùng nhập thêm.

`../project/01-ba-overview.md` §6 đã định vị trước vai trò của các nguồn này:

> External systems có thể cung cấp thêm evidence hoặc context cho Project nhưng không được định nghĩa sự tồn tại của Project.

---

## 3. Problem Statement

### 3.1. Không có bằng chứng theo đuổi

Khi nhìn lại một Cycle đã đóng, người dùng chỉ có lời tự khai: outcome, ngày dự kiến, ghi chú khép lại.

Câu hỏi "vòng đó mình thật sự đã bỏ vào bao nhiêu?" chỉ có thể trả lời bằng trí nhớ.

### 3.2. Không thấy được chỗ lệch giữa tuyên bố và hành vi

Trạng thái Project là lời tuyên bố về ý định. Nó có thể lệch khỏi hành vi thật mà người dùng không nhận ra:

```text
Tuyên bố "Đang chạy"   nhưng   nhiều ngày không đụng tới
Tuyên bố "Tạm dừng"    nhưng   vẫn tiếp tục làm (vd quên bấm Tiếp tục)
Đã "Hoàn thành"        nhưng   vẫn tiếp tục commit vào cùng sản phẩm
```

Những chỗ lệch này là thông tin có giá trị cho việc nhìn lại bản thân, nhưng hiện không được ghi nhận ở đâu.

### 3.3. Ghi tay không phải lời giải

Bắt người dùng tự ghi "hôm nay đã làm gì" sẽ biến Projects thành task log — trái với DEC-PRJ-006 (không trở thành task management system) và tạo thêm gánh nặng nhập liệu.

---

## 4. Current State

```text
Lời tuyên bố ─────────► Magnum Opus (Project, Cycle, lifecycle history)

Hành vi thật ─────────► GitHub    (commit, pull request)
                ├─────► WakaTime  (coding time)
                └─────► (không được Magnum Opus nhìn thấy)
```

Điểm có sẵn đáng chú ý:

- Mỗi lần chuyển trạng thái đều được ghi kèm thời điểm (`ProjectLifecycleTransition`). Nhờ vậy có thể dựng lại chính xác người dùng đã tuyên bố gì ở mỗi thời điểm của mọi Cycle — kể cả các Cycle có từ trước khi capability này tồn tại.
- Repository đã có cơ chế giao tiếp giữa module bằng event qua outbox (`OutboxEvent`), đang dùng cho Journal và Memory → Reflection Timeline.

---

## 5. User Needs

### UN-PAC-001 — See Evidence of Pursuit

Người dùng cần thấy, cho Cycle đang mở, bằng chứng khách quan về việc đã thực sự theo đuổi Project: những ngày có hoạt động, khối lượng hoạt động, lần hoạt động gần nhất.

### UN-PAC-002 — Preserve Evidence with History

Người dùng cần bằng chứng của một Cycle được lưu lại cùng Cycle khi Cycle khép lại, và không thay đổi về sau — để khi nhìn lại, con số là con số của đúng vòng đó.

### UN-PAC-003 — Notice Divergence

Người dùng cần được chỉ ra khi lời tuyên bố (trạng thái) và hành vi thật (hoạt động) không khớp nhau, theo cả hai chiều: nói làm mà không làm, nói nghỉ/khép lại mà vẫn làm.

### UN-PAC-004 — Stay in Control of State

Người dùng cần tiếp tục là người duy nhất quyết định trạng thái Project. Bằng chứng không được tự thay đổi lời tuyên bố.

### UN-PAC-005 — No Extra Logging

Người dùng không phải nhập thêm bất cứ điều gì trong lúc làm việc. Thiết lập một lần, sau đó bằng chứng tự xuất hiện.

---

## 6. Supporting Needs and Expectations

### Project Independence (giữ nguyên DEC-PRJ-004)

```text
Project
├── Lifecycle, Cycle, outcome...   luôn hoạt động
└── Activity evidence              tùy chọn
```

- Project không có nguồn nào (vd "Học piano") vẫn hoạt động đầy đủ như hiện tại.
- Nguồn bên ngoài lỗi, hết hạn hay bị gỡ không làm hỏng bất kỳ chức năng nào khác của Project.

### Privacy and Minimal Data

- Chỉ đọc. Magnum Opus không ghi bất cứ thứ gì lên GitHub/WakaTime.
- Chỉ lưu **sự kiện tối thiểu** (loại, thời điểm, khóa chống trùng dạng mã băm) và bản tóm tắt đã tổng hợp. Không sao chép nội dung commit, code, message hay mô tả PR.
- Thông tin xác thực (token) được mã hóa khi lưu và không bao giờ trả về client.

### Not a Productivity Meter

Bằng chứng tồn tại để nhìn lại, không phải để chấm điểm. Không có điểm số, xếp hạng, so sánh giữa các Cycle hay mục tiêu số lượng.

### No Source Is Not a Deficit

Ở Phase 1 chỉ Project phần mềm có nguồn bằng chứng. Project như "Học piano" chưa có. Điều này không được làm Project không có nguồn trông như đang thiếu:

- Project không có nguồn không hiển thị khung trống ("0 hoạt động", "Chưa kết nối GitHub").
- Không so sánh hoạt động giữa các Project (kể cả trong Chronicle).
- Lời tuyên bố của người dùng (outcome, ghi chú) luôn đứng trước; bằng chứng là phần phụ đi sau.

Khoảng chênh này là của giai đoạn đầu: các module nội bộ (§11.4) sẽ mang bằng chứng và ngữ cảnh đến cho cả Project không phải phần mềm.

---

## 7. Product Objective

Cho phép Magnum Opus đặt **lời tuyên bố** của người dùng về một vòng theo đuổi cạnh **hành vi quan sát được** của chính vòng đó — để người dùng tự nhìn lại, mà hệ thống không phán xét và không tự quyết thay.

---

## 8. Desired Outcomes

### DO-PAC-001 — Evidence Beside Declaration

Trong Cycle đang mở, người dùng thấy hoạt động thật đứng cạnh outcome và ngày dự kiến.

### DO-PAC-002 — Frozen Cycle Evidence

Mỗi Cycle đã khép lại mang theo một bản tóm tắt hoạt động bất biến.

### DO-PAC-003 — Visible Divergence

Chỗ lệch giữa trạng thái và hành vi được chỉ ra; với chỗ lệch cần một quyết định của người dùng, kèm hành động lifecycle gợi ý mà người dùng có thể chọn.

### DO-PAC-004 — Extensible Evidence

Thêm một nguồn bằng chứng mới (bên ngoài hoặc nội bộ) không đòi hỏi thay đổi cách hoạt động được gắn vào Cycle, cách chỗ lệch được xác định hay cách bản tóm tắt được chụp.

### Success Interpretation

Capability thành công khi người dùng, lúc khép một Cycle hay đọc Chronicle, có thể nói được điều gì đó đúng về vòng theo đuổi đó mà trước đây không biết — chứ không phải khi số commit tăng.

---

## 9. Scope

### Phase 1 — In Scope (GitHub)

- Kết nối GitHub ở cấp tài khoản bằng token chỉ đọc (bao gồm repository private).
- Gắn một hoặc nhiều repository làm nguồn cho một Project.
- Chép hoạt động (commit, PR) từ GitHub vào sổ hoạt động của Magnum Opus.
- Tính hoạt động của Cycle đang mở: ngày hoạt động, commit, PR mở, PR merge, hoạt động gần nhất, dải ngày.
- Chụp và đóng băng bản tóm tắt hoạt động khi Cycle khép lại.
- Chỉ ra chỗ lệch giữa trạng thái và hoạt động (`02` §4).
- Xử lý mềm khi nguồn lỗi hoặc token hết hạn.

### Phase 2 — Candidates

| Candidate                          | Loại         | Điều kiện bắt đầu                                               |
| ---------------------------------- | ------------ | --------------------------------------------------------------- |
| WakaTime (thời gian code)          | Nguồn ngoài  | **Đang làm** — `08-wakatime-phase-2.md` (OQ-PAC-001 đã trả lời) |
| Habit check-in                     | Nguồn nội bộ | Phase 1 đã được dùng thật; OQ-PAC-009                           |
| Journal entry / Memory gắn Project | Reflection   | Phân tích riêng — không phải bằng chứng hoạt động (§11.4)       |

---

## 10. Out of Scope

- Tự động thay đổi trạng thái Project dựa trên hoạt động.
- Điểm năng suất, xếp hạng, so sánh giữa Cycle hay giữa Project.
- Hiển thị danh sách hoặc nội dung từng commit / PR (đã có GitHub).
- Ghi bất cứ thứ gì lên GitHub (comment, label, status...).
- Issue, release, review, CI status.
- Trello, Notion hay bất kỳ công cụ quản lý công việc nào.
- Framework kết nối tổng quát cho bên thứ ba bất kỳ (kiểu Zapier). Mô hình sự kiện bên trong vẫn không phụ thuộc nguồn (DEC-PAC-010).
- Lọc hoạt động theo nhánh, thư mục hay nhãn (DEC-PAC-003).
- Team / nhiều người đóng góp: chỉ hoạt động của chính người dùng được tính.
- Webhook từ GitHub. Phase 1 chỉ chép chủ động; webhook là điểm mở rộng (`03` §8).

---

## 11. Concepts

### 11.1. Hai lớp sự thật

| Lớp             | Là gì                                                                       | Nguồn                                             | Ai thay đổi             |
| --------------- | --------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------- |
| **Declaration** | Lời tuyên bố về ý định: trạng thái, outcome, ngày dự kiến, ghi chú khép lại | Người dùng                                        | Chỉ người dùng          |
| **Evidence**    | Hành vi quan sát được: commit, PR                                           | GitHub (sau: WakaTime, các module nội bộ — §11.4) | Không ai — chỉ được đọc |

Hai lớp **khác loại**, nên không lớp nào phủ định lớp nào. "Đang tạm dừng" và "đã commit hôm đó" có thể cùng đúng. Đây là nền tảng của toàn bộ capability.

### 11.2. Các khái niệm mới

| Khái niệm             | Định nghĩa                                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Connection**        | Quyền đọc một tài khoản bên ngoài (GitHub) của người dùng. Phase 1: mỗi người dùng có tối đa một tài khoản cho mỗi provider; kết nối tài khoản khác là thay thế kết nối cũ.                                         |
| **Feed**              | Một luồng hoạt động được chép về từ **một** tài nguyên: một repository GitHub, (sau) một project WakaTime, một Habit. Feed **không biết** Project nào đang dùng nó.                                                 |
| **Activity Event**    | Một dòng trong sổ hoạt động: một sự kiện có thời điểm thuộc về **công việc của chính người dùng** trong một Feed. Phase 1: viết commit, mở PR, và PR do người dùng mở được merge (bất kể ai bấm merge — `02` §2.3). |
| **Activity Ledger**   | Sổ hoạt động — tập hợp mọi Activity Event của mọi Feed, lưu trong Magnum Opus. Là nơi **duy nhất** mà việc gắn hoạt động vào Cycle đọc dữ liệu.                                                                     |
| **Project Source**    | Mối nối "Project X dùng Feed Y". Một Project có 0..n Source; một Feed có thể được nhiều Project dùng.                                                                                                               |
| **Attribution**       | Việc xác định một Activity Event thuộc Cycle nào và rơi vào lời tuyên bố nào (`02` §3).                                                                                                                             |
| **Cycle Activity**    | Tổng hợp Activity Event của một Cycle theo ngày. Được tính từ sổ hoạt động khi Cycle đang mở.                                                                                                                       |
| **Activity Snapshot** | Cycle Activity được chụp lại lúc Cycle khép lại. Bất biến.                                                                                                                                                          |
| **Divergence**        | Trạng thái mà lời tuyên bố và hoạt động không khớp nhau (`02` §4).                                                                                                                                                  |

### 11.3. Quan hệ với Project Cycle

```text
GitHub repo ──chép──► Feed ──► Activity Ledger
                        ▲
Project ── Source ──────┘
   │
   ├── Cycle 1  [Start ──── Pause ── Resume ──── Complete]
   │      └── Cycle Activity → Activity Snapshot (khi đóng)
   │
   │    (giữa hai Cycle: hoạt động "ngoài Cycle")
   │
   └── Cycle 2  [Reopen ──── ...
          └── Cycle Activity
```

Pause/Resume là nhịp bên trong một Cycle (`../project/02-lifecycle-behavior-analysis.md` §8). Chúng **không** mở hay đóng Cycle, và do đó không mở hay đóng phạm vi hoạt động của Cycle.

### 11.4. Future Direction — Internal Modules

Project về lâu dài sẽ được nối với các module khác của Magnum Opus. Hai loại quan hệ có bản chất khác nhau:

| Quan hệ                   | Trả lời câu hỏi                      | Ví dụ                      | Gắn với Project theo                                         | Vào sổ hoạt động |
| ------------------------- | ------------------------------------ | -------------------------- | ------------------------------------------------------------ | ---------------- |
| **Evidence** (bằng chứng) | Người dùng có **làm** không?         | commit, PR, Habit check-in | Cả một luồng (habit "Tập đàn" thuộc về "Học piano")          | ✅               |
| **Reflection** (suy ngẫm) | Người dùng đã **nghĩ, cảm, nhớ** gì? | Journal entry, Memory      | Từng mục (nhật ký hôm nay nói về Project, hôm qua thì không) | ❌               |

Viết **về** Project không phải là **làm** Project, nên Journal/Memory không được tính là hoạt động và không tham gia Divergence. Chúng được gắn vào Project và hiển thị theo Cycle mà chúng rơi vào (cùng logic thời gian), như "Nhật ký & kỷ niệm của vòng này".

Nguồn nội bộ dạng Evidence giao tiếp bằng event qua outbox (cùng cơ chế Journal/Memory → Reflection Timeline đang dùng) và ghi vào cùng sổ hoạt động. Attribution, Cycle Activity, Divergence và Snapshot áp dụng nguyên vẹn, không phải thiết kế lại. Chi tiết kỹ thuật: `03` §8.

---

## 12. Analysis Principles

1. Evidence không bao giờ thay đổi Declaration. Chỉ người dùng thay đổi trạng thái.
2. Chỉ ra chỗ lệch theo cả hai chiều, đối xử như nhau.
3. Hệ thống không suy đoán nguyên nhân của chỗ lệch — nó không có đủ thông tin.
4. Lịch sử bất biến: Activity Snapshot của Cycle đã đóng không bao giờ đổi.
5. Nguồn bên ngoài là phụ: lỗi của nguồn chỉ ảnh hưởng phần hoạt động.
6. Lưu tối thiểu: sự kiện (loại, thời điểm, mã băm) và tóm tắt, không dữ liệu thô.
7. Không có con số nào được trình bày như điểm số hay mục tiêu.
8. Không mặc định model của GitHub là model của Magnum Opus: Magnum Opus nói về ngày hoạt động và vòng theo đuổi, không nói về branch hay repository structure.
9. Project không có nguồn bằng chứng không bị trình bày như đang thiếu (§6).
10. Module giao tiếp qua event và reader; không module nào import domain hay application của module khác.

---

## 13. Assumptions

| ID          | Assumption                                                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ASM-PAC-001 | Một Project của người dùng ở cỡ sản phẩm/mục tiêu lớn (vd "Magnum Opus") và tương ứng với toàn bộ một hoặc vài repository — không phải một tính năng trong repository.                |
| ASM-PAC-002 | Người dùng là tác giả của phần lớn commit cần tính, và GitHub liên kết được commit đó với tài khoản của họ (email commit đã được xác minh trên GitHub).                               |
| ASM-PAC-003 | Người dùng merge pull request bằng **merge commit**, giữ nguyên commit gốc (đúng với repository `magnum-opus` hiện tại). Squash merge sẽ dồn hoạt động về ngày merge — xem `02` §6.4. |
| ASM-PAC-004 | Ngày hoạt động (có/không) là tín hiệu có ý nghĩa hơn số lượng commit đối với việc nhìn lại.                                                                                           |
| ASM-PAC-005 | Ngưỡng nhắc mặc định (`02` §4.3) phù hợp ở lần dùng đầu và sẽ được hiệu chỉnh sau khi dùng thật.                                                                                      |
| ASM-PAC-006 | Chép lại khi người dùng mở trang Project (nếu lần chép trước đã cách vài phút) đủ tươi cho nhu cầu nhìn lại; không cần chép theo thời gian thực.                                      |

---

## 14. Known Decisions

| ID          | Decision                                                                                                                                                                                                                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DEC-PAC-001 | Activity Evidence là lớp quan sát đứng cạnh Project; không thay đổi lifecycle, Cycle hay business rule nào của Project.                                                                                                                                                                                                                          |
| DEC-PAC-002 | GitHub là nguồn đầu tiên (Phase 1). WakaTime và Habit là ứng viên Phase 2. Không có nguồn quản lý công việc nào (Trello, Notion...).                                                                                                                                                                                                             |
| DEC-PAC-003 | Một repository được dùng trọn vẹn. Không lọc theo branch, thư mục hay nhãn ở Phase 1 (hệ quả của ASM-PAC-001).                                                                                                                                                                                                                                   |
| DEC-PAC-004 | Hoạt động thuộc về Cycle đang mở vào thời điểm xảy ra, **bao gồm cả lúc PAUSED**; hoạt động khi không có Cycle mở nằm ngoài Cycle (`02` §3).                                                                                                                                                                                                     |
| DEC-PAC-005 | Chỗ lệch được chỉ ra theo cả hai chiều; hệ thống không bao giờ tự đổi trạng thái (`02` §4).                                                                                                                                                                                                                                                      |
| DEC-PAC-006 | Bản tóm tắt hoạt động được chụp từ sổ hoạt động khi Cycle khép lại và không bao giờ đổi.                                                                                                                                                                                                                                                         |
| DEC-PAC-007 | Chỉ tính hoạt động thuộc về công việc của chính người dùng: commit do người dùng viết, PR do người dùng mở và việc PR đó được merge. Commit/PR của bot hoặc người khác và merge commit không được tính.                                                                                                                                          |
| DEC-PAC-008 | Hoạt động được **chép vào sổ hoạt động** của Magnum Opus; Attribution, Divergence và Snapshot chỉ đọc sổ, không gọi nguồn bên ngoài. _Thay cho phương án ban đầu "tính tại chỗ từ GitHub, không lưu". Lý do: nhiều nguồn, giới hạn request, nguồn giới hạn lịch sử (WakaTime), nguồn nội bộ đẩy event, snapshot không phụ thuộc nguồn còn sống._ |
| DEC-PAC-009 | Kết nối GitHub bằng fine-grained personal access token (người dùng duy nhất); không dựng GitHub OAuth App ở Phase 1.                                                                                                                                                                                                                             |
| DEC-PAC-010 | Mô hình hoạt động không phụ thuộc nguồn: mọi nguồn chỉ cung cấp Activity Event `{ loại, thời điểm, số lượng, khóa chống trùng }`. GitHub là nguồn đầu tiên, không phải nguồn định hình mô hình.                                                                                                                                                  |
| DEC-PAC-011 | Tách **Feed** (luồng dữ liệu, không biết Project) khỏi **Project Source** (mối nối). Một tài nguyên được chép đúng một lần dù gắn cho bao nhiêu Project; gỡ rồi gắn lại không mất sổ.                                                                                                                                                            |
| DEC-PAC-012 | Chống chép trùng bằng khóa ổn định theo loại sự kiện; với commit là mã băm của author date và message (không phải SHA), để rebase/cherry-pick không bị đếm hai lần. Va chạm hiếm (hai commit cùng giây, cùng message) được chấp nhận: đếm thiếu commit, không ảnh hưởng ngày hoạt động (`02` §2.5).                                              |
| DEC-PAC-013 | Kiến trúc ba tầng phụ thuộc một chiều: `crucible/project-activity` → `activity` → `integrations/<provider>` (`03` §2).                                                                                                                                                                                                                           |
| DEC-PAC-014 | Hoạt động lúc NOT_STARTED luôn nằm ngoài mọi Cycle và chỉ dùng cho D4, bất kể BA Project coi Cycle 1 bắt đầu lúc tạo hay lúc Start (OQ-PAC-005). Chỉ transition thực sự khép một Cycle (Stop/Complete từ ACTIVE/PAUSED) mới tạo snapshot.                                                                                                        |

---

## 15. Open Questions

| ID         | Question                                                                                                                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-PAC-002 | Ngưỡng nhắc chính xác cho từng loại Divergence (đề xuất ban đầu ở `02` §4.3).                                                                                                                              |
| OQ-PAC-004 | Activity Snapshot có xuất hiện trong Chronicle tháng không, và dưới dạng nào?                                                                                                                              |
| OQ-PAC-005 | BA Project (§8) ghi Cycle 1 bắt đầu khi tạo Project, còn implementation tạo Cycle 1 khi Start. Cần thống nhất câu chữ BA (không ảnh hưởng capability này: hoạt động lúc NOT_STARTED luôn nằm ngoài Cycle). |
| OQ-PAC-009 | Module nội bộ nào trở thành nguồn đầu tiên và một entity được gắn với Project bằng cách nào? Phân tích khi Phase 1 đã được dùng thật.                                                                      |

OQ-PAC-001 (giới hạn lịch sử của WakaTime) đã được trả lời bằng spike ngày 2026-10-21: không giới hạn 7 ngày trên tài khoản hiện tại, không cần chép định kỳ (`08` §2, DEC-PAC-015).

OQ-PAC-003 (thử lại snapshot khi GitHub lỗi lúc khép Cycle) đã được giải quyết bởi DEC-PAC-008: snapshot được chụp từ sổ và ghi rõ sổ đầy đủ tới thời điểm nào (`02` §5.1).

Open question của phần hành vi: `02-evidence-behavior-analysis.md` §8.

---

## 16. Next Step

Discovery gồm `02-evidence-behavior-analysis.md` (hành vi chi tiết) và `03-integration-architecture.md` (kiến trúc, thiết kế DB). Trình tự các tài liệu tiếp theo:

```text
04 — Functional Requirements & Business Rules   ✅
05 — Use Cases & Acceptance Criteria            ✅
06 — Product Specification                    ✅
07 — API Contract                             ✅
08 — Phase 2: WakaTime                        📝
```
