# Projects V1 — Use Cases & Acceptance Criteria

> **Status:** Analysis / Candidate Baseline
>
> **Domain:** Crucible / Projects
>
> **Purpose:** Mô tả các interaction chính giữa người dùng và Projects V1, đồng thời xác định Acceptance Criteria để kiểm chứng Functional Requirements và Business Rules đã được xác lập.

---

## 1. Related Documentation

### BA Overview

`01-ba-overview.md`

Xác định:

- Context;
- Problem Statement;
- User Needs;
- Product Objective;
- Desired Outcomes;
- V1 Scope;
- Out of Scope.

### Lifecycle & Behavior Analysis

`02-lifecycle-behavior-analysis.md`

Xác định:

- lifecycle states;
- state transition;
- Project Cycle;
- Cycle boundaries;
- reopen semantics;
- lifecycle history.

### Functional Requirements & Business Rules

`03-functional-requirements-business-rules.md`

Xác định:

- Functional Requirements;
- Business Rules;
- transition eligibility;
- intended outcome semantics;
- history preservation requirements.

---

## 2. Purpose of Use Case Analysis

Use Case Analysis chuyển requirement thành những interaction cụ thể giữa user và system.

```text
Functional Requirement
        +
Business Rule
        ↓
Use Case
        ↓
Preconditions
        ↓
User Interaction
        ↓
System Behavior
        ↓
Postconditions
        ↓
Acceptance Criteria
```

Mục tiêu của phase này là xác định behavior đủ rõ để:

- kiểm tra requirement consistency;
- phát hiện requirement gap;
- làm baseline cho Product Specification;
- hỗ trợ verification ở phase sau.

---

## 3. Use Case Principles

### UCP-PRJ-001 — Use Case Represents User Intent

Use Case đại diện cho một mục đích có ý nghĩa của người dùng.

Ví dụ:

```text
Start Project
Pause Project
Resume Project
Stop Project
Complete Project
Reopen Project
```

không được gom thành:

```text
Update Project Status
```

vì mỗi lifecycle action mang business semantics khác nhau.

---

### UCP-PRJ-002 — Acceptance Criteria Must Be Observable

Acceptance Criteria tập trung vào behavior có thể quan sát hoặc kiểm chứng được.

Acceptance Criteria không mô tả:

- API endpoint;
- database update;
- repository implementation;
- domain event implementation;
- framework behavior.

---

### UCP-PRJ-003 — Invalid Behavior Must Preserve Existing State

Khi một lifecycle action không hợp lệ:

- action phải bị từ chối;
- current state không thay đổi;
- current Cycle không bị thay đổi;
- lifecycle history không được ghi nhận như một successful transition.

---

### UCP-PRJ-004 — Historical Facts Must Survive Future Actions

Một lifecycle action mới không được rewrite historical facts đã xảy ra trước đó.

Ví dụ:

```text
Cycle 1 → COMPLETED
        ↓
      Reopen
        ↓
Cycle 2 → ACTIVE
```

không được làm mất fact:

```text
Cycle 1 đã từng COMPLETED.
```

---

# 4. Use Case Summary

