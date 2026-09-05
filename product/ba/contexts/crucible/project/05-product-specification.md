# Projects V1 — Product Specification

> **Status:** Candidate Product Baseline
>
> **Domain:** Crucible / Projects
>
> **Purpose:** Consolidate các product decision, lifecycle semantics, Functional Requirements, Business Rules và Use Cases của Projects V1 thành một specification thống nhất làm authoritative baseline trước khi chuyển sang Domain Analysis và Technical Design.

---

## 1. Related Documentation

Product Specification này được derive từ:

### BA Overview

`01-ba-overview.md`

Xác định:

- product context;
- Problem Statement;
- User Needs;
- Product Objective;
- Desired Outcomes;
- V1 Scope;
- Out of Scope;
- Known Decisions.

### Lifecycle & Behavior Analysis

`02-lifecycle-behavior-analysis.md`

Xác định:

- Project lifecycle;
- lifecycle state semantics;
- state transition;
- Project Cycle;
- Cycle boundaries;
- reopen behavior;
- lifecycle history.

### Functional Requirements & Business Rules

`03-functional-requirements-business-rules.md`

Xác định:

- Functional Requirements;
- Business Rules;
- lifecycle constraints;
- intended outcome semantics;
- historical preservation requirements.

### Use Cases & Acceptance Criteria

`04-use-cases-acceptance-criteria.md`

Xác định:

- user interaction;
- valid lifecycle behavior;
- invalid behavior;
- postconditions;
- Acceptance Criteria.

---

# 2. Specification Authority

Tài liệu này là consolidated product baseline của Projects V1.

Nếu các tài liệu analysis trước đó chứa một assumption hoặc candidate decision không còn phù hợp với Product Specification này, Product Specification được xem là source of truth cho behavior hiện tại của Projects V1.

```text
01. BA Overview
        │
02. Lifecycle Analysis
        │
03. Requirements & Rules
        │
04. Use Cases & AC
        │
        ▼
05. PRODUCT SPECIFICATION
        │
        ▼
Authoritative Product Baseline
```

Tài liệu này mô tả:

> **Projects V1 phải hoạt động như thế nào từ góc nhìn product và domain semantics.**

Tài liệu này không xác định:

- aggregate implementation;
- entity structure;
- database schema;
- API endpoint;
- application command;
- persistence model;
- event implementation;
- framework;
- infrastructure architecture.

---

# 3. Product Context

`Projects` là capability đầu tiên thuộc bounded context:

```text
Crucible
```

Crucible đại diện cho arena của intentional action — nơi người dùng theo đuổi những effort có ý nghĩa và đưa intention vào thực tế.

```text
Crucible
    ↓
Intentional Action
    ↓
Project
    ↓
Pursuit over time
```

Projects tồn tại để giúp người dùng:

- ghi nhận những effort đủ ý nghĩa để được theo dõi độc lập;
- biết Project hiện đang ở đâu trong lifecycle;
- bảo toàn những giai đoạn theo đuổi khác nhau của cùng Project;
- giữ lại historical context của Project theo thời gian;
- xác định hoặc làm rõ điều mình đang hướng tới trong từng giai đoạn thực hiện.

Projects không phải general-purpose task manager.

Projects cũng không phụ thuộc vào software development, GitHub hoặc bất kỳ external integration nào.

---

# 4. Product Definition

## 4.1. Project

A `Project` represents a deliberate effort undertaken by the user to bring about a defined outcome or meaningful change.

Một Project:

- được người dùng chủ động xác định;
- đủ ý nghĩa để được quan sát độc lập;
- phát triển theo thời gian;
- có lifecycle có ý nghĩa cần được bảo toàn;
- có thể trải qua nhiều lần theo đuổi khác nhau;
- không bắt buộc phải có deadline;
- không bắt buộc phải có predefined completion date;
- không bắt buộc phải gắn với Goal;
- không bắt buộc phải gắn với external integration.

Project giữ một identity xuyên suốt lifetime của effort.

---

## 4.2. Project Is Not a Goal

`Goal` đại diện cho một desired destination hoặc desired state.

`Project` đại diện cho một effort được thực hiện để mang một điều gì đó vào thực tế.

Ví dụ:

```text
Goal:
Become a stronger software engineer

Project:
Build Magnum Opus
```

Một Project có thể hỗ trợ một Goal, nhưng Goal không phải điều kiện để Project tồn tại.

---

## 4.3. Project Is Not a Habit or Routine

Habit hoặc Routine đại diện cho behavior lặp lại.

Project đại diện cho một effort được theo đuổi xuyên thời gian.

