# Journal — BA Overview

> **Status:** V1 Baseline / Reverse Analysis
> **Domain:** Reflection / Journal
> **Purpose:** Establish a BA baseline for Journal V1 by documenting its problem, user needs, desired outcomes, intended scope, and validated product/domain intent.

---

## 1. Related Documentation

### Product Specification

`product/features/journal.md`

Tài liệu Product Specification mô tả Journal V1 ở mức feature/product, bao gồm intended behavior, scope, user flows, state model, business rules, API contract và trạng thái triển khai hiện tại.

### BA Baseline

Tài liệu này mô tả Journal V1 dưới góc nhìn Business Analysis, tập trung vào:

- Problem
- User Needs
- Product Objective
- Desired Outcomes
- Desired Scope
- Product/Domain Intent
- Các assumption, decision và conflict cần được trace hoặc validate

BA Baseline này được tạo sau khi Journal V1 đã được implement.

Vì vậy, nội dung trong tài liệu này không được mặc định là requirement đã tồn tại trước development.

Khi Product Specification, implementation hiện tại và BA Baseline không thống nhất với nhau, sự khác biệt phải được ghi nhận và phân tích thay vì âm thầm chỉnh một tài liệu để khớp với tài liệu còn lại.

```text
Product Specification
        +
Existing Implementation
        +
BA Discovery
        ↓
Comparison / Gap Analysis
        ↓
Accepted V1 Baseline
```

---

## 2. Context

Journal là một capability thuộc Reflection context của Magnum Opus.

Magnum Opus được định hướng là một hệ thống cá nhân dùng để quan sát, lưu giữ và nhìn lại cuộc sống theo thời gian.

Trong bối cảnh đó, những suy nghĩ, ý tưởng, trải nghiệm và reflection của người dùng cũng là một phần của record về cuộc sống của họ.

Journal tồn tại để hỗ trợ việc ghi lại và nhìn lại phần này theo thời gian.

---

## 3. Problem Statement

Người dùng thường nảy ra những suy nghĩ và ý tưởng trong quá trình suy nghĩ về những điều xảy ra trong cuộc sống.

Tuy nhiên, người dùng không duy trì thói quen ghi lại chúng một cách thường xuyên, khiến những suy nghĩ, ý tưởng và trải nghiệm đó dần trôi qua và không còn record để quay lại xem sau này.

Trong khi đó, việc lưu giữ những suy nghĩ và reflection được người dùng xem là một phần của việc ghi lại và nhìn lại cuộc sống của chính mình.

---

## 4. Current State

Trước Journal V1, người dùng gần như không duy trì việc ghi nhật ký.

Khi một suy nghĩ, ý tưởng hoặc trải nghiệm xuất hiện:

```text
Thought / Idea / Experience
            ↓
      Không được ghi lại
            ↓
          Trôi qua
            ↓
Không còn record để xem lại
```

Ghi chép bằng giấy không phải là phương thức phù hợp với sở thích và cách sử dụng của người dùng.

---

## 5. User Needs

### UN-JRN-001 — Capture

Người dùng cần có khả năng ghi lại những suy nghĩ, ý tưởng và trải nghiệm mà họ muốn lưu giữ.

### UN-JRN-002 — Revisit & Reflect

Người dùng cần có khả năng quay lại những gì đã viết để đọc và reflection.

---

## 6. Supporting Needs and Expectations

### Content Presentation

Nội dung được ghi lại cần có khả năng được trình bày và định dạng để khi viết và khi đọc lại có cấu trúc, gọn gàng và dễ nhìn.

Markdown hiện là solution được lựa chọn để đáp ứng nhu cầu này.

### Emotional Context

Người dùng cần có khả năng lưu lại cảm xúc của mình tại thời điểm ghi nội dung.

Emotional context giúp việc nhìn lại entry sau này không chỉ cung cấp thông tin về những gì người dùng đã suy nghĩ hoặc trải nghiệm, mà còn cung cấp context về trạng thái cảm xúc tại thời điểm đó.

Mood hiện là capability được sử dụng để biểu diễn emotional context này.

### Temporal Context

Thời điểm một nội dung được ghi lại phải được lưu giữ chính xác.

Temporal context ở Journal V1 đề cập đến **thời điểm người dùng ghi nội dung**, không phải thời điểm sự kiện được nhắc đến trong nội dung xảy ra.

Ví dụ:

```text
Written At:
2026-08-31 20:30

Content:
"Hôm thứ Bảy đã xảy ra..."
```

