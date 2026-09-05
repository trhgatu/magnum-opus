# Projects V1 — Lifecycle & Behavior Analysis

> **Status:** Analysis / Candidate Baseline
>
> **Domain:** Crucible / Projects
>
> **Purpose:** Phân tích lifecycle, state semantics, transition behavior và Project Cycle của Projects V1 trước khi baseline Functional Requirements, Business Rules và Product Specification.

---

## 1. Related Documentation

### BA Overview

`product/ba/crucible/projects-ba-overview.md`

BA Overview xác định problem, user needs, product objective, desired outcomes, V1 scope và product/domain intent của Projects.

### Lifecycle & Behavior Analysis

Tài liệu này tiếp tục quá trình BA analysis bằng cách tập trung vào:

- Project lifecycle
- Project states
- State semantics
- State transitions
- Project Cycle
- Reopen behavior
- Lifecycle history
- Business Rule Candidates
- Open Questions

Tài liệu này chưa phải Product Specification.

Các behavior được xác định tại đây sẽ trở thành input cho:

```text
Lifecycle Discovery
        ↓
Lifecycle Baseline
        ↓
Functional Requirements
        ↓
Business Rules
        ↓
Use Cases / Acceptance Criteria
        ↓
Product Specification
        ↓
Domain Modeling
        ↓
Implementation
```

---

## 2. Analysis Context

Project trong Crucible đại diện cho một deliberate effort mà người dùng chủ động lựa chọn theo đuổi nhằm tạo ra một intended outcome hoặc meaningful change.

Một Project không chỉ tồn tại tại thời điểm đang được thực hiện.

Trong thực tế, Project có thể:

- được ghi nhận trước khi bắt đầu;
- bắt đầu được thực hiện;
- tạm dừng;
- tiếp tục sau khi tạm dừng;
- bị ngưng trước khi đạt outcome;
- hoàn thành khi outcome đã đạt;
- hoặc được tiếp tục trở lại sau khi trước đó đã ngưng hoặc hoàn thành.

Do đó, Project cần có lifecycle đủ để biểu diễn những thay đổi này mà không làm mất historical context.

Lifecycle không chỉ cần trả lời:

> **Project hiện đang ở trạng thái nào?**

mà còn cần giữ được:

> **Project đã trải qua những giai đoạn nào để đi đến trạng thái hiện tại?**

---

## 3. Lifecycle Principles

Project lifecycle được phân tích dựa trên các nguyên tắc sau.

### LP-PRJ-001 — State Represents Current Reality

State của Project phải mô tả trạng thái thực tế hiện tại của effort.

State không nên ngụ ý một capability hoặc behavior chưa thực sự tồn tại.

Ví dụ, một Project mới được tạo nhưng chưa bắt đầu không nên mặc định được xem là `ACTIVE`.

Tương tự, `PLANNED` không phù hợp nếu hệ thống chưa xác định rằng một plan thực sự tồn tại.

### LP-PRJ-002 — Historical Transitions Are Meaningful

Việc Project từng:

- bắt đầu;
- tạm dừng;
- tiếp tục;
- ngưng;
- hoàn thành;
- hoặc được mở lại

là một phần có ý nghĩa của historical record.

Current state không được thay thế hoàn toàn lifecycle history.

### LP-PRJ-003 — Reopen Must Not Rewrite History

Nếu một Project đã `STOPPED` hoặc `COMPLETED` được tiếp tục trở lại, trạng thái trước đó vẫn phải được giữ lại như một sự kiện đã thực sự xảy ra.

Ví dụ:

```text
ACTIVE
   ↓
STOPPED
   ↓
REOPEN
   ↓
ACTIVE
```

không có nghĩa Project chưa từng `STOPPED`.

### LP-PRJ-004 — Project Identity Persists Across Cycles

Một Project có thể được theo đuổi qua nhiều giai đoạn khác nhau nhưng vẫn giữ cùng một Project identity nếu người dùng xem đó là cùng một effort.

Việc reopen không tự động tạo một Project mới.

---

## 4. Project States

Projects V1 hiện xác định năm lifecycle states.