Ví dụ:

```text
Routine:
Code every evening

Project:
Build Magnum Opus
```

---

## 4.4. Project Is Not a Task

Task đại diện cho một unit of action.

Project đại diện cho một effort lớn hơn có thể bao gồm nhiều action khác nhau.

Ví dụ:

```text
Project:
Build Portfolio

Task:
Implement Contact Form
```

Projects V1 không cung cấp general-purpose task management.

---

## 4.5. Project Is Not an Area

Một ongoing area hoặc responsibility không tự động là Project.

Ví dụ:

```text
Software Engineering
Health
Relationships
Personal Finance
```

có thể tiếp tục tồn tại mà không có một pursuit lifecycle cụ thể.

Projects V1 không định nghĩa Area hoặc Responsibility model.

---

# 5. Ubiquitous Language

Các term sau được baseline cho Projects V1.

## 5.1. Project

Một deliberate effort được người dùng ghi nhận, theo đuổi và quan sát xuyên thời gian.

Project giữ identity xuyên suốt nhiều Project Cycle.

---

## 5.2. Project Identity

Continuity của cùng một Project xuyên suốt lifetime của nó.

Reopen không tạo Project identity mới.

---

## 5.3. Project Cycle

Một continuous pursuit period của cùng một Project.

Project Cycle bắt đầu khi Project bước vào `ACTIVE` thông qua:

```text
Start
```

hoặc:

```text
Reopen
```

Project Cycle tiếp tục khi Project:

```text
ACTIVE
PAUSED
```

Project Cycle kết thúc khi Project chuyển sang:

```text
STOPPED
COMPLETED
```

nếu current Cycle đang tồn tại.

---

## 5.4. Current Cycle

Project Cycle hiện đang mở.

Một Project có tối đa một current Cycle tại một thời điểm.

---

## 5.5. Closed Cycle

Một Project Cycle đã kết thúc bằng:

```text
STOPPED
```

hoặc:

```text
COMPLETED
```

Closed Cycle là historical context và không được rewrite thông qua các lifecycle action xảy ra sau đó.

---

## 5.6. Intended Outcome

`Intended Outcome` là kết quả hoặc meaningful change mà người dùng hiện đang hướng tới trong một Project Cycle cụ thể.

Intended Outcome:

- thuộc về Project Cycle;
- không thuộc Project identity;
- là optional;
- có thể chưa được xác định khi Cycle bắt đầu;
- có thể được làm rõ hoặc cập nhật trong open Cycle;
- không được chỉnh sửa sau khi Cycle đã đóng.

---

## 5.7. Start

Lifecycle action bắt đầu execution của một Project đang `NOT_STARTED`.

Start:

```text
NOT_STARTED
    ↓
ACTIVE
```

và bắt đầu `Cycle 1`.

---

## 5.8. Pause

Lifecycle action tạm thời ngưng execution trong khi intention tiếp tục vẫn tồn tại.

```text
ACTIVE
   ↓
PAUSED
```

Pause không kết thúc current Cycle.

---

## 5.9. Resume

Lifecycle action tiếp tục execution sau khi Project đã được pause.

```text
PAUSED
   ↓
ACTIVE
```

Resume tiếp tục cùng current Cycle.

---

## 5.10. Stop

Lifecycle action biểu thị người dùng quyết định ngưng theo đuổi Project mà không tuyên bố current pursuit đã hoàn thành.

```text
ACTIVE / PAUSED
        ↓
      STOPPED
```

Nếu current Cycle tồn tại, Stop đóng Cycle đó.

Project cũng có thể:

```text
NOT_STARTED → STOPPED
```

mà chưa từng có Project Cycle.

---

## 5.11. Complete

Lifecycle action biểu thị explicit decision của người dùng rằng current Project Cycle có thể được xem là hoàn thành.

```text
ACTIVE / PAUSED
        ↓
     COMPLETED
```

Complete đóng current Cycle.

Completion không được tự động quyết định bởi system.

---

## 5.12. Reopen

Lifecycle action bắt đầu một pursuit period mới của cùng Project identity.

```text
STOPPED / COMPLETED
        ↓
      Reopen
        ↓
      ACTIVE
```

Reopen bắt đầu một Project Cycle mới.

---

# 6. Project Information Specification

Projects V1 yêu cầu Project identity chứa tối thiểu product information sau:

```text
title
description
```

## 6.1. Title

`title` là required.

Title cho phép người dùng nhận diện Project.

Project không được tạo nếu không có title hợp lệ.

---

## 6.2. Description

`description` là optional.

