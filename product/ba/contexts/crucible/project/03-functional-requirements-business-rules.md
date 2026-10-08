# Projects V1 — Functional Requirements & Business Rules

> **Status:** Analysis / Candidate Baseline
>
> **Domain:** Crucible / Projects
>
> **Purpose:** Xác định Functional Requirements và Business Rules của Projects V1 dựa trên BA Overview và Lifecycle & Behavior Analysis đã được xác lập trước đó.

---

## 1. Related Documentation

### BA Overview

`01-ba-overview.md`

BA Overview xác định:

- Context;
- Problem Statement;
- User Needs;
- Product Objective;
- Desired Outcomes;
- V1 Scope;
- Out of Scope;
- Known Decisions;
- Open Analysis.

### Lifecycle & Behavior Analysis

`02-lifecycle-behavior-analysis.md`

Lifecycle & Behavior Analysis xác định:

- Project lifecycle;
- ý nghĩa của từng Project state;
- các state transition hợp lệ;
- Project Cycle;
- reopen behavior;
- lifecycle history;
- các lifecycle rule candidate.

### Functional Requirements & Business Rules

Tài liệu này chuyển các User Need, V1 Scope và lifecycle behavior đã được phân tích thành các Functional Requirement và Business Rule có thể được tiếp tục specification, implementation và verification trong các phase sau.

```text
User Need
    +
V1 Scope
    +
Lifecycle Analysis
    ↓
Functional Requirement
    ↓
Business Rule
    ↓
Use Case
    ↓
Acceptance Criteria
```

Tài liệu này chưa xác định:

- API design;
- database schema;
- aggregate structure;
- domain event;
- persistence strategy;
- UI implementation;
- technical architecture cụ thể.

---

## 2. Requirement Principles

### RP-PRJ-001 — Requirements Must Be Traceable

Mỗi Functional Requirement phải có nguồn gốc từ ít nhất một trong các nguồn sau:

- User Need;
- V1 Scope;
- lifecycle behavior đã được xác nhận;
- business decision đã được xác nhận.

Không thêm capability chỉ vì implementation có thể hỗ trợ capability đó.

---

### RP-PRJ-002 — Functional Requirement Describes Capability

Functional Requirement mô tả:

> **Người dùng hoặc hệ thống cần có khả năng làm gì?**

Ví dụ:

```text
Hệ thống phải cho phép người dùng pause một Project đang ACTIVE.
```

Functional Requirement không dùng để định nghĩa toàn bộ điều kiện, constraint hoặc invariant của behavior.

Các constraint này thuộc Business Rules.

---

### RP-PRJ-003 — Business Rule Constrains Behavior

Business Rule mô tả:

> **Behavior phải tuân theo điều kiện hoặc invariant nào?**

Ví dụ:

```text
Chỉ Project đang ACTIVE mới có thể được pause.
```

Functional Requirement và Business Rule có thể liên quan chặt chẽ nhưng không phải cùng một khái niệm.

---

### RP-PRJ-004 — Requirements Are Technology Independent

Requirement không phụ thuộc vào:

- REST;
- GraphQL;
- Prisma;
- PostgreSQL;
- NestJS;
- React;
- Next.js;
- CQRS;
- Event-Driven Architecture.

Ví dụ:

```text
Hệ thống phải cho phép người dùng reopen một Project đã STOPPED.
```

không phải:

```text
POST /projects/:id/reopen
```

API là technical design được derive ở phase sau.

---

## 3. Requirement Scope

Projects V1 cần hỗ trợ bốn nhóm capability chính:

```text
Project Representation
        │
        ├── Create
        ├── View
        └── Update
        │
        ▼
Project Lifecycle
        │
        ├── Start
        ├── Pause
        ├── Resume
        ├── Stop
        ├── Complete
        └── Reopen
        │
        ▼
Project Cycle Context
        │
        └── Manage Intended Outcome
        │
        ▼
Project History
        │
        ├── Preserve Lifecycle History
        └── Preserve Project Cycles
```

---

# 4. Functional Requirements

## 4.1. Project Creation

### FR-PRJ-001 — Create Project

Hệ thống phải cho phép người dùng tạo một Project.

Việc tạo Project thiết lập một Project identity mới trong Crucible.

Project mới đại diện cho một effort mà người dùng đã chủ động xác định là đủ ý nghĩa để được ghi nhận, theo đuổi và quan sát độc lập theo thời gian.

Projects V1 yêu cầu tối thiểu:

```text
title       → required
description → optional
```

Việc tạo Project:

- không đồng nghĩa với execution đã bắt đầu;
- không tạo Project Cycle;
- không yêu cầu intended outcome.

### Traceability

```text
UN-PRJ-001 — Represent Project
UN-PRJ-002 — Preserve Project Context
V1 Scope — Create Project
```

---

## 4.2. View Projects

### FR-PRJ-002 — View Projects

Hệ thống phải cho phép người dùng xem các Project đã được ghi nhận trong Crucible.

Thông tin được hiển thị phải đủ để người dùng có thể phân biệt, nhận diện và revisit các Project đã tồn tại.

### Traceability

```text
UN-PRJ-001 — Represent Project
UN-PRJ-004 — Revisit Past Projects
V1 Scope — List / View Projects
```

---

## 4.3. View Project Details

### FR-PRJ-003 — View Project Details

Hệ thống phải cho phép người dùng xem thông tin hiện tại của một Project cụ thể.

Project detail phải cung cấp đủ context để người dùng hiểu:

- đây là Project nào;
- Project đại diện cho effort gì;
- Project hiện đang ở lifecycle state nào;
- Project hiện có current Cycle hay không;
- intended outcome của current Cycle nếu đã được xác định.

~~Việc requirement này tồn tại không đồng nghĩa Projects V1 bắt buộc phải có dedicated lifecycle history UI.~~ **(Đã điều chỉnh — V1.1)** Lịch sử ở mức Cycle giờ có màn hình riêng — xem FR-PRJ-017. Timeline mức transition vẫn không bắt buộc.

### Traceability

```text
UN-PRJ-002 — Preserve Project Context
UN-PRJ-003 — Track Project Lifecycle
FR-PRJ-011 — Manage Current Cycle Intended Outcome
V1 Scope — Project Detail
```

---

## 4.4. Update Project

### FR-PRJ-004 — Update Project Information

Hệ thống phải cho phép người dùng cập nhật những thông tin được phép chỉnh sửa của Project identity.

Trong Projects V1:

```text
title       → editable
description → editable
```

Việc cập nhật Project information không được tự động thay đổi lifecycle state.

`Intended Outcome` không được xem là general Project information vì nó thuộc Project Cycle.

### Traceability

```text
UN-PRJ-002 — Preserve Project Context
V1 Scope — Update Project
```

---

# 5. Lifecycle Functional Requirements

## 5.1. Start Project

### FR-PRJ-005 — Start Project

Hệ thống phải cho phép người dùng bắt đầu thực hiện một Project chưa từng bắt đầu execution.

Khi Project được start:

