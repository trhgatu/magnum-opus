# Crucible — BA Overview

> **Status:** V1 Baseline / Initial Analysis
>
> **Domain:** Crucible / Projects
>
> **Purpose:** Establish a BA baseline for Projects V1 by documenting its problem, user needs, desired outcomes, intended scope, and product/domain intent before implementation.

---

## 1. Related Documentation

### Product Specification

Chưa có.

Product Specification cho Projects V1 sẽ được xây dựng sau khi BA baseline đã đủ rõ.

### BA Baseline

Tài liệu này mô tả Projects V1 dưới góc nhìn Business Analysis, tập trung vào:

- Problem
- Current State
- User Needs
- Product Objective
- Desired Outcomes
- Desired Scope
- Product/Domain Intent
- Các assumption, decision và open question cần được validate

Khác với một số capability đã tồn tại trước khi formal BA documentation được xây dựng, Projects V1 đang được phân tích trước implementation.

Do đó, tài liệu này được sử dụng để xác định product intent và desired scope trước khi chuyển sang specification, domain modeling và implementation.

```text
User / Product Intent
        ↓
BA Discovery
        ↓
Validated V1 Baseline
        ↓
Product Specification
        ↓
Domain Analysis
        ↓
Implementation
```

---

## 2. Context

Projects là capability đầu tiên thuộc Crucible context của Magnum Opus.

Magnum Opus được định hướng là một hệ thống cá nhân dùng để quan sát, lưu giữ và hiểu cuộc sống theo thời gian.

Trong khi Reflection hỗ trợ việc ghi lại và nhìn lại những gì người dùng suy nghĩ, cảm nhận và trải nghiệm, một phần đáng kể khác của cuộc sống nằm ở những điều người dùng chủ động theo đuổi và đưa vào thực tế.

Crucible tồn tại để đại diện cho phần này.

Crucible được định hướng là context liên quan đến **intentional action** — nơi những ý định được chuyển thành hành động và được kiểm chứng thông qua thực tế.

Projects là capability đầu tiên được đưa vào Crucible nhằm biểu diễn những nỗ lực có chủ đích mà người dùng lựa chọn theo đuổi theo thời gian.

Ví dụ:

```text
Crucible

Project
├── Magnum Opus
├── Personal Portfolio
├── Client Website
└── Defined Learning Initiative
```

Crucible không được định nghĩa đơn thuần là nơi chứa Projects.

Projects chỉ là capability đầu tiên hiện đã xác định được nhu cầu.

Các capability khác chỉ được bổ sung vào Crucible khi có user need thực tế chứng minh sự cần thiết của chúng.

---

## 3. Problem Statement

Người dùng dành một phần đáng kể thời gian và công sức cho các project mà họ chủ động lựa chọn theo đuổi.

Tuy nhiên, Magnum Opus hiện chưa có capability để biểu diễn những effort này như một phần của record về cuộc sống.

Đối với software project, một phần activity hiện được ghi nhận thông qua các công cụ bên ngoài như GitHub hoặc WakaTime.

Các công cụ này có thể cung cấp những dữ liệu như:

```text
GitHub
├── Repository
├── Commit
├── Issue
├── Pull Request
└── Release

WakaTime
├── Coding Time
├── Language
└── Project Activity
```

Tuy nhiên, các dữ liệu trên chỉ mô tả một phần activity xảy ra trong quá trình thực hiện project.

Chúng không biểu diễn đầy đủ project dưới góc nhìn của người dùng:

- Project này là gì?
- Tại sao người dùng lựa chọn thực hiện nó?
- Project bắt đầu từ khi nào?
- Project hiện còn được theo đuổi hay không?
- Project đã thay đổi như thế nào theo thời gian?
- Người dùng đã đầu tư bao nhiêu effort vào project?
- Project đã tạo ra những outcome nào?
- Project có vai trò gì trong một giai đoạn của cuộc sống?
- Người dùng học được gì từ quá trình thực hiện project?

Ngoài ra, không phải mọi project đều là software project hoặc có thể được biểu diễn thông qua GitHub và WakaTime.