Description cung cấp additional context về Project.

Việc không có description không ngăn Project được tạo hoặc thực hiện lifecycle action.

---

## 6.3. Intended Outcome Is Not Project Information

`Intended Outcome` không thuộc general Project information.

Không được hiểu Project như:

```text
Project
├── title
├── description
└── intendedOutcome
```

ở product semantics.

Đúng về mặt semantics là:

```text
Project
├── identity information
└── Project Cycles
      └── intended outcome of each Cycle
```

Technical representation chưa được quyết định bởi specification này.

---

# 7. Initial Project State

Khi Project được tạo:

```text
Project Created
      ↓
NOT_STARTED
```

Project mới:

- tồn tại như một Project identity;
- chưa bắt đầu execution;
- chưa có Project Cycle;
- không yêu cầu intended outcome.

Conceptually:

```text
Project exists
State = NOT_STARTED
Current Cycle = none
Historical Cycles = none
```

`NOT_STARTED` không có nghĩa Project đã được planned.

Nó chỉ có nghĩa execution chưa bắt đầu.

---

# 8. Project Lifecycle Specification

Projects V1 sử dụng các lifecycle state:

```text
NOT_STARTED
ACTIVE
PAUSED
STOPPED
COMPLETED
```

---

## 8.1. NOT_STARTED

Project đã được ghi nhận nhưng execution chưa bắt đầu.

Đặc điểm:

- Project identity tồn tại;
- không có current Cycle;
- Project chưa từng bắt đầu execution nếu đây là state ban đầu;
- intended outcome không được yêu cầu.

---

## 8.2. ACTIVE

Project đang được người dùng thực sự theo đuổi.

Đặc điểm:

- Project có current/open Cycle;
- execution đang diễn ra;
- current Cycle có thể có hoặc chưa có intended outcome.

---

## 8.3. PAUSED

Execution tạm thời dừng nhưng intention tiếp tục current pursuit vẫn tồn tại.

Đặc điểm:

- current Cycle vẫn mở;
- Project không bắt đầu Cycle mới;
- intended outcome vẫn có thể được xác định hoặc cập nhật.

---

## 8.4. STOPPED

Người dùng đã quyết định ngưng theo đuổi Project mà không tuyên bố completion.

Nếu Project đang có current Cycle:

```text
ACTIVE / PAUSED
        ↓
STOPPED
```

current Cycle kết thúc.

Nếu Project chưa từng được Start:

```text
NOT_STARTED
    ↓
STOPPED
```

không có Project Cycle nào được tạo.

`STOPPED` không đồng nghĩa với `COMPLETED`.

---

## 8.5. COMPLETED

Người dùng đã đưa ra explicit decision rằng current Project Cycle có thể được xem là hoàn thành.

`COMPLETED`:

- đóng current Cycle;
- không permanently terminate Project identity;
- vẫn cho phép Project được Reopen sau này.

---

# 9. Valid Lifecycle Transitions

Valid transition matrix:

| Current State | Start | Pause | Resume | Stop | Complete | Reopen |
| ------------- | ----- | ----- | ------ | ---- | -------- | ------ |
| `NOT_STARTED` | ✓     | —     | —      | ✓    | —        | —      |
| `ACTIVE`      | —     | ✓     | —      | ✓    | ✓        | —      |
| `PAUSED`      | —     | —     | ✓      | ✓    | ✓        | —      |
| `STOPPED`     | —     | —     | —      | —    | —        | ✓      |
| `COMPLETED`   | —     | —     | —      | —    | —        | ✓      |

Equivalent state machine:

```text
NOT_STARTED
├── Start    → ACTIVE
└── Stop     → STOPPED

ACTIVE
├── Pause    → PAUSED
├── Stop     → STOPPED
└── Complete → COMPLETED

PAUSED
├── Resume   → ACTIVE
├── Stop     → STOPPED
└── Complete → COMPLETED

STOPPED
└── Reopen   → ACTIVE

COMPLETED
└── Reopen   → ACTIVE
```

Lifecycle state không được thay đổi thông qua generic Project update.

---

# 10. Project Cycle Specification

## 10.1. Project Creation Does Not Start a Cycle

Project Cycle không bắt đầu tại thời điểm Project được tạo.

```text
Create
  ↓
NOT_STARTED
  ↓
No Cycle
```

---

## 10.2. First Cycle Begins on Start

Khi Project lần đầu chuyển:

```text
NOT_STARTED
    ↓
Start
    ↓
ACTIVE
```

`Cycle 1` bắt đầu.

---

## 10.3. Pause Does Not End a Cycle