```text
NOT_STARTED
     ↓
   Start
     ↓
   ACTIVE
```

Project chuyển từ `NOT_STARTED` sang `ACTIVE`.

Tại thời điểm này, Project Cycle đầu tiên bắt đầu.

Việc start không yêu cầu intended outcome phải được xác định trước.

### Traceability

```text
UN-PRJ-003 — Track Project Lifecycle
Lifecycle Analysis — Start
Lifecycle Analysis — Project Cycle
```

---

## 5.2. Pause Project

### FR-PRJ-006 — Pause Project

Hệ thống phải cho phép người dùng tạm dừng một Project đang được thực hiện trong khi vẫn giữ intention tiếp tục Project sau đó.

Khi Project được pause:

```text
ACTIVE
   ↓
 Pause
   ↓
PAUSED
```

Việc pause không kết thúc current Project Cycle.

### Traceability

```text
UN-PRJ-003 — Track Project Lifecycle
Lifecycle Analysis — Pause
```

---

## 5.3. Resume Project

### FR-PRJ-007 — Resume Project

Hệ thống phải cho phép người dùng tiếp tục thực hiện một Project đang `PAUSED`.

Khi Project được resume:

```text
PAUSED
   ↓
 Resume
   ↓
ACTIVE
```

Việc resume tiếp tục current Project Cycle và không tạo Cycle mới.

### Traceability

```text
UN-PRJ-003 — Track Project Lifecycle
Lifecycle Analysis — Resume
```

---

## 5.4. Stop Project

### FR-PRJ-008 — Stop Project

Hệ thống phải cho phép người dùng ngưng theo đuổi một Project mà không tuyên bố Project đã hoàn thành.

Project có thể được stop khi đang ở:

```text
NOT_STARTED
ACTIVE
PAUSED
```

State sau transition là:

```text
STOPPED
```

Nếu Project đang có current Project Cycle, việc stop kết thúc Cycle đó.

Nếu Project đang `NOT_STARTED` và chưa từng được start, việc stop không tạo Project Cycle.

### Traceability

```text
UN-PRJ-003 — Track Project Lifecycle
Lifecycle Analysis — Stop
Lifecycle Analysis — Project Cycle
```

---

## 5.5. Complete Project

### FR-PRJ-009 — Complete Project

Hệ thống phải cho phép người dùng tuyên bố current Project Cycle đã hoàn thành.

Project có thể được complete khi đang ở:

```text
ACTIVE
PAUSED
```

State sau transition là:

```text
COMPLETED
```

Việc complete kết thúc current Project Cycle.

Completion là quyết định rõ ràng của người dùng.

Hệ thống không tự động đánh giá hoặc xác minh rằng intended outcome đã đạt được.

Current Project Cycle không bắt buộc phải có intended outcome để được complete.

### Traceability

```text
UN-PRJ-003 — Track Project Lifecycle
Lifecycle Analysis — Complete
Business Decision — Completion Is User-Decided
```

---

## 5.6. Reopen Project

### FR-PRJ-010 — Reopen Project

Hệ thống phải cho phép người dùng tiếp tục theo đuổi một Project đang ở lifecycle state đã đóng.

Project có thể được reopen từ:

```text
STOPPED
COMPLETED
```

Khi Project được reopen:

```text
STOPPED / COMPLETED
        ↓
      Reopen
        ↓
      ACTIVE
```

một Project Cycle mới bắt đầu.

Project identity vẫn được giữ nguyên.

Project Cycle mới:

- không tự động kế thừa intended outcome của Cycle trước;
- có thể bắt đầu mà chưa có intended outcome.

Nếu Project bị `STOPPED` từ `NOT_STARTED` và chưa từng có Cycle nào, lần reopen đầu tiên sẽ bắt đầu `Cycle 1`.

### Traceability

```text
UN-PRJ-003 — Track Project Lifecycle
UN-PRJ-004 — Revisit Past Projects
Lifecycle Analysis — Reopen
Lifecycle Analysis — Project Cycle
```

---

# 6. Project Cycle Context Requirements

## FR-PRJ-011 — Manage Current Cycle Intended Outcome

Hệ thống phải cho phép người dùng xác định hoặc cập nhật `intended outcome` của current Project Cycle khi Cycle đang mở.

`Intended Outcome`:

- thuộc về Project Cycle;
- không thuộc cố định vào Project identity;
- không bắt buộc tại thời điểm Project được tạo;
- không bắt buộc tại thời điểm Project Cycle bắt đầu;
- có thể được xác định sau khi Cycle đã bắt đầu;
- có thể được cập nhật khi Project đang `ACTIVE` hoặc `PAUSED`;
- không được thay đổi sau khi Project Cycle đã kết thúc.

Intended Outcome được hiển thị ở Project Detail như một field của current Cycle.

**(Đã điều chỉnh — V1.1, xem BR-PRJ-032/033)** Mỗi lần xác định hoặc cập nhật intended outcome tạo một **entry mới** trong lịch sử outcome của Cycle (append-only), thay vì ghi đè giá trị trước đó. "Intended outcome hiện tại" là entry gần nhất.

~~Projects V1 không yêu cầu:~~

- ~~revision history của intended outcome;~~ **Đã điều chỉnh** — outcome history giờ được preserve, xem BR-PRJ-032.
- dedicated timeline hoặc history view cho intended outcome — vẫn chưa bắt buộc ở mức "timeline". **(V1.1)** Tuy nhiên chính FR này yêu cầu: Project Detail phải cho phép xem lại toàn bộ entry outcome của **current Cycle** (đang mở) — xem UC-PRJ-011 Alternative Flow C. Lịch sử outcome của các Cycle **đã đóng** thuộc FR-PRJ-017;
- ~~intended outcome của closed Cycle được hiển thị riêng.~~ **Đã điều chỉnh** — xem FR-PRJ-017.

Việc cập nhật intended outcome:

- không thay đổi lifecycle state;
- không tạo Project Cycle mới;
- không kết thúc current Project Cycle.

### Traceability

```text
UN-PRJ-002 — Preserve Project Context
Lifecycle Analysis — Project Cycle
Business Decision — Intended Outcome Belongs to Project Cycle
Business Decision — Intended Outcome Is Optional
Lifecycle Analysis §21 — V1.1 Revision (R1)
DEC-PRJ-LC-021
```

---

## FR-PRJ-015 — Capture Closing Note When a Cycle Ends

> **(Mới — V1.1, xem Lifecycle Analysis §21 R2)**

Hệ thống phải cho phép người dùng ghi kèm một `closingNote` dạng text tự do khi thực hiện Stop hoặc Complete làm đóng current Project Cycle.

`closingNote`:

- hoàn toàn tùy chọn — Stop/Complete vẫn hợp lệ khi không có ghi chú;
- thuộc về Project Cycle bị đóng, không thuộc Project identity;
- được ghi nhận trong cùng một action đóng Cycle — không phải một thao tác riêng sau đó;
- bất biến ngay khi Cycle đóng;
- không thay thế và không mở rộng `endReason` (`STOPPED` | `COMPLETED` giữ nguyên nhị phân).