Do đó, việc dựa vào external tools không đủ để Magnum Opus hiểu những project mà người dùng đang hoặc đã từng theo đuổi.

Nếu không có một representation riêng cho Project, phần intentional effort này tiếp tục tồn tại rời rạc bên ngoài life model của Magnum Opus.

---

## 4. Current State

Hiện tại, các project mà người dùng thực hiện chủ yếu tồn tại trong những hệ thống hoặc nguồn thông tin riêng biệt.

Đối với software project:

```text
Project
   │
   ├── GitHub
   │     └── Development activity
   │
   ├── WakaTime
   │     └── Coding activity / time
   │
   └── Người dùng
         └── Context / intent / meaning
```

GitHub lưu giữ development activity.

WakaTime có thể lưu giữ coding activity và time investment.

Ý nghĩa của project đối với người dùng, lý do project tồn tại, lifecycle tổng thể và mối quan hệ của project với cuộc sống của người dùng chủ yếu vẫn tồn tại trong nhận thức của chính người dùng.

Magnum Opus hiện chưa có representation trung tâm để kết nối những thông tin này.

Current state có thể được biểu diễn như sau:

```text
Intent / Meaning
      │
      └──────────────► User memory

Development Activity
      │
      └──────────────► GitHub

Coding Effort
      │
      └──────────────► WakaTime

Magnum Opus
      │
      └──────────────► No Project representation
```

Kết quả là Magnum Opus có thể quan sát một số khía cạnh của cuộc sống nhưng chưa có khả năng ghi nhận một cách có cấu trúc những effort mà người dùng chủ động đầu tư để tạo ra một kết quả hoặc thay đổi.

---

## 5. User Needs

### UN-PRJ-001 — Represent Project

Người dùng cần có khả năng biểu diễn một project mà họ lựa chọn theo đuổi như một object độc lập trong Magnum Opus.

Project cần tồn tại độc lập với GitHub, WakaTime hoặc bất kỳ external integration nào.

### UN-PRJ-002 — Preserve Project Context

Người dùng cần có khả năng lưu giữ context cần thiết để sau này có thể hiểu project là gì và tại sao project đó tồn tại.

### UN-PRJ-003 — Track Project Lifecycle

Người dùng cần có khả năng nhận biết một project hiện đang ở đâu trong lifecycle của nó và ghi nhận khi trạng thái của project thay đổi.

### UN-PRJ-004 — Revisit Past Projects

Người dùng cần có khả năng quay lại xem những project đã từng theo đuổi, kể cả khi project không còn active.

Việc một project kết thúc không đồng nghĩa với việc record của project đó mất giá trị.

### UN-PRJ-005 — Remove a Project Created by Mistake

Người dùng cần có khả năng xóa vĩnh viễn một Project được ghi nhận nhầm hoặc không còn muốn giữ, miễn là Project đó chưa từng thực sự được theo đuổi.

Nhu cầu này khác với UN-PRJ-004: revisit phục vụ việc giữ lại record có giá trị, còn nhu cầu này phục vụ việc loại bỏ một record chưa từng có giá trị lịch sử.

---

## 6. Supporting Needs and Expectations

### Project Independence

Project phải có giá trị độc lập trong Magnum Opus mà không yêu cầu external integration.

```text
Project
   │
   ├── GitHub       optional
   ├── WakaTime     optional
   └── Goal         optional
```

External systems có thể cung cấp thêm evidence hoặc context cho Project nhưng không được định nghĩa sự tồn tại của Project.

### Project Context

Khi nhìn lại một Project, người dùng cần có đủ context để hiểu project đó đại diện cho effort nào.

Context tối thiểu cần thiết chưa được baseline ở giai đoạn này.

Các field cụ thể như description, purpose, intended outcome, dates hoặc metadata khác sẽ được xác định trong quá trình specification và domain analysis.

### Historical Preservation

Project không chỉ có giá trị trong thời gian đang được thực hiện.

Project đã hoàn thành hoặc không còn được theo đuổi vẫn có thể là một phần có ý nghĩa trong historical record của người dùng.

Do đó, lifecycle của Project cần hỗ trợ khả năng giữ lại lịch sử thay vì mặc định loại bỏ project khi nó không còn active.