```text
Cycle N

ACTIVE
   ↓
PAUSED
```

vẫn là cùng một Cycle.

---

## 10.4. Resume Does Not Start a New Cycle

```text
Cycle N

PAUSED
   ↓
ACTIVE
```

vẫn là cùng một Cycle.

---

## 10.5. Complete Ends a Cycle

```text
Cycle N

ACTIVE / PAUSED
        ↓
COMPLETED
```

đóng current Cycle.

---

## 10.6. Stop Ends an Existing Cycle

Nếu Project có current Cycle:

```text
Cycle N

ACTIVE / PAUSED
        ↓
STOPPED
```

đóng current Cycle.

---

## 10.7. Stop Before Start Creates No Cycle

Lifecycle sau:

```text
Create
  ↓
NOT_STARTED
  ↓
Stop
  ↓
STOPPED
```

không tạo Project Cycle.

Conceptually:

```text
Project exists
Historical Cycles = 0
Current Cycle = none
```

---

## 10.8. Reopen Starts a New Cycle

Nếu Project đã có closed Cycle:

```text
Cycle N
   ↓
STOPPED / COMPLETED
   ↓
Reopen
   ↓
Cycle N + 1
   ↓
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
    ↓
ACTIVE
```

---

## 10.9. Single Current Cycle Invariant

Một Project chỉ có:

```text
0 or 1
```

current/open Cycle tại một thời điểm.

Không hợp lệ:

```text
Cycle 2 → Current
Cycle 3 → Current
```

cùng lúc.

---

# 11. Intended Outcome Specification

## 11.1. Outcome Belongs to Cycle

Mỗi Project Cycle có thể có một intended outcome riêng.

Ví dụ:

```text
Project: Magnum Opus

Cycle 1
Outcome:
Có Reflection baseline đủ dùng

Cycle 2
Outcome:
Có Projects V1 đủ dùng

Cycle 3
Outcome:
Có historical analytics hữu ích
```

Project identity không bị thay đổi khi outcome của các Cycle khác nhau thay đổi.

---

## 11.2. Outcome Is Optional

Một Project Cycle có thể bắt đầu khi intended outcome chưa được xác định.

```text
Start
   ↓
Cycle begins
   ↓
ACTIVE
   ↓
Outcome = undefined
```

Điều này là valid product behavior.

---

## 11.3. Outcome May Be Defined Later

Trong current Cycle, người dùng có thể xác định outcome sau khi execution đã bắt đầu.

Ví dụ:

```text
Cycle 1
ACTIVE

Outcome:
undefined

        ↓

User gains clarity

        ↓

Outcome:
"Projects V1 đủ dùng để quản lý lifecycle project cá nhân"
```

---

## 11.4. Outcome May Be Updated During an Open Cycle

Khi Project đang:

```text
ACTIVE
PAUSED
```

người dùng có thể cập nhật intended outcome.

Ví dụ:

```text
"Build Projects"
        ↓
refine
        ↓
"Build Projects V1 đủ dùng hằng ngày"
```

Việc cập nhật outcome:

- không tạo Cycle mới;
- không thay đổi lifecycle state;
- không đóng current Cycle.

---

## 11.5. Outcome Revision History Is Not Required in V1

Projects V1 chỉ yêu cầu current intended outcome của open Cycle.

Khi intended outcome được cập nhật:

```text
Old Value
   ↓
Update
   ↓
Current Value
```

V1 không yêu cầu user-facing hoặc product-level revision history của outcome.

---

## 11.6. Closed Cycle Outcome Is Immutable

Khi Cycle kết thúc:

```text
STOPPED
```

hoặc:

```text
COMPLETED
```

intended outcome cuối cùng được preserve như historical context.

Closed Cycle outcome không được chỉnh sửa.

---

## 11.7. Reopen Does Not Inherit Outcome

Khi Project được Reopen:

```text
Previous Cycle
Outcome A
   ↓
Closed

Reopen
   ↓

New Cycle
Outcome = undefined
```

System không tự động copy outcome của previous Cycle.

Người dùng có thể xác định outcome mới sau đó.

---

# 12. Completion Specification

## 12.1. Completion Is Explicit

Project không tự động chuyển sang `COMPLETED`.

Completion xảy ra thông qua explicit user action.

---

## 12.2. User Is the Completion Authority

Người dùng là người quyết định current Project Cycle có thể được xem là hoàn thành hay không.

System chỉ xác định:

```text
Is lifecycle transition allowed?
```

System không xác định:

```text
Has the user objectively achieved enough?
```

---