```text
NOT_STARTED
ACTIVE
PAUSED
STOPPED
COMPLETED
```

---

### 4.1. NOT_STARTED

`NOT_STARTED` biểu thị Project đã được ghi nhận trong Magnum Opus nhưng execution chưa bắt đầu.

Ví dụ:

```text
Project: Build Personal Portfolio

Status:
NOT_STARTED
```

Người dùng đã xác định đây là một Project mà họ muốn theo đuổi nhưng chưa bắt đầu thực hiện.

`NOT_STARTED` không có nghĩa Project đã được lên kế hoạch.

```text
NOT_STARTED
≠
PLANNED
```

State này chỉ xác nhận:

> Project tồn tại nhưng việc thực hiện chưa bắt đầu.

---

### 4.2. ACTIVE

`ACTIVE` biểu thị Project hiện đang được người dùng chủ động thực hiện.

```text
Project: Magnum Opus

Status:
ACTIVE
```

`ACTIVE` không yêu cầu người dùng phải thực hiện Project tại mọi thời điểm.

State này biểu thị Project đang nằm trong những effort hiện được người dùng chủ động theo đuổi.

---

### 4.3. PAUSED

`PAUSED` biểu thị Project tạm thời không được thực hiện nhưng người dùng vẫn có intention tiếp tục Project trong tương lai.

```text
ACTIVE
   ↓
PAUSED
```

Điểm phân biệt quan trọng giữa `PAUSED` và `STOPPED` là intention.

```text
PAUSED

"Tạm thời không thực hiện,
nhưng vẫn có ý định tiếp tục."
```

`PAUSED` không kết thúc vòng theo đuổi hiện tại của Project.

Project có thể tiếp tục trở lại `ACTIVE` trong cùng một lifecycle cycle.

---

### 4.4. STOPPED

`STOPPED` biểu thị người dùng đã quyết định ngưng theo đuổi Project khi intended outcome chưa đạt được.

```text
ACTIVE
   ↓
STOPPED
```

hoặc:

```text
NOT_STARTED
   ↓
STOPPED
```

Điểm quan trọng của `STOPPED`:

```text
Intended outcome chưa đạt
        +
Người dùng không còn intention tiếp tục
```

`STOPPED` không đồng nghĩa với failure.

Một Project có thể được ngưng vì:

- không còn phù hợp;
- priority thay đổi;
- effort không còn đáng đầu tư;
- context thay đổi;
- hoặc bất kỳ lý do nào khác.

Projects V1 chưa yêu cầu lưu reason khi Project được `STOPPED`.

---

### 4.5. COMPLETED

`COMPLETED` biểu thị intended outcome của Project đã đạt được.

```text
ACTIVE
   ↓
COMPLETED
```

Ví dụ:

```text
Project:
Deliver Client Website

Intended Outcome:
Website được hoàn thành và bàn giao.

Outcome achieved
        ↓
COMPLETED
```

Điểm phân biệt giữa `STOPPED` và `COMPLETED` nằm ở outcome:

```text
                Project no longer active
                         │
               ┌─────────┴─────────┐
               ▼                   ▼
            STOPPED            COMPLETED

      Outcome chưa đạt       Outcome đã đạt
```

---

## 5. Initial State

Một Project mới được tạo có trạng thái:

```text
NOT_STARTED
```

Lý do:

Việc một Project được ghi nhận trong Magnum Opus không có nghĩa execution của Project đã bắt đầu.

```text
Project Created
      ↓
NOT_STARTED
```

Project chỉ chuyển sang `ACTIVE` khi người dùng thực sự bắt đầu theo đuổi Project.

---

## 6. State Transitions

Các transition hiện được xác định cho Projects V1:

| Current State | Action   | Next State |
| ------------- | -------- | ---------- |
| NOT_STARTED   | Start    | ACTIVE     |
| NOT_STARTED   | Stop     | STOPPED    |
| ACTIVE        | Pause    | PAUSED     |
| ACTIVE        | Stop     | STOPPED    |
| ACTIVE        | Complete | COMPLETED  |
| PAUSED        | Resume   | ACTIVE     |
| PAUSED        | Stop     | STOPPED    |
| PAUSED        | Complete | COMPLETED  |
| STOPPED       | Reopen   | ACTIVE     |
| COMPLETED     | Reopen   | ACTIVE     |