`NOT_STARTED → STOPPED` không có Cycle nào để đóng, nên không có chỗ để gắn `closingNote` — action này không nhận closing note.

### Traceability

```text
UN-PRJ-002 — Preserve Project Context
UN-PRJ-004 — Revisit Past Projects
Lifecycle Analysis §21 — V1.1 Revision (R2)
DEC-PRJ-LC-020
```

---

## FR-PRJ-016 — Set Optional Target End Date for Current Cycle

> **(Mới — V1.1, xem Lifecycle Analysis §21 R3)**

Hệ thống phải cho phép người dùng xác định, cập nhật hoặc xóa `targetEndAt` (mốc **ngày** dự kiến kết thúc — date-only, không có giờ hay múi giờ) của current Project Cycle khi Cycle đang mở.

`targetEndAt`:

- hoàn toàn tùy chọn;
- chỉ có thể set/update/clear khi Project đang `ACTIVE` hoặc `PAUSED`;
- không lưu lịch sử thay đổi (khác với intended outcome) — chỉ giá trị hiện tại có ý nghĩa;
- bất biến sau khi Cycle đóng (giữ lại như historical context: "đã định xong khi nào");
- không bao giờ kích hoạt lifecycle transition, không tự đóng Cycle, không chặn thao tác nào.

Khi `targetEndAt` đã qua (so với ngày hôm nay theo `User.timeZone`) mà Cycle vẫn mở, Project Detail phải hiển thị một tín hiệu nhắc nhẹ (vd "Quá hạn dự kiến N ngày"). Tín hiệu này thuần túy là presentation — nó là lý do chính khiến `targetEndAt` có giá trị với người dùng, nhưng không được kéo theo bất kỳ thay đổi state nào (BR-PRJ-037).

### Traceability

```text
UN-PRJ-003 — Track Project Lifecycle
Lifecycle Analysis §21 — V1.1 Revision (R3)
DEC-PRJ-LC-022
```

---

## FR-PRJ-017 — View Closed Cycle History

> **(Mới — V1.1)** Supersedes một phần quyết định "V1 không yêu cầu dedicated lifecycle history UI" tại FR-PRJ-013 và §12.

Hệ thống phải cho phép người dùng xem lại các Project Cycle đã đóng của một Project.

Với mỗi Cycle đã đóng, người dùng phải thấy được:

- số thứ tự Cycle;
- thời điểm bắt đầu và kết thúc;
- `endReason` (`STOPPED` | `COMPLETED`);
- toàn bộ lịch sử intended outcome của Cycle đó;
- `closingNote` nếu có;
- `targetEndAt` nếu có.

Requirement này **không** yêu cầu timeline chi tiết từng transition Pause/Resume trong một Cycle — mức độ chi tiết là "từng Cycle", không phải "từng sự kiện".

Lý do: nếu không có màn hình này, R1 (outcome history) và R2 (closing note) chỉ được lưu mà không bao giờ được thấy — giá trị reflection của chúng bằng không.

### Traceability

```text
UN-PRJ-004 — Revisit Past Projects
FR-PRJ-013 — Preserve Project Cycles
Lifecycle Analysis §21 — V1.1 Revision
```

---

# 7. Lifecycle History Requirements

## FR-PRJ-012 — Preserve Lifecycle History

Hệ thống phải bảo toàn những lifecycle transition có ý nghĩa đã xảy ra trong lifetime của một Project.

Historical transition phải tiếp tục tồn tại sau những state change tiếp theo.

Ví dụ:

```text
ACTIVE
   ↓
STOPPED
   ↓
REOPENED
   ↓
ACTIVE
```

Current state `ACTIVE` không được làm mất historical fact rằng Project trước đó đã từng `STOPPED`.

Lifecycle history phải cho phép phân biệt:

```text
Project đang ở đâu hiện tại
            ≠
Project đã trải qua những gì
```

### Traceability

```text
UN-PRJ-003 — Track Project Lifecycle
UN-PRJ-004 — Revisit Past Projects
Lifecycle Principle — Historical Transitions Are Meaningful
```

---

## FR-PRJ-013 — Preserve Project Cycles

Hệ thống phải bảo toàn lifecycle boundary giữa các Project Cycle khác nhau.

Một Project Cycle chỉ bắt đầu khi Project bước vào `ACTIVE` thông qua:

```text
Start
```

hoặc:

```text
Reopen
```

Khi một current Project Cycle kết thúc bằng `STOPPED` hoặc `COMPLETED`, Cycle đó phải tiếp tục có thể được phân biệt về mặt lịch sử với Cycle mới được tạo sau này.

Conceptually:

```text
Project

Cycle 1
ACTIVE
   ↓
PAUSED
   ↓
ACTIVE
   ↓
COMPLETED

Cycle 2
ACTIVE
   ↓
...
```

Khoảng thời gian Project ở `NOT_STARTED` trước lần Start đầu tiên không thuộc Cycle 1.

Requirement này không xác định Project Cycle phải được technical representation dưới hình thức nào.

FR-PRJ-012 và FR-PRJ-013 được verify thông qua postcondition của các lifecycle Use Case. ~~V1 không yêu cầu dedicated lifecycle history UI.~~ **(Đã điều chỉnh — V1.1)** Lịch sử ở mức Cycle (không phải từng transition) giờ được hiển thị, xem FR-PRJ-017.

### Traceability

```text
UN-PRJ-003 — Track Project Lifecycle
UN-PRJ-004 — Revisit Past Projects
Lifecycle Analysis — Project Cycle
Lifecycle Analysis — Reopen
Lifecycle Analysis — Lifecycle History
```

---

# 8. Deletion Requirements

## FR-PRJ-014 — Delete Project

Hệ thống phải cho phép người dùng xóa vĩnh viễn một Project khi Project đó chưa từng thực sự được theo đuổi.

Delete chỉ hợp lệ khi Project chưa từng có bất kỳ Project Cycle nào — current lẫn historical:

```text
cycles.length == 0
```

Điều kiện này không được xác định qua lifecycle state hiện tại. Nó được xác định qua việc Project đã từng có Project Cycle hay chưa.

Trong thực tế, điều kiện này tương đương với:

```text
state == NOT_STARTED

hoặc

state == STOPPED, đạt được qua NOT_STARTED → Stop
mà chưa từng Start hoặc Reopen
```

Một khi Project đã từng Start hoặc Reopen (tức đã từng có ít nhất một Project Cycle), Project không thể bị xóa nữa dưới bất kỳ trạng thái nào sau đó — kể cả khi Project sau này quay lại `STOPPED` hoặc `COMPLETED`.

Delete trong Projects V1 là hard delete — Project bị xóa hoàn toàn khỏi hệ thống, không phải soft delete hay archive.

Vì delete chỉ hợp lệ khi chưa từng có Project Cycle nào, việc xóa Project không bao giờ làm mất bất kỳ lifecycle history có ý nghĩa nào.

### Traceability