## 12.3. Outcome Is Not Required for Completion

Current Project Cycle không bắt buộc phải có intended outcome để được Complete.

Valid:

```text
Cycle 1
Outcome = undefined
State = ACTIVE

User selects Complete

        ↓

COMPLETED
```

---

## 12.4. System Does Not Verify Outcome

Projects V1 không yêu cầu:

- objective completion criteria;
- proof of outcome;
- automatic outcome validation;
- AI judgment;
- external system validation;
- automatic completion.

---

## 12.5. Complete from PAUSED Is Valid

Lifecycle:

```text
PAUSED
   ↓
Complete
   ↓
COMPLETED
```

là valid.

Project không cần Resume trước khi Complete.

---

# 13. Stop Specification

## 13.1. Stop Is Different from Complete

Stop biểu thị:

> Người dùng không tiếp tục pursuit hiện tại và không tuyên bố completion.

Complete biểu thị:

> Người dùng explicit quyết định current pursuit đã hoàn thành.

Do đó:

```text
STOPPED ≠ COMPLETED
```

---

## 13.2. Stop Does Not Require a Reason

Projects V1 không yêu cầu:

```text
stop reason
```

để Stop Project.

---

## 13.3. Stop Can Occur Before First Start

Valid lifecycle:

```text
Create
  ↓
NOT_STARTED
  ↓
Stop
  ↓
STOPPED
```

Không Project Cycle nào được tạo.

---

# 14. Reopen Specification

## 14.1. Reopen Applies to STOPPED and COMPLETED

Chỉ Project đang ở:

```text
STOPPED
COMPLETED
```

có thể được Reopen.

---

## 14.2. Reopen Preserves Identity

Reopen không tạo Project mới.

```text
Same Project
    │
    ├── Cycle 1
    ├── Cycle 2
    └── Cycle N
```

---

## 14.3. Reopen Starts Active Pursuit

Reopen đưa Project trực tiếp về:

```text
ACTIVE
```

và bắt đầu new Cycle.

Không có intermediate:

```text
NOT_STARTED
```

cho Cycle mới.

---

## 14.4. Reopen Does Not Require Outcome

New Cycle có thể bắt đầu:

```text
Outcome = undefined
```

---

## 14.5. Reopen Does Not Rewrite Previous Cycles

Historical Cycle:

- lifecycle transitions;
- final intended outcome;
- closed state;

phải được preserve.

---

# 15. Delete Specification

## 15.1. Delete Applies Only When No Cycle Has Ever Existed

Project chỉ có thể bị xóa vĩnh viễn khi chưa từng có bất kỳ Project Cycle nào — current lẫn historical:

```text
cycles.length == 0
```

Điều kiện này không được xác định qua lifecycle state hiện tại, mà qua việc Project đã từng có Project Cycle hay chưa.

Trong thực tế, điều này tương đương với:

```text
state == NOT_STARTED

hoặc

state == STOPPED, đạt được từ NOT_STARTED → Stop
mà chưa từng Start hoặc Reopen
```

Một khi Project đã từng Start hoặc Reopen — tức đã từng có ít nhất một Project Cycle — Project không thể bị xóa nữa dưới bất kỳ trạng thái nào sau đó, kể cả khi Project sau này quay lại `STOPPED` hoặc `COMPLETED`.

---

## 15.2. Delete Is Hard Delete

Delete trong Projects V1 xóa Project hoàn toàn khỏi hệ thống.

```text
Delete
   ↓
Project no longer exists
```

Không có:

- soft delete;
- archive;
- trash;
- restore;
- undo.

---

## 15.3. Delete Requires No Historical Preservation

Vì delete chỉ hợp lệ khi `cycles.length == 0` (mục 15.1), một Project đủ điều kiện xóa không bao giờ có lifecycle history hoặc Project Cycle nào có ý nghĩa để mất — dù Project đó đang `NOT_STARTED` hay `STOPPED` mà chưa từng Start.

```text
cycles.length == 0
   ↓
Nothing meaningful to preserve
```

---

# 16. Lifecycle History Specification

## 16.1. Current State and History Are Different Concepts

Ví dụ:

```text
Current State:
ACTIVE
```

không mô tả đầy đủ lifetime của Project.

Project có thể đã trải qua:

```text
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
```

Do đó system phải phân biệt:

```text
Current Reality
       ≠
Historical Record
```

---

## 16.2. Meaningful Lifecycle Transitions Must Be Preserved

Projects V1 phải preserve những lifecycle transition có business meaning.

Bao gồm các transition được thực hiện thông qua:

```text
Start
Pause
Resume
Stop
Complete
Reopen
```

Specification không quyết định technical representation của historical transition.

---

## 16.3. Historical Cycles Must Be Preserved

New Cycle không được overwrite closed Cycle trước.

Ví dụ:

```text
Project

Cycle 1
COMPLETED

Cycle 2
STOPPED

Cycle 3
ACTIVE
```

cả ba pursuit period phải vẫn phân biệt được về mặt historical meaning.

---

# 17. User Interaction Specification

Projects V1 phải cho phép người dùng thực hiện các interaction sau:

```text
Create Project
View Projects
View Project Details
Update Project

Start Project
Pause Project
Resume Project
Stop Project
Complete Project
Reopen Project

Define Intended Outcome
Update Intended Outcome

Delete Project
```

Các interaction này phải tuân theo lifecycle eligibility tương ứng.

---

# 18. Invalid Behavior Specification

Khi người dùng thực hiện một lifecycle action không hợp lệ:

```text
Invalid Action
     ↓
Rejected
```

system phải đảm bảo:

- current lifecycle state không thay đổi;
- current Cycle không thay đổi;
- historical Cycle không bị rewrite;
- action không được preserve như successful lifecycle transition.

Ví dụ:

```text
Project = COMPLETED

User tries Pause
        ↓
Rejected

Project remains COMPLETED
```

---

# 19. Product Invariants

Các invariant sau phải luôn đúng đối với Projects V1.

## INV-PRJ-001 — Project Identity Persists Across Cycles

```text
Reopen
≠
Create New Project
```

---

## INV-PRJ-002 — NOT_STARTED Has No Current Cycle

```text
State = NOT_STARTED
→ Current Cycle = none
```

---

## INV-PRJ-003 — ACTIVE Has a Current Cycle

```text
State = ACTIVE
→ Current Cycle exists
→ (bất kể Cycle đó được tạo bởi Start hay Reopen)
```

---

## INV-PRJ-004 — PAUSED Has a Current Cycle

```text
State = PAUSED
→ Current Cycle exists
→ (bất kể Cycle đó được tạo bởi Start hay Reopen)
```

---

## INV-PRJ-005 — At Most One Current Cycle Exists

```text
Current Cycle count ≤ 1
```

---

## INV-PRJ-006 — Pause and Resume Preserve Cycle Identity

```text
ACTIVE → PAUSED → ACTIVE
```

remains within the same Cycle.

---

## INV-PRJ-007 — Complete Closes Current Cycle

```text
Complete
→ Project = COMPLETED
→ Current Cycle closes
```

---

## INV-PRJ-008 — Stop Closes Current Cycle When One Exists

```text
ACTIVE / PAUSED → STOPPED
```

closes current Cycle.

---

## INV-PRJ-009 — Reopen Creates a New Cycle

```text
STOPPED / COMPLETED
        ↓
Reopen
        ↓
ACTIVE + New Cycle
```

---

## INV-PRJ-010 — Closed Cycle History Is Immutable

Historical Cycle context không được rewrite bởi future lifecycle action.

---

## INV-PRJ-011 — Intended Outcome Belongs to One Cycle

Outcome của một Cycle không tự động trở thành outcome của Cycle tiếp theo.

---

## INV-PRJ-012 — Intended Outcome Is Optional

Cycle existence không phụ thuộc vào việc outcome đã được xác định hay chưa.

---

## INV-PRJ-013 — Completion Is User-Decided

System không tự quyết định Project completion.

---

## INV-PRJ-014 — Only Projects That Never Had a Cycle Can Be Deleted

```text
Delete allowed
⟺
cycles.length == 0
```

Điều kiện này xác định qua việc Project đã từng có Project Cycle hay chưa, không phải qua lifecycle state hiện tại. Một Project đã từng Start hoặc Reopen không thể bị xóa dưới bất kỳ trạng thái nào sau đó.

---

## INV-PRJ-015 — Delete Is Irreversible

```text
Deleted Project
≠
Recoverable
```

Không có Reopen, Restore hoặc Undo cho một Project đã bị xóa.

---

# 20. Functional Capability Baseline

Projects V1 bao gồm các capability:

```text
Project Representation
├── Create Project
├── View Projects
├── View Project Details
└── Update Project Information

Project Lifecycle
├── Start
├── Pause
├── Resume
├── Stop
├── Complete
└── Reopen

Project Cycle Context
├── Define Intended Outcome
└── Update Intended Outcome

Historical Preservation
├── Preserve Lifecycle History
└── Preserve Project Cycles

Deletion
└── Delete a Project That Never Had a Cycle
```