Tất cả transition đều là explicit user action. Không có transition tự động trong V1.

Correction behavior — ví dụ hoàn tác một transition vừa thực hiện — chưa được baseline trong V1. Nếu người dùng thực hiện transition nhầm, Reopen là cơ chế hiện có để tiếp tục theo đuổi Project. Xem thêm tại mục Assumptions và Open Analysis.

---

## 7. Transition Semantics

### 7.1. Start

`Start` biểu thị execution của một Project chưa bắt đầu chính thức được bắt đầu.

```text
NOT_STARTED
    ↓
  Start
    ↓
 ACTIVE
```

---

### 7.2. Pause

`Pause` biểu thị người dùng tạm thời ngừng thực hiện Project nhưng vẫn có intention quay lại.

```text
ACTIVE
   ↓
 Pause
   ↓
PAUSED
```

Pause không kết thúc current Project Cycle.

---

### 7.3. Resume

`Resume` biểu thị người dùng tiếp tục thực hiện một Project đang `PAUSED`.

```text
PAUSED
   ↓
 Resume
   ↓
ACTIVE
```

Resume tiếp tục **cùng Project Cycle**.

Nó không tạo Cycle mới.

---

### 7.4. Stop

`Stop` biểu thị người dùng quyết định ngưng theo đuổi Project trước khi intended outcome đạt được.

Có thể xảy ra từ:

```text
NOT_STARTED
     ↓
   STOPPED
```

hoặc:

```text
ACTIVE
   ↓
STOPPED
```

hoặc:

```text
PAUSED
   ↓
STOPPED
```

Stop kết thúc current Project Cycle.

`NOT_STARTED → STOPPED` là transition hợp lệ nhưng có semantic khác với `ACTIVE → STOPPED` hoặc `PAUSED → STOPPED`.

```text
ACTIVE / PAUSED → STOPPED
→ Người dùng đã bắt đầu theo đuổi và quyết định ngưng.

NOT_STARTED → STOPPED
→ Người dùng đã ghi nhận Project nhưng quyết định không bắt đầu.
```

Cả hai đều được biểu diễn bằng `STOPPED` trong V1. Sự khác biệt về semantic có thể được nhận biết thông qua lifecycle history — một Project `STOPPED` mà không có transition `Start` trước đó là Project chưa từng được bắt đầu. Đây là quyết định có ý thức cho V1.

---

### 7.5. Complete

`Complete` biểu thị intended outcome của Project đã đạt được.

Có thể xảy ra từ:

```text
ACTIVE
   ↓
COMPLETED
```

hoặc:

```text
PAUSED
   ↓
COMPLETED
```

`PAUSED → COMPLETED` là transition hợp lệ vì `PAUSED` chỉ biểu thị Project hiện không được thực hiện.

`PAUSED` không khẳng định intended outcome chưa đạt.

Do đó, hệ thống không yêu cầu một transition kỹ thuật:

```text
PAUSED
   ↓
ACTIVE
   ↓
COMPLETED
```

nếu reality thực tế là outcome đã đạt trong khi Project đang `PAUSED`.

Complete kết thúc current Project Cycle.

---

### 7.6. Reopen

`Reopen` biểu thị người dùng quyết định tiếp tục theo đuổi một Project đã từng `STOPPED` hoặc `COMPLETED`.

```text
STOPPED
   ↓
 Reopen
   ↓
ACTIVE
```

hoặc:

```text
COMPLETED
    ↓
  Reopen
    ↓
 ACTIVE
```

Reopen khác Resume.

```text
Resume
PAUSED → ACTIVE
Same Cycle

Reopen
STOPPED / COMPLETED → ACTIVE
New Cycle
```

Reopen không thay đổi hoặc xóa lifecycle history trước đó.

---

## 8. Project Cycle

### Definition

**Project Cycle** đại diện cho một vòng theo đuổi của cùng một Project.

Cycle đầu tiên bắt đầu khi Project được tạo.

```text
Project Created
      ↓
Cycle 1
      ↓
NOT_STARTED
```