Projects V1 có các Use Case:

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
```

---

# 5. UC-PRJ-001 — Create Project

## Goal

Cho phép người dùng ghi nhận một Project mới trong Crucible trước khi execution bắt đầu.

## Primary Actor

User

## Preconditions

Không có lifecycle precondition.

## Trigger

Người dùng muốn ghi nhận một effort mới như một Project.

## Input

Projects V1 yêu cầu:

```text
title       → required
description → optional
```

`Intended Outcome` không thuộc Project identity và không được yêu cầu khi tạo Project.

## Main Flow

1. Người dùng bắt đầu tạo Project.
2. Người dùng nhập `title`.
3. Người dùng có thể nhập `description`.
4. Người dùng xác nhận tạo Project.
5. Hệ thống tạo Project identity mới.
6. Hệ thống đặt Project ở `NOT_STARTED`.
7. Hệ thống không bắt đầu Project Cycle.
8. Hệ thống hiển thị Project đã được tạo.

## Postconditions

```text
Project exists
Project.state = NOT_STARTED
Current Cycle = none
Historical Cycles = none
```

## Related Requirements

```text
FR-PRJ-001 — Create Project
```

## Related Business Rules

```text
BR-PRJ-001
BR-PRJ-022
BR-PRJ-023
BR-PRJ-025
```

## Acceptance Criteria

### AC-PRJ-001-01 — Create Project With Required Information

```gherkin
Given người dùng muốn tạo một Project
When người dùng cung cấp một title hợp lệ
And xác nhận tạo Project
Then Project được tạo thành công
And Project có state là NOT_STARTED
```

### AC-PRJ-001-02 — Description Is Optional

```gherkin
Given người dùng muốn tạo một Project
When người dùng cung cấp title hợp lệ
And không cung cấp description
And xác nhận tạo Project
Then Project vẫn được tạo thành công
```

### AC-PRJ-001-03 — Title Is Required

```gherkin
Given người dùng đang tạo một Project
When người dùng không cung cấp title hợp lệ
And xác nhận tạo Project
Then Project không được tạo
And hệ thống yêu cầu title hợp lệ
```

### AC-PRJ-001-04 — Creation Does Not Start Execution

```gherkin
Given Project được tạo thành công
Then Project có state là NOT_STARTED
And execution chưa được xem là đã bắt đầu
```

### AC-PRJ-001-05 — Creation Does Not Start a Cycle

```gherkin
Given Project được tạo thành công
Then Project chưa có current Project Cycle
And chưa có historical Project Cycle
```

### AC-PRJ-001-06 — Outcome Is Not Required

```gherkin
Given người dùng tạo một Project
When intended outcome chưa được xác định
And các thông tin bắt buộc hợp lệ
Then Project vẫn được tạo thành công
```

---

# 6. UC-PRJ-002 — View Projects

## Goal

Cho phép người dùng xem và nhận diện các Project đã được ghi nhận trong Crucible.

## Primary Actor

User

## Preconditions

Không có lifecycle precondition.

## Trigger

Người dùng muốn xem các Project của mình.

## Main Flow

1. Người dùng mở Projects.
2. Hệ thống hiển thị các Project có thể được truy cập.
3. Mỗi Project hiển thị đủ thông tin để người dùng phân biệt Project đó với các Project khác.
4. Người dùng có thể chọn một Project để xem chi tiết.

## Postconditions

Không có lifecycle state nào thay đổi.

## Related Requirements

```text
FR-PRJ-002 — View Projects
```

## Acceptance Criteria

### AC-PRJ-002-01 — View Existing Projects

```gherkin
Given người dùng có các Project đã được ghi nhận
When người dùng mở danh sách Projects
Then hệ thống hiển thị các Project đó
And người dùng có thể phân biệt từng Project
```

### AC-PRJ-002-02 — Viewing Does Not Change Lifecycle

```gherkin
Given Project đang ở bất kỳ lifecycle state nào
When người dùng xem danh sách Projects
Then lifecycle state của Project không thay đổi
And Project Cycle không bị thay đổi
```

---

# 7. UC-PRJ-003 — View Project Details

## Goal

Cho phép người dùng xem context hiện tại của một Project cụ thể.

## Primary Actor

User

## Preconditions

- Project tồn tại.

## Trigger

Người dùng chọn xem một Project.

## Main Flow

1. Người dùng chọn Project.
2. Hệ thống hiển thị Project information.
3. Hệ thống hiển thị current lifecycle state.
4. Nếu Project có current Cycle, hệ thống có thể hiển thị context của current Cycle.
5. Nếu current Cycle có intended outcome, intended outcome hiện tại được hiển thị.

## Postconditions

Không có Project information hoặc lifecycle state nào thay đổi.

## Related Requirements

```text
FR-PRJ-003 — View Project Details
```

## Acceptance Criteria

### AC-PRJ-003-01 — View Current Project Information

```gherkin
Given Project tồn tại
When người dùng mở Project Details
Then người dùng có thể xem Project information hiện tại
And current lifecycle state
```

### AC-PRJ-003-02 — View Current Cycle Context

```gherkin
Given Project có current Project Cycle
When người dùng mở Project Details
Then current Cycle của Project được hiển thị
And intended outcome hiện tại được hiển thị nếu đã tồn tại
```

### AC-PRJ-003-03 — NOT_STARTED Has No Current Cycle

```gherkin
Given Project đang NOT_STARTED
And Project chưa từng được Start
When người dùng mở Project Details
Then Project không có current Project Cycle
```

---

# 8. UC-PRJ-004 — Update Project

## Goal

Cho phép người dùng cập nhật Project information mà không thay đổi lifecycle semantics.

## Primary Actor

User

## Preconditions

- Project tồn tại.

## Trigger

Người dùng muốn chỉnh sửa Project information.

## Editable Information in V1

```text
title
description
```

`Intended Outcome` không thuộc Use Case này.

## Main Flow

1. Người dùng mở Project.
2. Người dùng chọn chỉnh sửa Project information.
3. Người dùng cập nhật các field được phép.
4. Người dùng xác nhận thay đổi.
5. Hệ thống lưu Project information mới.
6. Lifecycle state không thay đổi.
7. Current Project Cycle không thay đổi.

## Postconditions

Project information phản ánh giá trị mới.

Lifecycle behavior không bị ảnh hưởng.

## Related Requirements

```text
FR-PRJ-004 — Update Project Information
```

## Related Business Rules

```text
BR-PRJ-002
BR-PRJ-024
```

## Acceptance Criteria

### AC-PRJ-004-01 — Update Project Information

```gherkin
Given Project tồn tại
When người dùng cập nhật Project information hợp lệ
Then thông tin mới được lưu
```

### AC-PRJ-004-02 — Update Does Not Change State

```gherkin
Given Project đang ở một lifecycle state
When người dùng cập nhật title hoặc description
Then lifecycle state không thay đổi
```

### AC-PRJ-004-03 — Update Does Not Affect Current Cycle

```gherkin
Given Project có current Project Cycle
When người dùng cập nhật Project information
Then current Project Cycle vẫn giữ nguyên
```

---

# 9. UC-PRJ-005 — Start Project

## Goal

Cho phép người dùng bắt đầu thực sự theo đuổi một Project đã được ghi nhận.

## Primary Actor

User

## Preconditions

- Project tồn tại.
- Project đang `NOT_STARTED`.
- Project chưa từng có Project Cycle.

## Trigger

Người dùng quyết định bắt đầu thực hiện Project.

## Main Flow

1. Người dùng chọn `Start`.
2. Hệ thống xác nhận Project đang `NOT_STARTED`.
3. Hệ thống bắt đầu `Cycle 1`.
4. Hệ thống chuyển Project sang `ACTIVE`.
5. Hệ thống preserve lifecycle transition.
6. Project trở thành Project có một current/open Cycle.

## Postconditions

```text
Project.state = ACTIVE