Entry vẫn thuộc thời điểm nó được viết, không phải thời điểm của sự kiện được mô tả.

---

## 7. Product Objective

Journal V1 nhằm cung cấp cho người dùng một cách để ghi lại và lưu giữ những suy nghĩ, ý tưởng và trải nghiệm mà họ muốn giữ lại, đồng thời cho phép họ quay lại những nội dung đó để đọc và reflection.

Journal V1 cũng hướng tới việc giảm khoảng cách giữa việc một suy nghĩ, ý tưởng hoặc trải nghiệm xuất hiện và việc người dùng thực sự ghi lại nó:

```text
Thought / Idea / Experience
            ↓
       Capture it
```

Hệ thống có thể hỗ trợ và giảm friction của hành vi ghi chép, nhưng việc người dùng có muốn viết tại một thời điểm cụ thể hay không không hoàn toàn nằm trong khả năng kiểm soát của hệ thống.

---

## 8. Desired Outcomes

### DO-JRN-001 — Increased Journaling

Người dùng chủ động ghi lại suy nghĩ, ý tưởng và trải nghiệm thường xuyên hơn so với trước khi sử dụng Journal.

### DO-JRN-002 — Revisit Past Writing

Người dùng có mong muốn quay lại đọc những nội dung đã ghi trước đây.

### DO-JRN-003 — Preserve Ideas

Những ý tưởng mà người dùng muốn giữ lại không còn đơn giản biến mất vì không được ghi lại.

### DO-JRN-004 — Encourage Reflection

Việc nhìn lại và reflection trên những gì đã viết xuất hiện thường xuyên hơn trong hành vi của người dùng.

### Success Interpretation

Các desired outcomes trên chủ yếu là qualitative.

Journal V1 không được coi là thất bại chỉ vì người dùng không viết trong một khoảng thời gian nhất định. Motivation của người dùng không hoàn toàn nằm trong khả năng kiểm soát của hệ thống.

Thành công của Journal được đánh giá dựa trên việc capability có tạo ra đủ giá trị để người dùng chủ động sử dụng nó nhằm ghi lại, xem lại và reflection hay không.

---

## 9. V1 Scope

### In Scope

#### SC-JRN-001 — Capture Written Content

Người dùng có thể ghi lại suy nghĩ, ý tưởng và trải nghiệm dưới dạng nội dung viết.

#### SC-JRN-002 — Format Content

Người dùng có thể định dạng nội dung để nội dung có cấu trúc, gọn gàng và dễ đọc lại.

#### SC-JRN-003 — Revisit Content

Người dùng có thể xem lại những nội dung đã ghi trước đây.

#### SC-JRN-004 — Preserve Emotional Context

Người dùng có thể ghi nhận cảm xúc tại thời điểm ghi để giữ lại emotional context của nội dung.

#### SC-JRN-005 — Explicit Completion

Người dùng có thể chủ động đánh dấu một nội dung là đã hoàn thành khi họ cảm thấy reflection tại thời điểm đó đã kết thúc.

---

## 10. Out of Scope

Các capability sau không thuộc Desired Journal V1 Scope tại thời điểm baseline này:

- Tự động tạo insight từ nội dung đã viết.
- Liên kết Journal trực tiếp với Habit.
- Liên kết Journal trực tiếp với Routine.
- Chuyển nội dung Journal thành Memory.

Các capability xuất hiện trong Product Specification hoặc implementation hiện tại nhưng không nằm trong Desired V1 Scope sẽ được đánh giá riêng trong quá trình Specification Analysis, As-Is System Analysis và Gap Analysis.

Việc một capability đã tồn tại trong Product Specification hoặc code không tự động có nghĩa capability đó thuộc Desired V1 Scope.

---

## 11. Seal Concept

Seal ban đầu xuất hiện trong quá trình thiết kế kỹ thuật của một implementation Journal trước đây.

Do nội dung được autosave trong quá trình viết, việc phát meaningful event trên mỗi lần autosave không phù hợp. Một explicit completion boundary vì vậy được đưa vào dưới dạng Seal.

Tuy nhiên, Seal không còn chỉ mang ý nghĩa kỹ thuật.

Từ góc nhìn của người dùng, Seal đại diện cho một **explicit completion point** — thời điểm người dùng chủ động xác nhận rằng reflection hiện tại đã hoàn thành.

```text
Writing
   ↓
Draft
   ↓
User considers the reflection complete
   ↓
Seal
   ↓
Completed Entry
```

Sau khi Seal, nội dung được coi là một entry hoàn chỉnh thay vì nội dung vẫn đang trong quá trình viết.