Cycle tiếp tục trong khi Project chuyển giữa các non-cycle-ending states.

Ví dụ:

```text
Cycle 1

NOT_STARTED
    ↓
ACTIVE
    ↓
PAUSED
    ↓
ACTIVE
    ↓
PAUSED
    ↓
ACTIVE
```

Cycle kết thúc khi Project chuyển sang:

```text
STOPPED

hoặc

COMPLETED
```

Nếu Project sau đó được reopen, một Cycle mới bắt đầu.

### Cycle Asymmetry

Cycle 1 và các Cycle tiếp theo có điểm bắt đầu khác nhau.

```text
Cycle 1
→ Bắt đầu ở NOT_STARTED
→ Người dùng chưa bắt đầu execution

Cycle 2+
→ Bắt đầu thẳng ở ACTIVE
→ Reopen đồng nghĩa với việc bắt đầu lại ngay
```

Lý do: khi người dùng quyết định Reopen một Project đã STOPPED hoặc COMPLETED, hành động đó tự thân đã biểu thị intention tiếp tục. Không cần thêm một bước Start riêng biệt.

`NOT_STARTED` chỉ có ý nghĩa ở Cycle 1 — khi Project vừa được ghi nhận và chưa có execution nào bắt đầu. Đây là quyết định có ý thức cho V1.

---

## 9. Cycle Boundaries

### Cycle Start

Cycle đầu tiên bắt đầu khi Project được tạo.

```text
Create Project
      ↓
Cycle 1
      ↓
NOT_STARTED
```

Các Cycle tiếp theo bắt đầu khi một Project đã kết thúc Cycle trước được reopen.

```text
Cycle 1
COMPLETED
    ↓
 Reopen
    ↓
Cycle 2
ACTIVE
```

### Cycle End

Một Cycle kết thúc khi Project đạt:

```text
STOPPED
```

hoặc:

```text
COMPLETED
```

Do đó:

```text
PAUSED
```

không kết thúc Cycle.

---

## 10. Cycle Example

Ví dụ một Project tồn tại qua nhiều Cycle:

```text
Project: Personal Portfolio

──────────────────────────────

Cycle 1

NOT_STARTED
    ↓
ACTIVE
    ↓
PAUSED
    ↓
ACTIVE
    ↓
COMPLETED

Cycle 1 End

──────────────────────────────

Cycle 2

REOPEN
   ↓
ACTIVE
   ↓
PAUSED
   ↓
ACTIVE
   ↓
STOPPED

Cycle 2 End

──────────────────────────────

Cycle 3

REOPEN
   ↓
ACTIVE
   ↓
...

Current Cycle
```

Project vẫn giữ cùng một identity:

```text
Project
Personal Portfolio
```

trong khi lifecycle của nó có thể chứa:

```text
Cycle 1
Cycle 2
Cycle 3
...
```

---

## 11. Project State vs Cycle State

`STOPPED` và `COMPLETED` không được xem là terminal state tuyệt đối của Project.

Chúng là **cycle-ending states**.

```text
Project
    │
    │ identity continues
    │
    ├── Cycle 1 → COMPLETED
    │
    ├── Cycle 2 → STOPPED
    │
    └── Cycle 3 → ACTIVE
```

Do đó:

```text
STOPPED / COMPLETED

Terminal for current Cycle
        ≠
Terminal for Project identity
```

Project có thể tiếp tục tồn tại và được reopen trong tương lai.

---

## 12. Lifecycle History

Current state chỉ biểu diễn trạng thái hiện tại.

Nó không đủ để biểu diễn toàn bộ lifecycle của Project.

Ví dụ:

```text
Current State:
ACTIVE
```

không cho biết Project có thể đã từng:

```text
Started
Paused
Resumed
Completed
Reopened
```

Do đó, lifecycle transitions cần được preserve như historical information.

Conceptually:

```text
Project
│
├── Current State
│
└── Lifecycle History
    │
    ├── Cycle 1
    │   ├── Created
    │   ├── Started
    │   ├── Paused
    │   ├── Resumed
    │   └── Completed
    │
    └── Cycle 2
        ├── Reopened
        ├── Paused
        └── Resumed
```