---

# 21. V1 Scope

Projects V1 bao gồm:

- Project creation;
- Project listing;
- Project details;
- Project information update;
- explicit lifecycle management;
- Project Cycle semantics;
- optional Cycle-specific intended outcome;
- lifecycle history preservation;
- historical Cycle preservation;
- reopen behavior;
- delete behavior cho Project chưa từng có Project Cycle nào.

---

# 22. Explicitly Deferred Capabilities

Các capability sau không thuộc Projects V1 baseline.

## 22.1. Project Execution Management

Deferred:

- Task;
- Subtask;
- Milestone;
- Project planning;
- dependency management;
- scheduling;
- roadmap.

---

## 22.2. Lifecycle Metadata

Deferred:

- pause reason;
- stop reason;
- reopen reason;
- completion note;
- structured completion criteria.

---

## 22.3. Outcome History

Deferred:

- outcome revision history;
- outcome versioning;
- change reasoning;
- automatic distinction giữa refinement và new outcome.

---

## 22.4. External Integrations

Deferred:

- GitHub integration;
- WakaTime integration;
- commit tracking;
- issue tracking;
- pull request tracking;
- repository synchronization;
- coding-time synchronization.

---

## 22.5. Automated Judgment

Deferred:

- productivity score;
- Project health score;
- AI-generated lifecycle state;
- AI-generated completion decision;
- automatic outcome detection;
- automatic Project completion.

---

## 22.6. Not Yet Baselined

Delete behavior đã được baseline: xem `15. Delete Specification` và `INV-PRJ-014`, `INV-PRJ-015`.

Các capability sau vẫn chưa được phân tích đủ để quyết định include hay defer:

- archive behavior (visibility/storage behavior độc lập với lifecycle state).

`ARCHIVED` không thuộc Project lifecycle state.

---

# 23. Presentation Decisions Still Open

Các behavior cốt lõi đã được baseline, nhưng một số presentation decision vẫn có thể được giải quyết ở Product Design hoặc Technical Design mà không thay đổi domain semantics.

Bao gồm:

- Cycle numbering có visible cho user hay không;
- lifecycle history có dedicated UI hay không;
- historical Cycle được trình bày dưới dạng timeline hay section;
- timestamp nào được hiển thị;
- current Cycle được visualized như thế nào.

Các decision này không được thay đổi core lifecycle semantics đã được baseline trong specification.

---

# 24. Acceptance Baseline

Một implementation của Projects V1 được xem là phù hợp với Product Specification nếu ít nhất các behavior sau đúng:

```text
1. Create Project
   → NOT_STARTED
   → no Cycle

2. Start
   → ACTIVE
   → Cycle 1 begins

3. Pause
   → PAUSED
   → same Cycle

4. Resume
   → ACTIVE
   → same Cycle

5. Stop from ACTIVE/PAUSED
   → STOPPED
   → Cycle closes

6. Stop from NOT_STARTED
   → STOPPED
   → no Cycle created

7. Complete from ACTIVE/PAUSED
   → COMPLETED
   → Cycle closes

8. Completion
   → explicit user decision
   → outcome not required
   → Complete from PAUSED is valid without Resume first

9. Reopen
   → ACTIVE
   → new Cycle begins
   → same Project identity

10. New Cycle
    → does not inherit previous intended outcome

11. Intended Outcome
    → belongs to Cycle
    → optional
    → editable while ACTIVE / PAUSED
    → immutable after Cycle closes

12. Lifecycle History
    → preserved across future transitions

13. Historical Cycles
    → preserved across Reopen

14. Invalid lifecycle actions
    → rejected
    → no state/history mutation

15. Delete
    → only allowed when cycles.length == 0 (never Started or Reopened)
    → hard delete, irreversible
    → rejected once any Cycle has ever existed
```

Detailed Acceptance Criteria được định nghĩa trong:

`04-use-cases-acceptance-criteria.md`

---

# 25. Product Model Summary

Projects V1 được hiểu conceptually như sau:

```text
PROJECT
│
│  Identity persists over time
│
├── title
├── description
├── current lifecycle state
│
└── pursuit history
      │
      ├── Cycle 1
      │     ├── starts when ACTIVE
      │     ├── optional intended outcome
      │     └── closes by STOPPED / COMPLETED
      │
      ├── Cycle 2
      │     ├── starts on Reopen
      │     ├── optional intended outcome
      │     └── closes by STOPPED / COMPLETED
      │
      └── Cycle N
            └── ...
```

Diagram trên thể hiện product semantics.