---

## 7. Product Objective

Projects V1 nhằm cung cấp cho Magnum Opus một representation cơ bản cho những project mà người dùng chủ động lựa chọn theo đuổi.

Capability này hướng tới việc chuyển Project từ một concept chỉ tồn tại trong nhận thức của người dùng hoặc rải rác trong external tools thành một phần explicit của life model.

```text
Intentional Effort
        ↓
     Project
        ↓
Represented in Magnum Opus
        ↓
Preserved over time
```

Projects V1 không nhằm thay thế GitHub, Jira, Linear hoặc các project/task management tool khác.

Mục tiêu không phải quản lý toàn bộ execution của project.

Mục tiêu là giúp Magnum Opus biết:

> **Người dùng đang và đã từng lựa chọn đầu tư effort của mình vào những project nào.**

---

## 8. Desired Outcomes

### DO-PRJ-001 — Explicit Project Record

Những project có ý nghĩa đối với người dùng được biểu diễn rõ ràng trong Magnum Opus thay vì chỉ tồn tại trong external tools hoặc trong trí nhớ.

### DO-PRJ-002 — Current Project Awareness

Người dùng có thể nhìn vào Magnum Opus và nhận biết những project nào hiện đang được theo đuổi.

### DO-PRJ-003 — Preserve Project History

Những project đã từng được theo đuổi vẫn được giữ lại như một phần của historical record.

### DO-PRJ-004 — Enable Future Observation

Project representation tạo ra foundation để trong tương lai Magnum Opus có thể kết hợp Project với activity, effort, outcome và các context khác khi những nhu cầu đó được xác định.

### Success Interpretation

Projects V1 không được đánh giá dựa trên số lượng project được tạo hoặc số lượng activity được ghi nhận.

Một người dùng có thể chỉ có một vài project có ý nghĩa trong một khoảng thời gian dài.

Thành công của capability được đánh giá dựa trên việc Project representation có đủ hữu ích để người dùng chủ động sử dụng Magnum Opus như nơi ghi nhận những project mà họ thực sự quan tâm hay không.

Tín hiệu cụ thể: sau 4–6 tuần dùng thật, người dùng vẫn tự mở Magnum Opus để tạo hoặc cập nhật Project mà không cần nhắc nhở từ bên ngoài.

---

## 9. V1 Scope

### In Scope

#### SC-PRJ-001 — Create Project

Người dùng có thể tạo một Project để biểu diễn một effort mà họ lựa chọn theo đuổi.

#### SC-PRJ-002 — View Projects

Người dùng có thể xem các Project đã được ghi nhận.

#### SC-PRJ-003 — View Project Details

Người dùng có thể xem lại thông tin của một Project cụ thể.

#### SC-PRJ-004 — Update Project

Người dùng có thể cập nhật thông tin của Project khi understanding hoặc context của project thay đổi.

#### SC-PRJ-005 — Manage Project Lifecycle

Người dùng có thể ghi nhận sự thay đổi lifecycle của Project.

Các lifecycle state và transition cụ thể chưa được baseline trong tài liệu này.

#### SC-PRJ-006 — Preserve Historical Projects

Project không còn active vẫn có thể được giữ lại và xem lại như một phần của historical record.

#### SC-PRJ-007 — Delete a Project That Has Never Had a Cycle

Người dùng có thể xóa vĩnh viễn một Project khi Project đó chưa từng có bất kỳ Project Cycle nào (current lẫn historical).

Một khi Project đã từng có ít nhất một Project Cycle (tức đã từng Start hoặc Reopen), Project không thể bị xóa nữa, bất kể lifecycle state hiện tại là gì.

---

## 10. Out of Scope

Các capability sau không thuộc Desired Projects V1 Scope tại thời điểm baseline này:

- GitHub integration.
- WakaTime integration.
- Automatic activity ingestion.
- Coding time analytics.
- Commit / Pull Request / Issue tracking.
- Task management.
- Milestone management.
- Project analytics.
- Automatic insight generation.
- AI-based project analysis.
- Project scoring hoặc productivity scoring.
- Automatic Goal contribution analysis.
- Work session tracking.
- Project review.
- Outcome tracking.
- Reflection integration (Journal, Memory). Liên kết giữa Project và Reflection được dự kiến trong tương lai nhưng chưa có user need đủ rõ để baseline trong V1.