```text
UN-PRJ-005 — Remove a Project Created by Mistake
V1 Scope — SC-PRJ-007
BR-PRJ-023 — Project Cycle Begins on ACTIVE
```

---

# 9. Business Rules

## BR-PRJ-001 — Initial Project State

Project mới được tạo phải có lifecycle state:

```text
NOT_STARTED
```

Việc tạo Project không đồng nghĩa với việc execution đã bắt đầu.

Project mới chưa có Project Cycle.

---

## BR-PRJ-002 — Explicit Lifecycle Transition

Lifecycle state của Project chỉ được thay đổi thông qua một trong các lifecycle action được xác định:

```text
Start
Pause
Resume
Stop
Complete
Reopen
```

Không có lifecycle action nào khác được phép thay đổi state.

Việc chỉnh sửa general Project information không được ngầm thay đổi lifecycle state.

Việc cập nhật Intended Outcome không được ngầm thay đổi lifecycle state.

---

## BR-PRJ-003 — Start Eligibility

Chỉ Project đang ở trạng thái:

```text
NOT_STARTED
```

mới có thể được start.

Valid transition:

```text
NOT_STARTED → ACTIVE
```

Start bắt đầu Project Cycle đầu tiên.

---

## BR-PRJ-004 — Pause Eligibility

Chỉ Project đang ở trạng thái:

```text
ACTIVE
```

mới có thể được pause.

Valid transition:

```text
ACTIVE → PAUSED
```

---

## BR-PRJ-005 — Resume Eligibility

Chỉ Project đang ở trạng thái:

```text
PAUSED
```

mới có thể được resume.

Valid transition:

```text
PAUSED → ACTIVE
```

---

## BR-PRJ-006 — Stop Eligibility

Project chỉ có thể được stop khi current state là:

```text
NOT_STARTED
ACTIVE
PAUSED
```

Valid transitions:

```text
NOT_STARTED → STOPPED
ACTIVE      → STOPPED
PAUSED      → STOPPED
```

---

## BR-PRJ-007 — Stop Semantics

`STOPPED` biểu thị người dùng đã quyết định ngưng theo đuổi Project mà không tuyên bố Project đã hoàn thành.

Nếu Project đang có current Project Cycle:

```text
STOPPED
```

kết thúc Cycle đó.

Nếu Project chưa từng được Start:

```text
NOT_STARTED → STOPPED
```

không có Project Cycle nào được tạo.

`STOPPED` không được xem là tương đương với `COMPLETED`.

---

## BR-PRJ-008 — Stop Reason Not Required in V1

Projects V1 không yêu cầu người dùng cung cấp reason khi stop một Project.

~~Stop reason chỉ nên được bổ sung trong tương lai nếu xuất hiện User Need được xác nhận.~~

**(Đã điều chỉnh — V1.1, xem BR-PRJ-034)** Phần "không yêu cầu" vẫn giữ nguyên: Stop không bao giờ bắt buộc có lý do. User Need đã được xác nhận qua sử dụng thực tế — người dùng giờ **có thể** ghi `closingNote` tự do (tùy chọn) khi Stop hoặc Complete. Đây không phải structured stop reason (không có danh sách lý do định sẵn).

---

## BR-PRJ-009 — Completion Eligibility

Project chỉ có thể được complete khi current state là:

```text
ACTIVE
PAUSED
```

Valid transitions:

```text
ACTIVE → COMPLETED
PAUSED → COMPLETED
```

---

## BR-PRJ-010 — Completion Semantics

`COMPLETED` biểu thị người dùng đã quyết định rằng current Project Cycle có thể được xem là hoàn thành.

Nếu intended outcome đã được xác định, completion có thể phản ánh judgment của người dùng rằng outcome đó đã đạt được hoặc Cycle đã đạt đến điểm mà họ xem là hoàn thành.

Hệ thống không tự quyết định completion thay cho người dùng.

---

## BR-PRJ-011 — Paused Project May Be Completed

Project không bắt buộc phải quay lại `ACTIVE` trước khi được complete.

Transition sau là hợp lệ:

```text
PAUSED → COMPLETED
```

Completion vẫn là explicit user decision.

---

## BR-PRJ-012 — Pause Preserves Current Cycle

Transition:

```text
ACTIVE → PAUSED
```

không kết thúc current Project Cycle.

---

## BR-PRJ-013 — Resume Preserves Current Cycle

Transition:

```text
PAUSED → ACTIVE
```

tiếp tục cùng Project Cycle.

Resume không được tạo Cycle mới.

---

## BR-PRJ-014 — Stop Ends Current Cycle When One Exists

Khi Project đang có current Project Cycle và chuyển sang:

```text
STOPPED
```

current Project Cycle kết thúc.

Transition:

```text
NOT_STARTED → STOPPED
```

không áp dụng rule này vì Project chưa có current Cycle.

---

## BR-PRJ-015 — Completion Ends Current Cycle

Khi Project chuyển sang:

```text
COMPLETED
```

current Project Cycle kết thúc.

---

## BR-PRJ-016 — Reopen Eligibility

Chỉ Project đang ở:

```text
STOPPED
COMPLETED
```

mới có thể được reopen.

---

## BR-PRJ-017 — Reopen Starts New Cycle

Khi Project được reopen, một Project Cycle mới phải bắt đầu và Project chuyển sang:

```text
ACTIVE
```

Nếu Project đã có historical Cycles:

```text
Cycle N
STOPPED / COMPLETED
        ↓
      Reopen
        ↓
Cycle N + 1
ACTIVE
```

Nếu Project chưa từng có Cycle:

```text
NOT_STARTED
    ↓
  STOPPED
    ↓
  Reopen
    ↓
Cycle 1
ACTIVE
```

Project Cycle mới không tự động kế thừa intended outcome của Cycle trước.

Intended outcome của Cycle mới ban đầu có thể chưa được xác định.

---

## BR-PRJ-018 — Reopen Preserves Project Identity

Reopen một Project không được tạo Project identity mới.

```text
Same Project
    │
    ├── Cycle 1
    ├── Cycle 2
    └── Cycle N
```

Project tiếp tục được xem là cùng một effort xuyên suốt các Cycle.

---

## BR-PRJ-019 — Historical Cycles Must Be Preserved

Việc bắt đầu Project Cycle mới không được xóa, thay đổi hoặc rewrite lifecycle history thuộc về các Cycle trước.

Historical fact phải tiếp tục phản ánh những gì thực sự đã xảy ra.

---

## BR-PRJ-020 — Single Current Cycle

Một Project chỉ được có tối đa một current/open Project Cycle tại một thời điểm.

Hợp lệ:

```text
Cycle 1 → Closed
Cycle 2 → Closed
Cycle 3 → Current
```

Không hợp lệ:

```text
Cycle 2 → Current
Cycle 3 → Current
```

Project ở `NOT_STARTED` hoặc Project đã kết thúc Cycle nhưng chưa được reopen có thể không có current Cycle.

---

## BR-PRJ-021 — Cycle-Ending Lifecycle States

`COMPLETED` luôn kết thúc current Project Cycle.