Tài liệu này chưa quyết định lifecycle history sẽ được persist dưới dạng:

- event;
- entity;
- state history record;
- Project Cycle object;
- hoặc một technical representation khác.

Đây là quyết định của Domain Analysis và Technical Design sau khi business semantics đã được baseline.

---

## 13. Assumptions

Các assumption dưới đây đang được giả định là đúng trong quá trình analysis nhưng chưa được validate qua thực tế sử dụng.

Nếu một assumption bị falsify trong quá trình dùng thật, các decision và business rule liên quan cần được re-evaluated.

| ID             | Assumption                                                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ASM-PRJ-LC-001 | Người dùng phân biệt được intention "tạm dừng có ý định quay lại" (PAUSED) và "ngưng hẳn" (STOPPED) tại thời điểm thực hiện transition.                                                           |
| ASM-PRJ-LC-002 | Người dùng muốn giữ cùng một Project identity qua nhiều Cycle thay vì tạo Project mới khi reopen.                                                                                                 |
| ASM-PRJ-LC-003 | Khi người dùng Reopen một Project, họ muốn bắt đầu lại ngay (ACTIVE) thay vì có thêm một giai đoạn NOT_STARTED.                                                                                   |
| ASM-PRJ-LC-004 | Reopen một Project đã COMPLETED không làm mất ý nghĩa của lần completion trước — lịch sử vẫn được giữ nguyên và người dùng hiểu Cycle mới là một vòng theo đuổi mới, không phải sửa lại Cycle cũ. |
| ASM-PRJ-LC-005 | Trong V1, Reopen là cơ chế đủ để xử lý trường hợp người dùng thực hiện transition nhầm. Correction behavior chuyên biệt sẽ được xem xét sau khi có user need thực tế.                             |

---

## 14. Business Rule Candidates

Các rule dưới đây được phát hiện từ lifecycle analysis nhưng chưa được baseline thành final Business Rules.

### BRC-PRJ-001 — Initial State

Project mới được tạo ở trạng thái `NOT_STARTED`.

### BRC-PRJ-002 — Start Eligibility

Chỉ Project `NOT_STARTED` mới có thể thực hiện `Start`.

### BRC-PRJ-003 — Pause Eligibility

Chỉ Project `ACTIVE` mới có thể thực hiện `Pause`.

### BRC-PRJ-004 — Resume Eligibility

Chỉ Project `PAUSED` mới có thể thực hiện `Resume`.

### BRC-PRJ-005 — Stop Eligibility

Project có thể được `Stop` từ:

- `NOT_STARTED`
- `ACTIVE`
- `PAUSED`

### BRC-PRJ-006 — Completion Eligibility

Project có thể được `Complete` từ:

- `ACTIVE`
- `PAUSED`

### BRC-PRJ-007 — Reopen Eligibility

Chỉ Project `STOPPED` hoặc `COMPLETED` mới có thể được `Reopen`.

### BRC-PRJ-008 — Stop Semantics

`STOPPED` biểu thị Project đã ngưng được theo đuổi trước khi intended outcome đạt được.

### BRC-PRJ-009 — Completion Semantics

`COMPLETED` biểu thị intended outcome của Project đã đạt được.

### BRC-PRJ-010 — Pause Preserves Cycle

`Pause` và `Resume` không tạo Project Cycle mới. Cả hai transition thuộc cùng một Cycle đang mở.

### BRC-PRJ-011 — Stop Closes Cycle

`Stop` kết thúc current Project Cycle. Một Project không thể có nhiều Cycle đang mở cùng lúc.

### BRC-PRJ-012 — Complete Closes Cycle

`Complete` kết thúc current Project Cycle. Một Project không thể có nhiều Cycle đang mở cùng lúc.

### BRC-PRJ-013 — Reopen Starts New Cycle

`Reopen` bắt đầu Project Cycle mới và đưa Project trở lại `ACTIVE`. Cycle mới không xóa hoặc rewrite các Cycle trước.

### BRC-PRJ-014 — Lifecycle Preservation

State transition mới không được xóa hoặc rewrite historical transitions đã xảy ra trước đó.