Các capability trên có thể được phân tích trong các version sau khi core Project model đã được sử dụng thực tế và xuất hiện user need rõ ràng.

Việc một capability có vẻ phù hợp với Crucible không tự động có nghĩa capability đó cần được đưa vào Projects V1.

---

## 11. Project Concept

### Definition

Project đại diện cho một **deliberate effort** mà người dùng chủ động lựa chọn theo đuổi nhằm tạo ra một outcome hoặc meaningful change có thể nhận biết được.

Project cung cấp structure cho một effort đủ có ý nghĩa để người dùng muốn:

- nhận diện nó như một effort riêng biệt;
- theo đuổi nó theo thời gian;
- ghi nhận lifecycle của nó;
- và có khả năng quay lại nhìn lại sau này.

Project không bị giới hạn trong professional work hoặc software development.

Ví dụ:

```text
Project
├── Build Magnum Opus
├── Build Personal Portfolio
├── Deliver Client Website
└── Complete a Defined Learning Initiative
```

### Project Characteristics

Một effort có thể được xem là Project khi:

1. Người dùng chủ động lựa chọn theo đuổi effort đó.
2. Effort hướng tới một outcome hoặc meaningful change có thể nhận biết được.
3. Effort diễn ra qua một khoảng thời gian thay vì chỉ là một isolated action.
4. Lifecycle của effort có ý nghĩa đối với người dùng.
5. Effort có một điểm kết thúc có thể nhận biết, dù thời điểm kết thúc chưa được xác định khi bắt đầu.

Project không bắt buộc phải có deadline hoặc completion date được biết trước tại thời điểm tạo.

### Project vs Goal

Goal mô tả một trạng thái hoặc hướng mà người dùng muốn đạt tới.

Project mô tả một effort được thực hiện trong thực tế.

Ví dụ:

```text
Goal
Become a stronger software engineer
        │
        ▼
Project
Build Magnum Opus
```

Một Project có thể đóng góp cho Goal nhưng không bắt buộc phải thuộc một Goal.

### Project vs Habit / Routine

Habit và Routine mô tả recurring behavior.

Project mô tả một identifiable effort.

```text
Routine
Code every evening

Project
Build Magnum Opus
```

Recurring behavior không tự động trở thành Project.

### Project vs Task

Task đại diện cho một unit of work cụ thể.

Project đại diện cho effort lớn hơn mà nhiều action có thể xảy ra bên trong.

```text
Project
Build Personal Portfolio
        │
        └── Task
            Implement contact form
```

Projects V1 không nhằm trở thành task management system.

### Project vs Ongoing Area

Một số khía cạnh của cuộc sống được duy trì liên tục và không có một intended outcome riêng biệt.

Ví dụ:

- Health
- Personal Finance
- Software Engineering Career
- Relationships

Các concept này không nên bị ép thành Project chỉ vì người dùng dành effort cho chúng.

Crucible hiện chưa baseline model cho ongoing Areas hoặc Responsibilities.

---

## 12. Crucible Concept

Crucible là context liên quan đến intentional action trong Magnum Opus.

Tên gọi Crucible biểu diễn nơi intention được đưa vào thực tế, trải qua execution và được kiểm chứng bởi reality.

```text
Intention
    ↓
Crucible
    ↓
Action
    ↓
Experience
    ↓
Outcome
```

Projects là capability đầu tiên được xác định trong context này.

```text
Crucible
    │
    └── Projects
```

Crucible không được định nghĩa bằng danh sách capability hiện tại.

Boundary của Crucible sẽ tiếp tục được xác định dựa trên những user need thực tế xuất hiện trong quá trình sử dụng Magnum Opus.

---

## 13. Analysis Principles

Projects V1 đang được phân tích trước implementation.

Do đó, quá trình analysis cần tránh việc thiết kế technical solution trước khi product need và domain intent đủ rõ.

Các nguyên tắc:

1. Không tạo requirement chỉ vì một field hoặc feature phổ biến trong project management software.
2. Không mặc định GitHub hoặc WakaTime model là Project domain model của Magnum Opus.
3. External integration không được quyết định sự tồn tại của Project.
4. Không đưa capability vào V1 chỉ vì capability đó có thể hữu ích trong tương lai.
5. Không thiết kế Magnum Opus thành Jira, Linear hoặc GitHub replacement nếu không có user need tương ứng.
6. Domain concept phải xuất phát từ cách Project có ý nghĩa đối với người dùng trong Magnum Opus.
7. Technical model chỉ được xây dựng sau khi expected behavior và business rules liên quan đã đủ rõ.
8. Các assumption chưa được validate phải được giữ dưới dạng assumption hoặc open question thay vì âm thầm chuyển thành requirement.

---

## 14. Assumptions

Các assumption dưới đây đang được giả định là đúng trong quá trình analysis nhưng chưa được validate qua thực tế sử dụng.

Nếu một assumption bị falsify trong quá trình dùng thật, các decision và requirement liên quan cần được re-evaluated.

| ID          | Assumption                                                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| ASM-PRJ-001 | Người dùng sẵn sàng tạo và cập nhật Project bằng tay mà không cần automation hay nhắc nhở.                                                     |
| ASM-PRJ-002 | Người dùng có thể phân biệt được Project với Ongoing Area tại thời điểm tạo mà không cần hướng dẫn thêm từ hệ thống.                           |
| ASM-PRJ-003 | Liên kết giữa Project và Reflection (Journal, Memory) có giá trị nhưng chưa cần thiết trong V1. Assumption này sẽ được validate sau V1 launch. |

---

## 15. Known Decisions

| ID          | Decision                                                                                                                                                                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-PRJ-001 | Projects là capability đầu tiên thuộc Crucible context.                                                                                                                                                                                                   |
| DEC-PRJ-002 | Project đại diện cho một deliberate effort mà người dùng chủ động lựa chọn theo đuổi.                                                                                                                                                                     |
| DEC-PRJ-003 | Project không bị giới hạn trong software hoặc professional work.                                                                                                                                                                                          |
| DEC-PRJ-004 | Project phải có thể tồn tại độc lập với GitHub, WakaTime hoặc external integration khác.                                                                                                                                                                  |
| DEC-PRJ-005 | Project không bắt buộc phải liên kết với Goal.                                                                                                                                                                                                            |
| DEC-PRJ-006 | Projects V1 không nhằm trở thành general-purpose task management system.                                                                                                                                                                                  |
| DEC-PRJ-007 | Project đã không còn active vẫn có giá trị như một historical record.                                                                                                                                                                                     |
| DEC-PRJ-008 | GitHub và WakaTime không thuộc core Projects V1 scope.                                                                                                                                                                                                    |
| DEC-PRJ-009 | Crucible không được định nghĩa đơn thuần là container của Projects; Projects chỉ là capability đầu tiên đã được xác định.                                                                                                                                 |
| DEC-PRJ-010 | Project chỉ có thể bị xóa vĩnh viễn khi chưa từng có bất kỳ Project Cycle nào (current lẫn historical) — không phải khi đang ở một state cụ thể. Một khi đã từng Start hoặc Reopen, Project không thể bị xóa. Đây là hard delete, không phải soft delete. |

---

## 16. Open Analysis

Các khu vực sau intentionally chưa được baseline:

- Archive semantics.
- Project naming rules.
- Description / purpose / intended outcome model.
- Start date semantics.
- Completion date semantics.
- Goal association.
- Duplicate Project behavior.
- Exception flows.
- Use Cases.
- Acceptance Criteria.
- Non-functional Requirements.
- GitHub integration.
- WakaTime integration.
- Activity model.
- Effort model.
- Outcome model.
- Requirements Traceability.

Các nội dung này sẽ được tiếp tục phân tích trong các phase sau.

---

## 17. Next Step

The next analysis phase is:

**Projects V1 — Use Cases & Acceptance Criteria**

Quá trình tiếp theo sẽ tập trung xác định:

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