Current Cycle:
number = 1
status = open
intendedOutcome = undefined or defined later
```

## Related Requirements

```text
FR-PRJ-005 — Start Project
FR-PRJ-012 — Preserve Lifecycle History
FR-PRJ-013 — Preserve Project Cycles
```

## Related Business Rules

```text
BR-PRJ-003
BR-PRJ-020
BR-PRJ-023
BR-PRJ-025
```

## Acceptance Criteria

### AC-PRJ-005-01 — Start NOT_STARTED Project

```gherkin
Given Project đang NOT_STARTED
When người dùng Start Project
Then Project chuyển sang ACTIVE
And Cycle 1 bắt đầu
And Cycle 1 trở thành current Project Cycle
```

### AC-PRJ-005-02 — Start Preserves Lifecycle Transition

```gherkin
Given Project đang NOT_STARTED
When người dùng Start Project thành công
Then transition từ NOT_STARTED sang ACTIVE được preserve
```

### AC-PRJ-005-03 — Outcome Is Not Required to Start

```gherkin
Given Project đang NOT_STARTED
And intended outcome chưa được xác định
When người dùng Start Project
Then Project vẫn chuyển sang ACTIVE
And Cycle 1 vẫn được bắt đầu
```

### AC-PRJ-005-04 — Start Invalid Outside NOT_STARTED

```gherkin
Given Project không ở NOT_STARTED
When người dùng cố Start Project
Then action bị từ chối
And lifecycle state không thay đổi
And Project Cycle không bị thay đổi
```

---

# 10. UC-PRJ-006 — Pause Project

## Goal

Cho phép người dùng tạm thời ngưng execution của current Project Cycle trong khi vẫn giữ intention tiếp tục sau đó.

## Primary Actor

User

## Preconditions

- Project tồn tại.
- Project đang `ACTIVE`.
- Project có current/open Cycle.

## Trigger

Người dùng chọn `Pause`.

## Main Flow

1. Người dùng chọn `Pause`.
2. Hệ thống xác nhận Project đang `ACTIVE`.
3. Hệ thống chuyển Project sang `PAUSED`.
4. Current Project Cycle vẫn giữ nguyên.
5. Hệ thống preserve lifecycle transition.

## Postconditions

```text
Project.state = PAUSED
Current Cycle = same Cycle
Current Cycle.status = open
```

## Related Requirements

```text
FR-PRJ-006 — Pause Project
FR-PRJ-012 — Preserve Lifecycle History
FR-PRJ-013 — Preserve Project Cycles
```

## Related Business Rules

```text
BR-PRJ-004
BR-PRJ-012
```

## Acceptance Criteria

### AC-PRJ-006-01 — Pause ACTIVE Project

```gherkin
Given Project đang ACTIVE
When người dùng Pause Project
Then Project chuyển sang PAUSED
```

### AC-PRJ-006-02 — Pause Preserves Current Cycle

```gherkin
Given Project đang ACTIVE trong một current Project Cycle
When người dùng Pause Project
Then current Project Cycle không kết thúc
And không có Cycle mới được tạo
```

### AC-PRJ-006-03 — Pause Preserves History

```gherkin
Given Project đang ACTIVE
When người dùng Pause Project thành công
Then lifecycle transition sang PAUSED được preserve
```

### AC-PRJ-006-04 — Pause Invalid Outside ACTIVE

```gherkin
Given Project không ở ACTIVE
When người dùng cố Pause Project
Then action bị từ chối
And lifecycle state không thay đổi
And Project Cycle không bị thay đổi
```

---

# 11. UC-PRJ-007 — Resume Project

## Goal

Cho phép người dùng tiếp tục execution của một Project đang tạm dừng.

## Primary Actor

User

## Preconditions

- Project tồn tại.
- Project đang `PAUSED`.
- Project có current/open Cycle.

## Trigger

Người dùng chọn `Resume`.

## Main Flow

1. Người dùng chọn `Resume`.
2. Hệ thống xác nhận Project đang `PAUSED`.
3. Hệ thống chuyển Project sang `ACTIVE`.
4. Current Project Cycle vẫn giữ nguyên.
5. Hệ thống preserve lifecycle transition.

## Postconditions

```text
Project.state = ACTIVE
Current Cycle = same Cycle
Current Cycle.status = open
```

## Related Requirements

```text
FR-PRJ-007 — Resume Project
FR-PRJ-012 — Preserve Lifecycle History
FR-PRJ-013 — Preserve Project Cycles
```

## Related Business Rules

```text
BR-PRJ-005
BR-PRJ-013
```

## Acceptance Criteria

### AC-PRJ-007-01 — Resume PAUSED Project

```gherkin
Given Project đang PAUSED
When người dùng Resume Project
Then Project chuyển sang ACTIVE
```

### AC-PRJ-007-02 — Resume Preserves Current Cycle

```gherkin
Given Project đang PAUSED trong một current Project Cycle
When người dùng Resume Project
Then cùng Project Cycle tiếp tục
And không có Cycle mới được tạo
```

### AC-PRJ-007-03 — Resume Preserves History

```gherkin
Given Project đang PAUSED
When người dùng Resume Project thành công
Then lifecycle transition sang ACTIVE được preserve
```

### AC-PRJ-007-04 — Resume Invalid Outside PAUSED

```gherkin
Given Project không ở PAUSED
When người dùng cố Resume Project
Then action bị từ chối
And lifecycle state không thay đổi
And Project Cycle không bị thay đổi
```

---

# 12. UC-PRJ-008 — Stop Project

## Goal

Cho phép người dùng ngưng theo đuổi Project mà không tuyên bố Project đã hoàn thành.

## Primary Actor

User

## Preconditions

Project đang ở một trong các state:

```text
NOT_STARTED
ACTIVE
PAUSED
```

## Trigger

Người dùng chọn `Stop`.

---

## Main Flow A — Stop an Active Cycle

Áp dụng khi Project đang:

```text
ACTIVE
PAUSED
```

1. Người dùng chọn `Stop`.
2. Hệ thống xác nhận transition hợp lệ.
3. Hệ thống chuyển Project sang `STOPPED`.
4. Current Project Cycle kết thúc.
5. Intended outcome cuối cùng của Cycle được preserve nếu đã tồn tại.
6. Lifecycle transition được preserve.

## Postconditions

```text
Project.state = STOPPED
Current Cycle = none
Previous Cycle = closed
```

---

## Alternative Flow B — Stop Before First Start

Áp dụng khi Project đang:

```text
NOT_STARTED
```

1. Người dùng chọn `Stop`.
2. Hệ thống chuyển Project sang `STOPPED`.
3. Không có Project Cycle nào được tạo.
4. Lifecycle transition được preserve.

## Postconditions

```text
Project.state = STOPPED
Current Cycle = none
Historical Cycles = none
```

## Related Requirements

```text
FR-PRJ-008 — Stop Project
FR-PRJ-012 — Preserve Lifecycle History
FR-PRJ-013 — Preserve Project Cycles
```

## Related Business Rules

```text
BR-PRJ-006
BR-PRJ-007
BR-PRJ-008
BR-PRJ-014
BR-PRJ-021
BR-PRJ-027
BR-PRJ-028
```

## Acceptance Criteria

### AC-PRJ-008-01 — Stop ACTIVE Project

```gherkin
Given Project đang ACTIVE
When người dùng Stop Project
Then Project chuyển sang STOPPED
And current Project Cycle kết thúc
```

### AC-PRJ-008-02 — Stop PAUSED Project

```gherkin
Given Project đang PAUSED
When người dùng Stop Project
Then Project chuyển sang STOPPED
And current Project Cycle kết thúc
```

### AC-PRJ-008-03 — Stop NOT_STARTED Project

```gherkin
Given Project đang NOT_STARTED
And Project chưa từng có Project Cycle
When người dùng Stop Project
Then Project chuyển sang STOPPED
And không có Project Cycle nào được tạo
```

### AC-PRJ-008-04 — Closed Cycle Context Is Preserved

```gherkin
Given current Project Cycle có intended outcome
When Project được Stop
Then intended outcome cuối cùng được preserve cùng closed Cycle
```

### AC-PRJ-008-05 — Stop Reason Is Not Required

```gherkin
Given Project có thể được Stop
When người dùng không cung cấp stop reason
Then Stop action vẫn có thể hoàn thành
```

### AC-PRJ-008-06 — Invalid Stop Is Rejected

```gherkin
Given Project đang STOPPED hoặc COMPLETED
When người dùng cố Stop Project
Then action bị từ chối
And lifecycle history không bị thay đổi
```

---

# 13. UC-PRJ-009 — Complete Project

## Goal

Cho phép người dùng tuyên bố current Project Cycle đã hoàn thành.

## Primary Actor

User

## Preconditions

Project đang ở:

```text
ACTIVE
PAUSED
```

và có current/open Project Cycle.

## Trigger

Người dùng chọn `Complete`.

## Main Flow

1. Người dùng chọn `Complete`.
2. Hệ thống xác nhận Project đang `ACTIVE` hoặc `PAUSED`.
3. Hệ thống ghi nhận explicit completion decision của người dùng.
4. Hệ thống chuyển Project sang `COMPLETED`.
5. Current Project Cycle kết thúc.
6. Intended outcome cuối cùng được preserve nếu đã tồn tại.
7. Lifecycle transition được preserve.

## Postconditions

```text
Project.state = COMPLETED
Current Cycle = none
Previous Cycle = closed as completed
```

## Related Requirements

```text
FR-PRJ-009 — Complete Project
FR-PRJ-012 — Preserve Lifecycle History
FR-PRJ-013 — Preserve Project Cycles
```

## Related Business Rules

```text
BR-PRJ-009
BR-PRJ-010
BR-PRJ-011
BR-PRJ-015
BR-PRJ-021
BR-PRJ-025
BR-PRJ-028
```

## Acceptance Criteria

### AC-PRJ-009-01 — Complete ACTIVE Project

```gherkin
Given Project đang ACTIVE
When người dùng Complete Project
Then Project chuyển sang COMPLETED
And current Project Cycle kết thúc
```

### AC-PRJ-009-02 — Complete PAUSED Project

```gherkin
Given Project đang PAUSED
When người dùng Complete Project
Then Project chuyển sang COMPLETED
And current Project Cycle kết thúc
```

### AC-PRJ-009-03 — Completion Does Not Require Outcome

```gherkin
Given Project đang ACTIVE hoặc PAUSED
And current Project Cycle chưa có intended outcome
When người dùng Complete Project
Then Project vẫn có thể chuyển sang COMPLETED
And current Project Cycle kết thúc
```

### AC-PRJ-009-04 — System Does Not Verify Completion

```gherkin
Given Project đủ điều kiện để Complete
When người dùng quyết định Complete Project
Then hệ thống không yêu cầu proof rằng intended outcome đã đạt được
And completion decision thuộc về người dùng
```

### AC-PRJ-009-05 — Completed Cycle Context Is Preserved

```gherkin
Given current Project Cycle có intended outcome
When người dùng Complete Project
Then intended outcome cuối cùng được preserve cùng closed Cycle
```

### AC-PRJ-009-06 — Invalid Completion Is Rejected

```gherkin
Given Project không ở ACTIVE hoặc PAUSED
When người dùng cố Complete Project
Then action bị từ chối
And lifecycle state không thay đổi
And Project Cycle không bị thay đổi
```

---

# 14. UC-PRJ-010 — Reopen Project

## Goal

Cho phép người dùng bắt đầu một lần theo đuổi mới của cùng Project identity.

## Primary Actor

User

## Preconditions

Project đang ở:

```text
STOPPED
COMPLETED
```

## Trigger

Người dùng quyết định tiếp tục theo đuổi Project.

---

## Main Flow A — Reopen Project With Historical Cycles

1. Người dùng chọn `Reopen`.
2. Hệ thống xác nhận Project đang `STOPPED` hoặc `COMPLETED`.
3. Historical Cycles được giữ nguyên.
4. Hệ thống bắt đầu Project Cycle mới.
5. Cycle mới trở thành current/open Cycle.
6. Project chuyển sang `ACTIVE`.
7. Intended outcome của Cycle mới ban đầu chưa được xác định.
8. Hệ thống preserve reopen transition.

## Postconditions

Ví dụ:

```text
Before:

Cycle 1 → Closed
Cycle 2 → Closed
Project.state = COMPLETED

After Reopen:

Cycle 1 → Closed
Cycle 2 → Closed
Cycle 3 → Current / Open
Project.state = ACTIVE
```

---

## Alternative Flow B — Reopen Project That Never Started

Áp dụng khi lifecycle trước đó là:

```text
Project Created
      ↓
NOT_STARTED
      ↓
STOPPED
```

và chưa có Project Cycle.

1. Người dùng chọn `Reopen`.
2. Hệ thống chuyển Project sang `ACTIVE`.
3. Hệ thống bắt đầu `Cycle 1`.
4. Cycle 1 trở thành current/open Cycle.
5. Intended outcome ban đầu chưa được xác định.

## Related Requirements

```text
FR-PRJ-010 — Reopen Project
FR-PRJ-012 — Preserve Lifecycle History
FR-PRJ-013 — Preserve Project Cycles
```

## Related Business Rules

```text
BR-PRJ-016
BR-PRJ-017
BR-PRJ-018
BR-PRJ-019
BR-PRJ-020
BR-PRJ-023
BR-PRJ-025
```

## Acceptance Criteria

### AC-PRJ-010-01 — Reopen STOPPED Project

```gherkin
Given Project đang STOPPED
When người dùng Reopen Project
Then Project chuyển sang ACTIVE
And một Project Cycle mới được bắt đầu
```

### AC-PRJ-010-02 — Reopen COMPLETED Project

```gherkin
Given Project đang COMPLETED
When người dùng Reopen Project
Then Project chuyển sang ACTIVE
And một Project Cycle mới được bắt đầu
```

### AC-PRJ-010-03 — Reopen Preserves Project Identity

```gherkin
Given Project đang STOPPED hoặc COMPLETED
When người dùng Reopen Project
Then cùng Project identity được tiếp tục
And Project mới không được tạo
```

### AC-PRJ-010-04 — Reopen Preserves Previous Cycles

```gherkin
Given Project có một hoặc nhiều closed Project Cycles
When người dùng Reopen Project
Then các closed Cycle trước vẫn được preserve
And một Cycle mới được tạo thành current Cycle
```

### AC-PRJ-010-05 — New Cycle Does Not Inherit Previous Outcome

```gherkin
Given previous Project Cycle có intended outcome
When người dùng Reopen Project
Then intended outcome của previous Cycle vẫn được preserve
And intended outcome của new Cycle không được tự động copy
```

### AC-PRJ-010-06 — Reopen Does Not Require New Outcome

```gherkin
Given Project đủ điều kiện để Reopen
When người dùng chưa xác định intended outcome mới
Then Project vẫn có thể được Reopen
And new Cycle vẫn có thể bắt đầu
```

### AC-PRJ-010-07 — First Reopen May Create Cycle 1

```gherkin
Given Project đã chuyển từ NOT_STARTED sang STOPPED
And Project chưa từng có Project Cycle
When người dùng Reopen Project
Then Project chuyển sang ACTIVE
And Cycle 1 được bắt đầu
```

### AC-PRJ-010-08 — Reopen Invalid Outside Closed States

```gherkin
Given Project không ở STOPPED hoặc COMPLETED
When người dùng cố Reopen Project
Then action bị từ chối
And lifecycle state không thay đổi
And Project Cycle không bị thay đổi
```

---

# 15. UC-PRJ-011 — Manage Current Cycle Intended Outcome

## Goal

Cho phép người dùng xác định hoặc làm rõ kết quả hoặc thay đổi mà họ hiện muốn hướng tới trong current Project Cycle.

## Primary Actor

User

## Preconditions

- Project tồn tại.
- Project có current/open Project Cycle.
- Project đang `ACTIVE` hoặc `PAUSED`.

## Trigger

Người dùng muốn xác định, bổ sung hoặc cập nhật intended outcome của current Cycle.

---

## Main Flow A — Define Intended Outcome

1. Người dùng mở Project có current Cycle.
2. Current Cycle chưa có intended outcome.
3. Người dùng nhập intended outcome.
4. Người dùng xác nhận thay đổi.
5. Hệ thống lưu intended outcome vào current Cycle.
6. Lifecycle state không thay đổi.
7. Current Cycle không thay đổi.

## Postconditions

```text
Same Project
Same Cycle
Same Lifecycle State
Current Cycle now has Intended Outcome
```

---

## Main Flow B — Update Intended Outcome

1. Current Cycle đã có intended outcome.
2. Người dùng chỉnh sửa intended outcome.
3. Người dùng xác nhận thay đổi.
4. Hệ thống thay thế current intended outcome bằng giá trị mới.
5. Lifecycle state không thay đổi.
6. Current Cycle không thay đổi.

Trong Projects V1, hệ thống không yêu cầu preserve revision history của outcome trước đó.

## Related Requirements

```text
FR-PRJ-011 — Manage Current Cycle Intended Outcome
```

## Related Business Rules

```text
BR-PRJ-024
BR-PRJ-025
BR-PRJ-026
BR-PRJ-027
```

## Acceptance Criteria

### AC-PRJ-011-01 — Define Outcome While ACTIVE

```gherkin
Given Project đang ACTIVE
And current Cycle chưa có intended outcome
When người dùng xác định intended outcome
Then intended outcome được lưu vào current Cycle
And Project vẫn ở ACTIVE
```

### AC-PRJ-011-02 — Update Outcome While ACTIVE

```gherkin
Given Project đang ACTIVE
And current Cycle đã có intended outcome
When người dùng cập nhật intended outcome
Then giá trị mới trở thành current intended outcome
And Project vẫn ở ACTIVE
And current Cycle vẫn giữ nguyên
```

### AC-PRJ-011-03 — Define Outcome While PAUSED

```gherkin
Given Project đang PAUSED
And current Cycle chưa có intended outcome
When người dùng xác định intended outcome
Then intended outcome được lưu vào current Cycle
And Project vẫn ở PAUSED
```

### AC-PRJ-011-04 — Update Outcome While PAUSED

```gherkin
Given Project đang PAUSED
And current Cycle đã có intended outcome
When người dùng cập nhật intended outcome
Then giá trị mới trở thành current intended outcome
And Project vẫn ở PAUSED
And current Cycle vẫn giữ nguyên
```

### AC-PRJ-011-05 — Outcome Update Does Not Start a New Cycle

```gherkin
Given Project có current/open Cycle
When người dùng xác định hoặc cập nhật intended outcome
Then không có Project Cycle mới được tạo
```

### AC-PRJ-011-06 — Outcome Update Does Not Change Lifecycle State

```gherkin
Given Project đang ACTIVE hoặc PAUSED
When người dùng cập nhật intended outcome
Then lifecycle state của Project không thay đổi
```

### AC-PRJ-011-07 — Outcome Revision History Is Not Required

```gherkin
Given current Cycle đã có intended outcome
When người dùng cập nhật intended outcome
Then giá trị mới thay thế current intended outcome
And Projects V1 không yêu cầu preserve previous outcome như một product-level revision
```

### AC-PRJ-011-08 — Closed Cycle Outcome Cannot Be Modified

```gherkin
Given một Project Cycle đã kết thúc bằng STOPPED hoặc COMPLETED
When người dùng cố cập nhật intended outcome của Cycle đó
Then action bị từ chối
And intended outcome đã được preserve không thay đổi
```

---

# 16. UC-PRJ-012 — Delete Project

## Goal

Cho phép người dùng xóa vĩnh viễn một Project được ghi nhận nhầm hoặc không còn muốn giữ, miễn là Project đó chưa từng có bất kỳ Project Cycle nào.

## Primary Actor

User

## Preconditions

- Project tồn tại.
- Project chưa từng có bất kỳ Project Cycle nào — current lẫn historical.

## Trigger

Người dùng quyết định xóa một Project chưa từng thực sự được theo đuổi.

## Main Flow

1. Người dùng chọn xóa Project.
2. Hệ thống xác nhận Project chưa từng có Project Cycle nào.
3. Hệ thống xóa vĩnh viễn Project.
4. Project không còn tồn tại trong hệ thống.

## Postconditions

```text
Project no longer exists
Deletion cannot be undone
```

## Related Requirements

```text
FR-PRJ-014 — Delete Project
```

## Related Business Rules

```text
BR-PRJ-029
BR-PRJ-030
BR-PRJ-031
```

## Acceptance Criteria

### AC-PRJ-012-01 — Delete NOT_STARTED Project

```gherkin
Given Project đang NOT_STARTED
And Project chưa từng có Project Cycle nào
When người dùng xóa Project
Then Project không còn tồn tại trong hệ thống
```

### AC-PRJ-012-02 — Delete Allowed for STOPPED Project That Never Started

```gherkin
Given Project đã chuyển từ NOT_STARTED sang STOPPED
And Project chưa từng Start hoặc Reopen
And Project chưa từng có Project Cycle nào
When người dùng xóa Project
Then Project không còn tồn tại trong hệ thống
```

### AC-PRJ-012-03 — Delete Is Rejected Once a Cycle Has Ever Existed

```gherkin
Given Project đã từng có ít nhất một Project Cycle
And Project hiện đang ACTIVE, PAUSED, STOPPED hoặc COMPLETED
When người dùng cố xóa Project
Then action bị từ chối
And Project vẫn tồn tại không thay đổi
```

### AC-PRJ-012-04 — Delete Is Irreversible

```gherkin
Given Project đã bị xóa thành công
When người dùng cố truy cập lại Project đó
Then hệ thống báo Project không tồn tại
And không có cơ chế khôi phục
```

---

# 17. Cross-Use-Case Lifecycle Invariants

Các Use Case lifecycle phải cùng tuân theo các invariant sau.

## 16.1. At Most One Current Cycle

```text
Project
→ 0 or 1 current/open Cycle
```

Không có trường hợp:

```text
Cycle N     → Current
Cycle N + 1 → Current
```

cùng lúc.

---

## 16.2. NOT_STARTED Has No Cycle

```text
Project Created
      ↓