`STOPPED` kết thúc current Project Cycle nếu một Cycle đang tồn tại.

Hai state này không permanently terminate Project identity.

Do đó Project ở:

```text
STOPPED
COMPLETED
```

vẫn có thể được reopen trong tương lai.

---

## BR-PRJ-022 — NOT_STARTED Does Not Imply Planning

`NOT_STARTED` chỉ biểu thị execution của Project chưa bắt đầu.

State này không được ngụ ý rằng:

- một Plan đã tồn tại;
- planning đã hoàn tất;
- Task đã được xác định;
- Milestone đã tồn tại;
- execution date đã được schedule.

---

## BR-PRJ-023 — Project Cycle Begins on ACTIVE

Project Cycle chỉ bắt đầu khi Project bước vào `ACTIVE` thông qua:

```text
Start
```

hoặc:

```text
Reopen
```

Việc tạo Project và đặt Project ở `NOT_STARTED` không bắt đầu Project Cycle.

Do đó:

```text
Project Created
      ↓
NOT_STARTED
```

có:

```text
Project identity → exists
Current Cycle    → none
```

---

## BR-PRJ-024 — Intended Outcome Belongs to Project Cycle

`Intended Outcome` thuộc về Project Cycle, không thuộc cố định vào Project identity.

Các Project Cycle khác nhau của cùng một Project có thể có intended outcome khác nhau.

Ví dụ:

```text
Project: Magnum Opus

Cycle 1
Outcome:
Có Reflection baseline đủ dùng

Cycle 2
Outcome:
Có Crucible / Projects V1 đủ dùng

Cycle 3
Outcome:
Có historical analytics đủ hữu ích để reflection
```

---

## BR-PRJ-025 — Intended Outcome Is Optional

Project Cycle không bắt buộc phải có intended outcome.

Việc chưa xác định intended outcome không ngăn:

```text
Start
Resume
Complete
```

hoặc việc tiếp tục current Project Cycle.

Người dùng có thể bắt đầu một Cycle trước khi biết rõ outcome của Cycle đó.

---

## BR-PRJ-026 — Intended Outcome May Be Updated While Cycle Is Open

Người dùng có thể xác định hoặc cập nhật intended outcome khi current Project Cycle đang mở.

Trong Projects V1, các state có open Cycle gồm:

```text
ACTIVE
PAUSED
```

Việc cập nhật intended outcome:

- không tạo Project Cycle mới;
- không kết thúc current Cycle;
- không thay đổi Project lifecycle state.

**(Đã điều chỉnh — V1.1, xem BR-PRJ-032)** "Cập nhật" giờ có nghĩa là **thêm entry mới** vào lịch sử outcome của Cycle, không còn là ghi đè giá trị trước đó. Eligibility (chỉ khi `ACTIVE`/`PAUSED`) giữ nguyên.

---

## BR-PRJ-027 — Closed Cycle Outcome Is Immutable

Khi Project Cycle kết thúc bằng:

```text
STOPPED
COMPLETED
```

intended outcome cuối cùng của Cycle được preserve như historical context.

Intended outcome của closed Cycle không được chỉnh sửa.

**(Mở rộng — V1.1, xem BR-PRJ-033)** Rule này vẫn đúng nguyên vẹn, chỉ mở rộng phạm vi: không chỉ outcome cuối cùng mà **toàn bộ lịch sử outcome** của Cycle trở thành bất biến khi Cycle đóng. Tương tự cho `closingNote` (BR-PRJ-035) và `targetEndAt` (BR-PRJ-036).

Nếu người dùng tiếp tục theo đuổi Project:

```text
Reopen
    ↓
New Cycle
```

Cycle mới có intended outcome riêng.

---

## BR-PRJ-028 — Completion Is User-Decided

Việc xác định current Project Cycle đã hoàn thành thuộc về người dùng.

Hệ thống không tự động:

- đánh giá outcome;
- xác minh outcome;
- yêu cầu proof;
- auto-complete;
- dùng AI để quyết định completion.

Current Project Cycle không bắt buộc phải có intended outcome để được chuyển sang `COMPLETED`.

Khi người dùng thực hiện một valid Complete action, hệ thống:

```text
records explicit user decision
        ↓
Project → COMPLETED
        ↓
Current Cycle → Closed
        ↓
Lifecycle History → Preserved
```

---

## BR-PRJ-029 — Delete Eligibility

Chỉ Project chưa từng có bất kỳ Project Cycle nào — current lẫn historical — mới có thể bị xóa vĩnh viễn.

```text
Eligible for delete
⟺
cycles.length == 0
```

Đây không phải một điều kiện theo lifecycle state. Nó là điều kiện theo việc Project đã từng có Project Cycle hay chưa.

Vì `ACTIVE` và `PAUSED` luôn có current Cycle (theo BR-PRJ-023), và `STOPPED`/`COMPLETED` đạt được sau khi đã từng Start hoặc Reopen luôn có ít nhất một historical Cycle, điều kiện `cycles.length == 0` trong thực tế chỉ đúng khi:

```text
state == NOT_STARTED

hoặc

state == STOPPED, đạt được từ NOT_STARTED → Stop
mà Project chưa từng Start hoặc Reopen
```

Một Project `STOPPED` hoặc `COMPLETED` đã từng có Project Cycle — dù chỉ một lần — không bao giờ đủ điều kiện xóa.

---

## BR-PRJ-030 — Delete Is Irreversible

Delete trong Projects V1 là hard delete.

Sau khi Project bị xóa, Project và mọi dữ liệu liên quan không thể được khôi phục.

Không có Reopen, Restore hoặc Undo cho một Project đã bị xóa.

---

## BR-PRJ-031 — Delete Requires No Lifecycle History

Vì Delete chỉ hợp lệ khi `cycles.length == 0` (BR-PRJ-029), một Project đủ điều kiện xóa không bao giờ có lifecycle history có ý nghĩa nào để mất — dù Project đó đang `NOT_STARTED` hay `STOPPED` mà chưa từng Start.

---

> Các Business Rule từ BR-PRJ-032 trở đi được bổ sung trong **V1.1 Revision — Cycle Flexibility** (Lifecycle Analysis §21).

## BR-PRJ-032 — Intended Outcome Is an Append-Only History

Intended outcome của một Project Cycle là một chuỗi entry có thứ tự thời gian, không phải một giá trị đơn lẻ.

Mỗi lần người dùng xác định hoặc cập nhật intended outcome trong Cycle đang mở, hệ thống thêm một entry mới gồm:

```text
text   → nội dung outcome
setAt  → thời điểm entry được tạo
```

Thứ tự của lịch sử là **thứ tự entry được thêm vào**, không suy ra từ `setAt` — hai entry có cùng `setAt` vẫn có thứ tự xác định.

"Intended outcome hiện tại" của Cycle là entry được thêm vào sau cùng.

Cycle chưa có entry nào tương đương với Cycle chưa có intended outcome (BR-PRJ-025 vẫn đúng).

Việc set lại đúng nội dung giống hệt entry gần nhất không tạo entry mới.