Do đó, mặc dù Seal có technical origin, explicit completion hiện có giá trị độc lập đối với người dùng và được xem là một domain concept của Journal.

Các business rules cụ thể liên quan đến Seal, editing, reopening và state transition **chưa được xác định trong tài liệu này** và sẽ được phân tích riêng.

---

## 12. Analysis Principles

Journal V1 đã được implement trước khi formal BA documentation được xây dựng.

Tài liệu này vì vậy là một **reverse-analysis baseline**, không phải requirement specification được tạo trước development.

Quá trình analysis sử dụng nhiều nguồn evidence:

```text
User / Product Intent
        +
Product Specification
        +
Existing Implementation
        +
Tests / Observed Behavior
        ↓
Analysis
        ↓
Validated V1 Baseline
```

Các nguyên tắc:

1. Existing code không tự động được coi là requirement.
2. Existing Product Specification không tự động được coi là validated business need.
3. Một feature đã tồn tại không đủ để chứng minh rằng feature đó thuộc Desired Scope.
4. Khi các nguồn evidence mâu thuẫn, conflict phải được ghi nhận và phân tích.
5. Requirement chỉ được baseline khi intent và expected behavior đã đủ rõ.
6. Không tạo requirement chỉ để hợp thức hóa implementation hiện tại.

---

## 13. Known Decisions

| ID          | Decision                                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| DEC-JRN-001 | Journal primarily records written thoughts, ideas and experiences.                                                         |
| DEC-JRN-002 | The relevant temporal context is when the entry is written, not necessarily when an event described by the entry occurred. |
| DEC-JRN-003 | Content formatting is desirable for readability; Markdown is the current solution choice.                                  |
| DEC-JRN-004 | Emotional context is meaningful when revisiting past writing.                                                              |
| DEC-JRN-005 | Explicit completion is meaningful to the user; Seal represents this completion boundary.                                   |
| DEC-JRN-006 | User motivation to write cannot be treated as behavior fully controlled by the system.                                     |

---

## 14. Open Analysis

The following areas have intentionally not yet been baselined:

- Functional Requirements
- Business Rules
- Journal lifecycle and state transitions
- Draft behavior
- Autosave behavior
- Seal rules
- Reopen rules
- Trash / Restore behavior
- Delete behavior
- Mood association rules
- Empty-content behavior
- Validation rules
- Exception flows
- Use Cases
- Acceptance Criteria
- Non-functional Requirements
- Traceability
- Existing implementation gaps

These will be derived during the Journal V1 Specification Analysis and As-Is System Analysis rather than assumed from the current implementation.

---

## 15. Known Baseline Conflicts

Các conflict dưới đây đã được phát hiện nhưng chưa được resolve.

### BC-JRN-001 — Journal → Memory Scope

**BA Discovery**

Chuyển Journal thành Memory hiện được xác định là ngoài Desired Journal V1 Scope.

**Product Specification**

`product/features/journal.md` hiện mô tả việc chủ động chọn lọc Journal thành Memory là capability có trong V1.

**Status**

Open.

Cần xác định liệu:

- capability này thuộc core Journal scope;
- đây là requirement của Memory context sử dụng Journal làm source;
- hoặc đây là feature đã được thêm trong implementation nhưng không thuộc Desired Journal scope.

---

### BC-JRN-002 — Primary Capture Friction

**Product Specification**

Product Specification nhấn mạnh interaction friction: nếu quá trình capture yêu cầu quá nhiều lựa chọn, khoảnh khắc có thể trôi qua.

**BA Discovery**

Discovery hiện tại cho thấy việc không ghi lại không chỉ đến từ interaction friction; motivation và thói quen viết của người dùng cũng là yếu tố đáng kể.

**Status**

Open.

Cần xác định interaction friction là:

- business problem chính;
- supporting UX concern;
- hay product assumption chưa được validate.

---

## 16. Next Step

The next analysis phase is:

**Journal V1 — Specification Analysis, As-Is System Analysis & Gap Analysis**

Product Specification và existing implementation sẽ được xem xét để xác định:

```text
Existing / Specified Capability
        ↓
Actual Behavior
        ↓
State Transition
        ↓
Business Rule Candidate
        ↓
User Need / Scope Trace
        ↓
Gap / Conflict / Open Question
```

Kết quả của quá trình này sẽ trở thành cơ sở cho:

- Functional Requirements
- Business Rules
- State Model
- Use Cases
- Acceptance Criteria
- Requirements Traceability