NOT_STARTED
      ↓
No Current Cycle
```

Cycle đầu tiên chỉ bắt đầu khi Project bước vào `ACTIVE`.

---

## 16.3. Pause and Resume Stay Within the Same Cycle

```text
ACTIVE
   ↓
PAUSED
   ↓
ACTIVE
```

không tạo Cycle mới.

---

## 16.4. Stop and Complete Close an Existing Cycle

Nếu current Cycle tồn tại:

```text
ACTIVE / PAUSED
        ↓
STOPPED / COMPLETED
        ↓
Current Cycle closes
```

---

## 16.5. Reopen Starts a New Cycle

```text
STOPPED / COMPLETED
        ↓
      Reopen
        ↓
      ACTIVE
        ↓
    New Cycle
```

---

## 16.6. Outcome Is Cycle Context

```text
Project
    │
    ├── Cycle 1
    │     └── Intended Outcome A
    │
    ├── Cycle 2
    │     └── Intended Outcome B
    │
    └── Cycle 3
          └── Intended Outcome optional
```

Outcome không thuộc cố định vào Project identity.

---

## 16.7. User Owns Completion Decision

```text
System
→ validates transition eligibility

User
→ decides whether to Complete
```

System không phán xét outcome thay người dùng.

---

# 18. Use Case Traceability

| Use Case                                             | Functional Requirement                   |
| ---------------------------------------------------- | ---------------------------------------- |
| `UC-PRJ-001` — Create Project                        | `FR-PRJ-001`                             |
| `UC-PRJ-002` — View Projects                         | `FR-PRJ-002`                             |
| `UC-PRJ-003` — View Project Details                  | `FR-PRJ-003`                             |
| `UC-PRJ-004` — Update Project                        | `FR-PRJ-004`                             |
| `UC-PRJ-005` — Start Project                         | `FR-PRJ-005`, `FR-PRJ-012`, `FR-PRJ-013` |
| `UC-PRJ-006` — Pause Project                         | `FR-PRJ-006`, `FR-PRJ-012`, `FR-PRJ-013` |
| `UC-PRJ-007` — Resume Project                        | `FR-PRJ-007`, `FR-PRJ-012`, `FR-PRJ-013` |
| `UC-PRJ-008` — Stop Project                          | `FR-PRJ-008`, `FR-PRJ-012`, `FR-PRJ-013` |
| `UC-PRJ-009` — Complete Project                      | `FR-PRJ-009`, `FR-PRJ-012`, `FR-PRJ-013` |
| `UC-PRJ-010` — Reopen Project                        | `FR-PRJ-010`, `FR-PRJ-012`, `FR-PRJ-013` |
| `UC-PRJ-011` — Manage Current Cycle Intended Outcome | `FR-PRJ-011`                             |
| `UC-PRJ-012` — Delete Project                        | `FR-PRJ-014`                             |

---

# 19. Current V1 Interaction Model

```text
Create Project
      ↓