---

## BR-PRJ-033 — Outcome History Entries Are Never Rewritten

Không có thao tác nào được sửa hoặc xóa một entry đã tồn tại trong lịch sử outcome — kể cả khi Cycle vẫn đang mở.

Cách duy nhất để "đổi" outcome là thêm entry mới.

Khi Cycle đóng, toàn bộ lịch sử outcome của Cycle trở thành bất biến — không được thêm entry mới.

Rule này là sự mở rộng trực tiếp của nguyên tắc LP-PRJ-002/003 (historical transitions are meaningful, không rewrite history) sang intended outcome.

---

## BR-PRJ-034 — Closing Note Is Optional Context

Khi Stop hoặc Complete làm đóng current Project Cycle, người dùng **có thể** cung cấp `closingNote` dạng text tự do.

`closingNote` không bao giờ bắt buộc. Thiếu `closingNote` không ảnh hưởng tính hợp lệ của Stop hoặc Complete.

`closingNote` được trim; chuỗi rỗng sau khi trim được coi là không có note. Độ dài tối đa sau trim là 2000 ký tự — vượt quá thì action bị từ chối.

`closingNote` không phải phân loại có cấu trúc: không có danh sách lý do định sẵn, `endReason` vẫn chỉ nhận `STOPPED` | `COMPLETED`.

`NOT_STARTED → STOPPED` không đóng Cycle nào, nên không nhận `closingNote`.

---

## BR-PRJ-035 — Closing Note Is Set Once, at Closing Time

`closingNote` chỉ được ghi nhận trong chính action Stop/Complete đóng Cycle.

Không có action riêng nào để thêm hoặc sửa `closingNote` sau khi Cycle đã đóng.

Nếu người dùng muốn bổ sung suy ngẫm sau này, nơi phù hợp là Reflection (Journal), không phải sửa lại historical record của Cycle.

---

## BR-PRJ-036 — Target End Date Is Optional and Editable Only While Cycle Is Open

`targetEndAt` của Project Cycle là tùy chọn.

`targetEndAt` có thể được set, update hoặc clear khi current Cycle đang mở (`ACTIVE` / `PAUSED`).

Không lưu lịch sử thay đổi của `targetEndAt` — chỉ giá trị hiện tại có ý nghĩa.

Khi Cycle đóng, giá trị `targetEndAt` cuối cùng được preserve như historical context và trở thành bất biến.

`targetEndAt` có thể nằm trong quá khứ tại thời điểm được set — hệ thống không chặn (người dùng có thể ghi nhận một mốc đã lỡ).

---

## BR-PRJ-037 — Target End Date Never Drives Lifecycle

`targetEndAt` không bao giờ:

- kích hoạt bất kỳ lifecycle transition nào;
- tự động đóng Cycle;
- chặn hoặc giới hạn bất kỳ lifecycle action nào;
- ảnh hưởng tới Delete eligibility.

Việc `targetEndAt` đã qua chỉ được phép dùng cho tín hiệu presentation (nhắc nhở), nhất quán với BR-PRJ-002 (lifecycle state chỉ đổi qua explicit user action) và BR-PRJ-028 (completion is user-decided).

---

# 10. Valid State Transition Matrix

| Current State | Start | Pause | Resume | Stop | Complete | Reopen |
| ------------- | ----- | ----- | ------ | ---- | -------- | ------ |
| `NOT_STARTED` | ✓     | —     | —      | ✓    | —        | —      |
| `ACTIVE`      | —     | ✓     | —      | ✓    | ✓        | —      |
| `PAUSED`      | —     | —     | ✓      | ✓    | ✓        | —      |
| `STOPPED`     | —     | —     | —      | —    | —        | ✓      |
| `COMPLETED`   | —     | —     | —      | —    | —        | ✓      |

Tổng hợp:

```text
NOT_STARTED
├── Start    → ACTIVE + Cycle 1
└── Stop     → STOPPED + No Cycle

ACTIVE
├── Pause    → PAUSED
├── Stop     → STOPPED + Close Current Cycle
└── Complete → COMPLETED + Close Current Cycle

PAUSED
├── Resume   → ACTIVE
├── Stop     → STOPPED + Close Current Cycle
└── Complete → COMPLETED + Close Current Cycle

STOPPED
└── Reopen   → ACTIVE + New Cycle

COMPLETED
└── Reopen   → ACTIVE + New Cycle
```

---

# 11. Functional Requirement Traceability

| Requirement                                          | Primary Source                   |
| ---------------------------------------------------- | -------------------------------- |
| `FR-PRJ-001` — Create Project                        | `UN-PRJ-001`, `UN-PRJ-002`       |
| `FR-PRJ-002` — View Projects                         | `UN-PRJ-001`, `UN-PRJ-004`       |
| `FR-PRJ-003` — View Project Details                  | `UN-PRJ-002`, `UN-PRJ-003`       |
| `FR-PRJ-004` — Update Project Information            | `UN-PRJ-002`                     |
| `FR-PRJ-005` — Start Project                         | `UN-PRJ-003`                     |
| `FR-PRJ-006` — Pause Project                         | `UN-PRJ-003`                     |
| `FR-PRJ-007` — Resume Project                        | `UN-PRJ-003`                     |
| `FR-PRJ-008` — Stop Project                          | `UN-PRJ-003`                     |
| `FR-PRJ-009` — Complete Project                      | `UN-PRJ-003`                     |
| `FR-PRJ-010` — Reopen Project                        | `UN-PRJ-003`, `UN-PRJ-004`       |
| `FR-PRJ-011` — Manage Current Cycle Intended Outcome | `UN-PRJ-002`, Lifecycle Analysis |
| `FR-PRJ-012` — Preserve Lifecycle History            | `UN-PRJ-003`, `UN-PRJ-004`       |
| `FR-PRJ-013` — Preserve Project Cycles               | `UN-PRJ-004`, Lifecycle Analysis |
| `FR-PRJ-014` — Delete Project                        | `UN-PRJ-005`                     |
| `FR-PRJ-015` — Capture Closing Note (V1.1)           | `UN-PRJ-002`, `UN-PRJ-004`       |
| `FR-PRJ-016` — Set Target End Date (V1.1)            | `UN-PRJ-003`                     |
| `FR-PRJ-017` — View Closed Cycle History (V1.1)      | `UN-PRJ-004`                     |

---

# 12. Out of Scope

Các capability sau không thuộc Functional Requirements của Projects V1:

- Task management;
- Milestone management;
- Project planning;
- scheduled start;
- scheduled resume;
- automatic state transition;
- ~~stop reason;~~ **Đã điều chỉnh (V1.1)** — `closingNote` tự do, tùy chọn (FR-PRJ-015). Structured stop reason (danh sách lý do) vẫn out of scope;
- pause reason;
- ~~completion note;~~ **Đã điều chỉnh (V1.1)** — gộp chung vào `closingNote` (FR-PRJ-015);
- reopen reason;
- ~~intended outcome revision history;~~ **Đã điều chỉnh (V1.1)** — xem BR-PRJ-032/033;
- ~~Project lifecycle history UI / timeline view~~ **Đã điều chỉnh một phần (V1.1)** — lịch sử ở mức Cycle giờ có màn hình riêng (FR-PRJ-017); timeline chi tiết từng transition Pause/Resume vẫn out of scope;
- deadline bắt buộc / auto-close theo thời hạn — `targetEndAt` (FR-PRJ-016) chỉ mang tính thông tin, xem BR-PRJ-037;
- GitHub synchronization;
- WakaTime synchronization;
- commit tracking;
- pull request tracking;
- issue tracking;
- coding time analytics;
- productivity scoring;
- Project health scoring;
- AI-generated Project state;
- AI-generated completion decision;
- automatic outcome detection.

External integration không được tự quyết định Project lifecycle state trong V1.

Lifecycle action trong V1 được thực hiện thông qua explicit user action.

---

# 13. Requirement Gaps / Open Analysis

## 13.1. Lifecycle History và Cycle Presentation

~~V1 preserve lifecycle history nhưng không yêu cầu dedicated history UI. Visualization được defer khỏi V1. Xem Out of Scope.~~ **(Đã điều chỉnh — V1.1)** Lịch sử ở mức Cycle có màn hình riêng (FR-PRJ-017); timeline mức transition vẫn defer.

Tuy nhiên vẫn cần xác định những gì được hiển thị trong Project Detail ở V1:

- current Cycle được trình bày như thế nào — vẫn mở (thuộc Product Design);
- ~~Cycle numbering có cần visible cho người dùng hay không;~~ **Đã chốt (V1.1)** — có, FR-PRJ-017;
- ~~người dùng có cần thấy `Cycle 1`, `Cycle 2`, `Cycle 3` hay không;~~ **Đã chốt (V1.1)** — có, trong lịch sử Cycle;
- ~~closed Cycle cần expose những information nào nếu có.~~ **Đã chốt (V1.1)** — số Cycle, thời điểm bắt đầu/kết thúc, `endReason`, toàn bộ lịch sử outcome, `closingNote`, `targetEndAt` (FR-PRJ-017).

Điểm cần giữ rõ:

```text
Preservation requirement
        ≠
Presentation requirement
```

---

## 13.2. Timestamps

Các timestamp sau đã được chốt là bắt buộc trong V1 vì chúng có business meaning trực tiếp đối với lifecycle history:

```text
created time     → thời điểm Project được tạo
started time     → thời điểm Cycle 1 bắt đầu
stopped time     → thời điểm Cycle kết thúc bằng STOPPED
completed time   → thời điểm Cycle kết thúc bằng COMPLETED
reopened time    → thời điểm Cycle mới bắt đầu
```

Các timestamp sau có thể hữu ích nhưng chưa được chốt là bắt buộc trong V1:

```text
paused time      → thời điểm Project chuyển sang PAUSED
resumed time     → thời điểm Project chuyển sang ACTIVE từ PAUSED
```

Quyết định về paused time và resumed time sẽ được xác định trong Domain Analysis khi technical representation của lifecycle history được quyết định.

---

## 13.3. Archive

Delete đã được baseline: xem `FR-PRJ-014`, `BR-PRJ-029`, `BR-PRJ-030`, `BR-PRJ-031`.

Archive vẫn cần tiếp tục phân tích:

- Archive có cần tồn tại như visibility/storage behavior hay không;
- Archive có cần độc lập với lifecycle state hay không.

Ở thời điểm hiện tại:

```text
ARCHIVED
```

không được xem là Project lifecycle state.

---

# 14. Analysis Notes

## 14.1. Functional Requirement Is Not a State Machine Rule

Ví dụ:

```text
FR-PRJ-006

Hệ thống phải cho phép người dùng pause một Project.
```

chưa đủ để xác định behavior hoàn chỉnh.

Business Rule tương ứng giới hạn behavior:

```text
BR-PRJ-004

Chỉ Project đang ACTIVE mới có thể được pause.
```

Do đó:

```text
Capability
    +
Constraint
    ↓
Expected Behavior
```

---

## 14.2. Lifecycle Behavior Is Not Generic Update

Project lifecycle được biểu diễn thông qua các behavior có business meaning:

```text
Start
Pause
Resume
Stop
Complete
Reopen
```

thay vì một generic operation:

```text
Set Project Status
```

Mỗi lifecycle action đại diện cho một quyết định khác nhau của người dùng và có semantics khác nhau.

Ví dụ:

```text
Start
→ execution begins
→ Cycle begins

Pause
→ temporary interruption
→ intention vẫn tồn tại
→ same Cycle

Resume
→ execution continues
→ same Cycle

Stop
→ pursuit hiện tại kết thúc
→ user không declare completion
→ current Cycle closes if one exists

Complete
→ user declares current Cycle complete
→ Cycle closes

Reopen
→ pursuit bắt đầu lại
→ new Cycle
```

Điều này mô tả product/domain semantics.

Nó chưa bắt buộc implementation phải sử dụng:

- command riêng;
- endpoint riêng;
- aggregate method riêng;
- CQRS;
- domain event.

Các quyết định đó thuộc Domain Analysis và Technical Design.

---

## 14.3. Current State Is Not Historical Truth

Ví dụ:

```text
Current State:
ACTIVE
```

không có nghĩa Project luôn luôn ở trạng thái `ACTIVE`.

Lifecycle thực tế có thể là:

```text
Project Created
    ↓
NOT_STARTED
    ↓
Start

Cycle 1
ACTIVE
   ↓
PAUSED
   ↓
ACTIVE
   ↓
COMPLETED

Reopen

Cycle 2
ACTIVE
```

Do đó hệ thống cần phân biệt:

```text
Current Reality
       vs
Historical Record
```

`NOT_STARTED` trước lần Start đầu tiên không thuộc Cycle 1.

---

## 14.4. Project Cycle Is a Business Concept

Project Cycle được xác định vì business behavior yêu cầu phân biệt các vòng theo đuổi khác nhau của cùng một Project.

Project Cycle:

```text
begins
→ khi Project bước vào ACTIVE thông qua Start hoặc Reopen

remains open
→ ACTIVE
→ PAUSED

ends
→ STOPPED
→ COMPLETED
```

Tài liệu này không quyết định Cycle phải trở thành:

- Entity;
- Aggregate;
- database table;
- event stream;
- lifecycle record;
- derived model.

Technical representation phải được quyết định sau khi domain semantics và requirements đã đủ rõ.

---

## 14.5. Intended Outcome Is Context of a Cycle

`Intended Outcome` không định nghĩa Project identity.

Project giữ continuity xuyên thời gian.

Project Cycle giữ intention trong một lần theo đuổi cụ thể.

```text
Project
= What am I pursuing over time?

Project Cycle
= What am I trying to achieve in this pursuit period?
```

Một Cycle có thể bắt đầu khi intended outcome chưa được xác định rõ.

Outcome có thể được làm rõ trong quá trình Cycle diễn ra.

---