Nó không phải database schema hoặc aggregate definition.

---

## 26. Lifecycle Summary

```text
CREATE PROJECT
      │
      ▼
NOT_STARTED
      │
      ├───────────── Stop ─────────────→ STOPPED
      │                                   │
      │                                 Reopen
      │                                   │
      │                                   ▼
      │                                Cycle 1
      │                                   │
      │                                   ▼
      │                                 ACTIVE
      │
    Start
      │
      ▼
   Cycle 1
      │
      ▼
    ACTIVE
      │
      ├──── Pause ─────────────────────→ PAUSED
      │                                   │
      │                         ┌─────────┤
      │                         │         │
      │                       Resume    Complete
      │                         │         │
      │                         ▼         ▼
      │                       ACTIVE   COMPLETED
      │                                   │
      │                                 Reopen
      │                                   │
      │                                   ▼
      │                               New Cycle
      │                                   │
      │                                   ▼
      │                                 ACTIVE
      │
      ├──── Stop ──────────────────────→ STOPPED
      │                                   │
      │                                 Reopen
      │                                   │
      │                                   ▼
      │                               New Cycle
      │                                   │
      │                                   ▼
      │                                 ACTIVE
      │
      └──── Complete ──────────────────→ COMPLETED
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
      └── Intended Outcome
              │
              ├── optional
              ├── define later
              └── update while open
```

Sau khi Cycle đóng:

```text
STOPPED / COMPLETED
        │
        ▼
Closed Cycle
        │
        ├── historical lifecycle preserved
        └── final intended outcome preserved
```

---

# 27. Product Philosophy Alignment

Projects V1 tuân theo nguyên tắc rộng hơn của Magnum Opus:

```text
Evidence
   ↓
Awareness
   ↓
Reflection
   ↓
User Judgment
```

Projects không cố gắng phán xét người dùng.

Đặc biệt:

```text
System
→ preserves what happened
→ preserves context
→ enforces lifecycle consistency

User
→ defines meaning
→ chooses direction
→ decides completion
→ decides whether to pursue again
```

Do đó Projects V1 không sử dụng automated scoring hoặc automated judgment để quyết định lifecycle của Project.

---

# 28. BA Baseline Completion

Với Product Specification này, BA baseline cho Projects V1 bao gồm:

```text
01. BA Overview
02. Lifecycle & Behavior Analysis
03. Functional Requirements & Business Rules
04. Use Cases & Acceptance Criteria
05. Product Specification
```

Các tài liệu trên cung cấp đủ product semantics để bắt đầu Domain Analysis.

```text
Product Intent
      ↓
User Need
      ↓
Lifecycle Semantics
      ↓
Requirements
      ↓
Business Rules
      ↓
Use Cases
      ↓
Acceptance Criteria
      ↓
Product Specification
```

---

# 29. Handoff to Domain Analysis

Bước tiếp theo không còn là BA discovery cho core Projects V1.

Phase tiếp theo:

**Projects V1 — Domain Analysis**

Domain Analysis cần trả lời:

```text
What domain concepts are required
to faithfully implement this Product Specification?
```

Các candidate cần được phân tích, nhưng chưa được mặc định là technical design cuối cùng:

```text
Project
Project Cycle
Project Lifecycle Transition
Intended Outcome
Lifecycle State
Cycle Boundary
```

Domain Analysis cần xác định:

- Aggregate boundary;
- Entity và Value Object candidate;
- domain invariant enforcement;
- lifecycle behavior ownership;
- Cycle representation;
- history representation;
- concurrency boundary;
- domain event candidate;
- relationships giữa current state và historical record.

Không được derive Domain Model chỉ từ database convenience.

Domain Model phải được derive từ behavior đã baseline trong Product Specification này.

---

# 30. Final Product Baseline

Projects V1 được baseline như một capability trong Crucible cho phép người dùng duy trì identity và lifecycle của những intentional effort xuyên thời gian.

Core semantics:

```text
Project
= continuity of an intentional effort

Project Cycle
= one pursuit period of that Project

Intended Outcome
= optional direction of a specific Cycle

NOT_STARTED
= Project exists but execution has not begun

ACTIVE
= current Cycle is actively pursued

PAUSED
= current Cycle temporarily interrupted

STOPPED
= current pursuit ended without declaring completion

COMPLETED
= user declares current pursuit complete

Reopen
= begin another Cycle of the same Project

Lifecycle History
= preserved evidence of what actually happened
```

Final behavior principle:

> **Project identity persists. Cycles change. Outcomes may evolve. History remains. The user decides what completion means.**