NOT_STARTED
      │
      ├──────────────── Stop
      │                   ↓
      │                STOPPED
      │                   │
      │                 Reopen
      │                   ↓
      │                 Cycle 1
      │                   ↓
      │                 ACTIVE
      │
    Start
      ↓
   Cycle 1
      ↓
    ACTIVE
      │
      ├──── Define / Update Outcome
      │
      ├──── Pause ─────────────→ PAUSED
      │                           │
      │                     Define / Update Outcome
      │                           │
      │                         Resume
      │                           │
      │                           ▼
      │                         ACTIVE
      │
      ├──── Stop ──────────────→ STOPPED
      │                           │
      │                         Reopen
      │                           │
      │                           ▼
      │                       New Cycle
      │                           │
      │                           ▼
      │                         ACTIVE
      │
      └──── Complete ──────────→ COMPLETED
                                  │
                                Reopen
                                  │
                                  ▼
                              New Cycle
                                  │
                                  ▼
                                ACTIVE
```

---

# 20. Remaining Open Analysis

Use Case analysis hiện tại vẫn chưa baseline các vấn đề sau:

## 20.1. Lifecycle History UI

Đã được chốt: defer khỏi V1.

Lifecycle history được preserve nhưng dedicated history UI không thuộc V1 scope. Xem FR doc mục 12 Out of Scope.

---

## 20.2. Cycle Presentation

Chưa xác định user-facing presentation của:

```text
Cycle 1
Cycle 2
Cycle 3
```

Cycle numbering hiện là domain concept.

Việc expose trực tiếp numbering cho người dùng vẫn cần được xác nhận.

---

## 20.3. Business Timestamps

Một số timestamp đã được chốt là bắt buộc trong V1 tại FR doc mục 13.2.

Việc expose timestamp nào như user-facing information trong Project Detail hoặc Cycle context chưa được xác định và có thể được làm rõ trong Product Specification.

---

## 20.4. Archive

Delete đã được baseline: xem `UC-PRJ-012` và `03-functional-requirements-business-rules.md` mục 8.

Archive chưa thuộc lifecycle baseline hiện tại.

`ARCHIVED` không phải Project lifecycle state.

---

# 21. Analysis Result

Use Case analysis hiện tại xác nhận mô hình behavior:

```text
Project
= identity and continuity

Project Cycle
= one pursuit period

Lifecycle State
= current execution condition

Intended Outcome
= optional intention of a specific Cycle

Lifecycle History
= record of what happened

Completion
= explicit user judgment
```

Các lifecycle behavior đã có đủ semantics để chuyển sang Product Specification mà chưa cần quyết định technical representation.

---

# 22. Next Step

Phase tiếp theo:

**Projects V1 — Product Specification**

Product Specification sẽ consolidate các decision đã baseline từ:

```text
01. BA Overview
02. Lifecycle & Behavior Analysis
03. Functional Requirements & Business Rules
04. Use Cases & Acceptance Criteria
```

thành một specification thống nhất mô tả Projects V1 phải hoạt động như thế nào.

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
Aggregate / State Model
        ↓
API / Contracts
        ↓
Persistence Design
        ↓
Implementation
        ↓
Verification
```

Các Open Analysis còn lại không nhất thiết phải chặn Product Specification nếu chúng được ghi nhận rõ là unresolved hoặc deferred khỏi V1.