## 14.6. Outcome Update Is Not a New Cycle

Việc cập nhật intended outcome trong open Cycle không tự động biểu thị rằng một pursuit period mới đã bắt đầu.

Ví dụ:

```text
Cycle 1

Outcome:
"Build Projects"

        ↓ refine

Outcome:
"Build Projects V1 đủ dùng hằng ngày"
```

vẫn là cùng một Cycle.

Nếu người dùng xem direction mới là một pursuit period khác, user có thể quyết định kết thúc current Cycle và reopen Project để bắt đầu Cycle mới.

System không tự động quyết định boundary này.

---

# 15. Candidate Use Cases

Dựa trên Functional Requirements hiện tại, các Use Case candidate cho phase tiếp theo gồm:

```text
UC-PRJ-001 — Create Project
UC-PRJ-002 — View Projects
UC-PRJ-003 — View Project Details
UC-PRJ-004 — Update Project

UC-PRJ-005 — Start Project
UC-PRJ-006 — Pause Project
UC-PRJ-007 — Resume Project
UC-PRJ-008 — Stop Project
UC-PRJ-009 — Complete Project
UC-PRJ-010 — Reopen Project

UC-PRJ-011 — Manage Current Cycle Intended Outcome

UC-PRJ-012 — Delete Project

UC-PRJ-013 — Set Current Cycle Target End Date      (V1.1)
UC-PRJ-014 — View Closed Cycle History               (V1.1)
```

Closing note (FR-PRJ-015) không có Use Case riêng — nó là một optional input của UC-PRJ-008 (Stop) và UC-PRJ-009 (Complete).

`UC-PRJ-011` bao gồm hai flow:

```text
Main Flow
→ Cycle đang mở, chưa có outcome
→ người dùng define outcome lần đầu

Alternative Flow
→ Cycle đang mở, đã có outcome
→ người dùng update outcome
```

`Preserve Lifecycle History` và `Preserve Project Cycles` không tạo thành standalone Use Case trong V1.

FR-PRJ-012 và FR-PRJ-013 được verify thông qua postcondition của các lifecycle Use Case.

~~Dedicated lifecycle history view được defer khỏi V1. Use Case tương ứng sẽ được bổ sung trong version sau khi có user need thực tế.~~ **(Đã điều chỉnh — V1.1)** User need đã xác nhận qua dùng thật; history ở mức Cycle có Use Case riêng là UC-PRJ-014. Timeline mức transition vẫn chưa có Use Case.

---

# 16. Current V1 Requirement Baseline

Ở thời điểm hiện tại, Projects V1 yêu cầu behavior:

```text
Create Project
      ↓
NOT_STARTED
      │
      ├── Stop ────────────────────→ STOPPED
      │                               │
      │                             Reopen
      │                               │
      │                               ▼
      │                            Cycle 1
      │                               │
      │                               ▼
      │                             ACTIVE
      │
      └── Start
            │
            ▼
         Cycle 1
            │
            ▼
          ACTIVE
            │
            ├── Pause ─────────────→ PAUSED
            │                         │
            │                         ├── Resume ──────→ ACTIVE
            │                         │
            │                         ├── Stop ────────→ STOPPED
            │                         │                    │
            │                         │                  Reopen
            │                         │                    │
            │                         │                    ▼
            │                         │                New Cycle
            │                         │                    │
            │                         │                    ▼
            │                         │                  ACTIVE
            │                         │
            │                         └── Complete ────→ COMPLETED
            │                                              │
            │                                            Reopen
            │                                              │
            │                                              ▼
            │                                          New Cycle
            │                                              │
            │                                              ▼
            │                                            ACTIVE
            │
            ├── Stop ──────────────→ STOPPED
            │                         │
            │                       Reopen
            │                         │
            │                         ▼
            │                     New Cycle
            │                         │
            │                         ▼
            │                       ACTIVE
            │
            └── Complete ──────────→ COMPLETED
                                      │
                                    Reopen
                                      │
                                      ▼
                                  New Cycle
                                      │
                                      ▼
                                    ACTIVE
```

Trong một open Cycle:

```text
ACTIVE / PAUSED
      │
      ├── Intended Outcome History        (V1.1: append-only)
      │       │
      │       ├── optional
      │       ├── can be defined later
      │       └── each update = new entry, never overwrite
      │
      └── Target End Date                 (V1.1)
              │
              ├── optional
              ├── set / update / clear
              └── informational only
```

Khi Cycle đóng:

```text
STOPPED / COMPLETED  (+ optional closingNote, V1.1)
        ↓
Full Outcome History + closingNote + targetEndAt
        ↓
Preserved as Immutable Historical Context
        ↓
Visible in Closed Cycle History (FR-PRJ-017)
```

Trong toàn bộ lifecycle này, hệ thống phải preserve:

```text
Project Identity
       +
Current State
       +
Lifecycle History
       +
Project Cycle Boundaries
       +
Closed Cycle Context
```

---

# 17. Current Requirement Baseline Summary

Projects V1 hiện có:

```text
17 Functional Requirements

FR-PRJ-001 → FR-PRJ-014   (V1 baseline)
FR-PRJ-015 → FR-PRJ-017   (V1.1 — Cycle Flexibility)
```

bao phủ:

```text
Project Representation
Project Lifecycle
Project Cycle Intended Outcome
Lifecycle History
Project Cycles
Deletion
```

và:

```text
37 Business Rules

BR-PRJ-001 → BR-PRJ-031   (V1 baseline — BR-PRJ-008/026/027 có ghi chú điều chỉnh V1.1)
BR-PRJ-032 → BR-PRJ-037   (V1.1 — Cycle Flexibility)
```

xác định:

- initial state;
- transition eligibility;
- state semantics;
- Cycle start boundary;
- Cycle end boundary;
- reopen behavior;
- Project identity preservation;
- lifecycle history preservation;
- intended outcome ownership;
- intended outcome mutability;
- completion authority;
- deletion eligibility.

Các requirement chưa được mở rộng sang capability ngoài V1 scope.

---

# 18. Next Step

Phase phân tích tiếp theo là:

**Projects V1 — Use Cases & Acceptance Criteria**

Mục tiêu của phase này là kiểm tra Functional Requirements và Business Rules thông qua những interaction cụ thể giữa user và system.

Ví dụ:

```text
FR-PRJ-006
Pause Project
      ↓
UC-PRJ-006
User pauses an ACTIVE Project
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

Use Case analysis cũng là nơi các Requirement Gap hiện tại có thể tiếp tục được phát hiện.

Expected progression:

```text
01. BA Overview
        ↓
02. Lifecycle & Behavior Analysis
        ↓
03. Functional Requirements & Business Rules
        ↓
04. Use Cases & Acceptance Criteria
        ↓
05. Product Specification
        ↓
──────────── BA Boundary ────────────
        ↓
Domain Analysis
        ↓
Technical Design
        ↓
Implementation
        ↓
Verification
```

Không bắt đầu Domain Model, API hoặc database design trước khi những behavior cần thiết của V1 đã đủ rõ để specification.