### BRC-PRJ-015 — Single Current Cycle

Một Project chỉ được có tối đa một current Cycle tại một thời điểm.

---

## 15. V1 Decisions

| ID             | Decision                                                                                                                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-PRJ-LC-001 | Projects V1 sử dụng năm lifecycle states: NOT_STARTED, ACTIVE, PAUSED, STOPPED và COMPLETED.                                                                                                          |
| DEC-PRJ-LC-002 | Project mới được tạo ở trạng thái NOT_STARTED.                                                                                                                                                        |
| DEC-PRJ-LC-003 | PLANNED hiện không phải lifecycle state vì việc Project chưa bắt đầu không đồng nghĩa với việc một Plan đã tồn tại.                                                                                   |
| DEC-PRJ-LC-004 | PAUSED biểu thị temporary interruption trong khi intention tiếp tục vẫn tồn tại.                                                                                                                      |
| DEC-PRJ-LC-005 | STOPPED biểu thị Project đã ngưng trước khi intended outcome đạt được.                                                                                                                                |
| DEC-PRJ-LC-006 | COMPLETED biểu thị intended outcome đã đạt được.                                                                                                                                                      |
| DEC-PRJ-LC-007 | PAUSED có thể chuyển trực tiếp sang COMPLETED.                                                                                                                                                        |
| DEC-PRJ-LC-008 | NOT_STARTED có thể chuyển trực tiếp sang STOPPED.                                                                                                                                                     |
| DEC-PRJ-LC-009 | STOPPED và COMPLETED kết thúc current Project Cycle nhưng không kết thúc Project identity.                                                                                                            |
| DEC-PRJ-LC-010 | STOPPED và COMPLETED Project có thể được reopen.                                                                                                                                                      |
| DEC-PRJ-LC-011 | Reopen bắt đầu một Project Cycle mới.                                                                                                                                                                 |
| DEC-PRJ-LC-012 | Resume từ PAUSED tiếp tục Cycle hiện tại và không tạo Cycle mới.                                                                                                                                      |
| DEC-PRJ-LC-013 | Historical lifecycle transitions và các Cycle trước phải được preserve khi Project tiếp tục thay đổi.                                                                                                 |
| DEC-PRJ-LC-014 | Projects V1 chưa yêu cầu reason khi Project được STOPPED.                                                                                                                                             |
| DEC-PRJ-LC-015 | Project Cycle là business concept; technical representation của Cycle chưa được quyết định tại BA analysis stage.                                                                                     |
| DEC-PRJ-LC-016 | Timestamp là bắt buộc cho mỗi lifecycle transition trong V1. Không có timestamp thì lifecycle history không có giá trị.                                                                               |
| DEC-PRJ-LC-017 | Correction behavior — hoàn tác hoặc sửa một transition đã thực hiện — chưa được baseline trong V1. Reopen là cơ chế thay thế hiện có.                                                                 |
| DEC-PRJ-LC-018 | NOT_STARTED → STOPPED là transition hợp lệ, biểu diễn Project được ghi nhận nhưng không bao giờ được bắt đầu. Sự khác biệt semantic với ACTIVE → STOPPED có thể được nhận biết qua lifecycle history. |
| DEC-PRJ-LC-019 | Cycle 1 bắt đầu ở NOT_STARTED. Cycle 2+ bắt đầu thẳng ở ACTIVE sau Reopen. Bất đối xứng này là có chủ ý.                                                                                              |

---

## 16. Out of Scope for Lifecycle V1

Lifecycle V1 hiện chưa yêu cầu:

- Stop reason.
- Completion notes.
- Pause reason.
- Reopen reason.
- Scheduled resume.
- Automatic state transitions.
- Automatic completion detection.
- Automatic stop detection.
- AI-based lifecycle decisions.
- Project health scoring.
- Cycle comparison analytics.
- Cycle duration analytics.
- Productivity scoring.
- Automatic Project versioning.
- External activity quyết định Project state.

State transition trong V1 là explicit user action.

---

## 17. Open Analysis

Các khu vực sau chưa được baseline trong tài liệu này:

- Correction behavior — hoàn tác hoặc sửa transition đã thực hiện. Hiện chưa được baseline; Reopen là cơ chế thay thế trong V1.
- PAUSED becoming stale — Project nằm PAUSED trong thời gian dài mà không có activity. Chưa xác định behavior hoặc signal nào cho trường hợp này.
- Delete behavior.
- Archive / visibility behavior.
- Interaction giữa Project lifecycle và Goal.
- Interaction giữa Project lifecycle và future GitHub/WakaTime integrations.
- Lifecycle event naming.
- Persistence representation của lifecycle history.
- Project Cycle có cần trở thành domain entity hay chỉ là derived concept.
- Concurrency behavior khi lifecycle transition xảy ra đồng thời.
- Authorization rules.
- Use Cases.
- Acceptance Criteria.
- Exception flows.
- Requirements Traceability.

---

## 18. Known Semantic Distinctions

Các distinction sau cần được preserve trong những phase tiếp theo.

### Pause vs Stop

```text
PAUSED
→ Hiện không thực hiện.
→ Vẫn có intention tiếp tục.
→ Cycle vẫn mở.

STOPPED
→ Không còn intention tiếp tục.
→ Outcome chưa đạt.
→ Cycle kết thúc.
```

### Stop vs Complete

```text
STOPPED
→ Outcome chưa đạt.
→ Cycle kết thúc.

COMPLETED
→ Outcome đã đạt.
→ Cycle kết thúc.
```

### Resume vs Reopen

```text
RESUME

PAUSED
  ↓
ACTIVE

Same Cycle
```

```text
REOPEN

STOPPED / COMPLETED
        ↓
      ACTIVE

New Cycle
```

### Project vs Cycle

```text
Project
→ Identity của effort xuyên thời gian.

Cycle
→ Một vòng theo đuổi của Project.
```

### Current State vs Lifecycle History

```text
Current State
→ Project đang ở đâu hiện tại.

Lifecycle History
→ Project đã đi qua những gì.
```

---

## 19. Example Lifecycle

```text
Project: Magnum Opus

Created
2026-01-01

──────────────────────────────

Cycle 1

NOT_STARTED
2026-01-01

     ↓ Start

ACTIVE
2026-01-05

     ↓ Pause

PAUSED
2026-03-10

     ↓ Resume

ACTIVE
2026-03-20

     ↓ Complete

COMPLETED
2026-06-01

Cycle 1 End

──────────────────────────────

Cycle 2

Reopened
2026-08-01

     ↓

ACTIVE

     ↓ Pause

PAUSED

     ↓ Resume

ACTIVE

     ↓ Stop

STOPPED
2026-10-15

Cycle 2 End

──────────────────────────────

Cycle 3

Reopened
2027-01-10

     ↓

ACTIVE

     ↓

...
```

Tại mọi thời điểm, Project vẫn giữ cùng một identity:

```text
Magnum Opus
```

trong khi lifecycle record phản ánh các giai đoạn khác nhau mà người dùng đã theo đuổi Project.

---

## 20. Analysis Interpretation

Lifecycle model hiện tại không xem Project đơn thuần là một record có `status`.

Project được xem là một effort có lịch sử phát triển theo thời gian.

```text
Project Identity
       │
       ▼
Lifecycle
       │
       ├── Cycle 1
       │      └── Transitions
       │
       ├── Cycle 2
       │      └── Transitions
       │
       └── Cycle n
              └── Transitions
```

Current state cung cấp snapshot về hiện tại.

Cycle và lifecycle history cung cấp historical context.

Cách biểu diễn technical cụ thể chưa thuộc phạm vi của BA analysis này.

---

## 21. Next Step

The next analysis phase is:

**Projects V1 — Use Cases & Acceptance Criteria**

Lifecycle behavior và business rules đã được baseline đủ để bắt đầu xác định Use Cases và Acceptance Criteria.

Quá trình tiếp theo:

```text
Functional Requirement
        +
Business Rule
        ↓
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

Kết quả của quá trình này sẽ trở thành cơ sở cho:

- Product Specification
- Domain Modeling
- Technical Design
- Implementation
- Verification

```

```
