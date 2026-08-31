# Journal — BA Overview

> **Status:** V1 Baseline / Reverse Analysis
> **Domain:** Reflection / Journal
> **Purpose:** Reconstruct and document the product intent, user needs, desired outcomes, and scope of the existing Journal V1 capability.

---

## 1. Context

Journal là một capability thuộc Reflection context của Magnum Opus.

Magnum Opus được định hướng là một hệ thống cá nhân dùng để quan sát, lưu giữ và nhìn lại cuộc sống theo thời gian.

Trong bối cảnh đó, những gì một người suy nghĩ, trải nghiệm và reflection cũng là một phần của record về cuộc đời họ.

Journal tồn tại để hỗ trợ việc ghi lại phần này.

---

## 2. Problem Statement

Tao thường nảy ra những suy nghĩ và ý tưởng trong quá trình suy nghĩ về những điều xảy ra trong cuộc sống.

Tuy nhiên, tao không có thói quen ghi lại chúng, khiến những suy nghĩ, ý tưởng và trải nghiệm đó dần trôi qua và không còn để tao quay lại xem sau này.

Trong khi đó, tao coi việc lưu giữ những suy nghĩ và reflection của mình là một phần của việc ghi lại cuộc đời.

---

## 3. Current State

Trước Journal V1, tao gần như không duy trì việc ghi nhật ký.

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

Viết bằng giấy không phải một phương thức phù hợp với sở thích của tao.

---

## 4. User Needs

### UN-JRN-001 — Capture

Tao cần có khả năng ghi lại những suy nghĩ, ý tưởng và những điều đã xảy ra mà tao muốn lưu giữ.

### UN-JRN-002 — Revisit & Reflect

Tao cần có khả năng quay lại những gì mình đã viết để đọc và reflection.

---

## 5. Supporting Needs and Expectations

### Content Presentation

Nội dung được ghi lại cần có khả năng được trình bày và định dạng để khi viết và khi đọc lại có cấu trúc, gọn gàng và dễ nhìn.

Markdown hiện là solution được lựa chọn để đáp ứng nhu cầu này.

### Emotional Context

Khi ghi lại một nội dung, tao muốn có khả năng lưu lại cảm xúc của mình tại thời điểm đó.

Emotional context giúp việc nhìn lại entry sau này không chỉ trả lời:

> "Tao đã nghĩ gì?"

mà còn cung cấp context:

> "Lúc đó tao cảm thấy thế nào?"

Mood hiện là capability được sử dụng để biểu diễn emotional context này.

### Temporal Context

Thời điểm một nội dung được ghi lại phải được lưu giữ chính xác.

Temporal context ở Journal V1 đề cập đến **thời điểm tao ghi nội dung**, không phải thời điểm sự kiện được nhắc đến trong nội dung xảy ra.

Ví dụ:

```text
Written At:
2026-08-31 20:30

Content:
"Hôm thứ Bảy tao đã..."
```

Entry vẫn thuộc thời điểm nó được viết, không phải thời điểm của sự kiện được mô tả.

---

## 6. Product Objective

Journal V1 nhằm cung cấp một cách để tao ghi lại và lưu giữ những suy nghĩ, ý tưởng và trải nghiệm mà tao muốn giữ lại, đồng thời cho phép tao quay lại những nội dung đó để đọc và reflection.

Journal V1 cũng hướng tới việc giảm khoảng cách giữa việc:

```text
"Tao vừa nghĩ ra một điều gì đó"
                ↓
       "Tao ghi nó lại"
```

Hệ thống có thể hỗ trợ hành vi ghi chép, nhưng việc tao có muốn viết tại một thời điểm cụ thể hay không không hoàn toàn nằm trong khả năng kiểm soát của hệ thống.

---

## 7. Desired Outcomes

### DO-JRN-001 — Increased Journaling

Tao chủ động ghi lại suy nghĩ, ý tưởng và trải nghiệm thường xuyên hơn so với trước khi sử dụng Journal.

### DO-JRN-002 — Revisit Past Writing

Tao có mong muốn quay lại đọc những nội dung mình đã ghi trước đây.

### DO-JRN-003 — Preserve Ideas

Những ý tưởng mà tao muốn giữ lại không còn đơn giản biến mất vì không được ghi lại.

### DO-JRN-004 — Encourage Reflection

Việc nhìn lại và reflection trên những gì đã viết xuất hiện thường xuyên hơn trong hành vi của tao.

### Success Interpretation

Các desired outcomes trên chủ yếu là qualitative.

Journal V1 không được coi là thất bại chỉ vì tao không viết trong một khoảng thời gian nhất định. Motivation của user không hoàn toàn nằm trong khả năng kiểm soát của hệ thống.

Thành công của Journal được đánh giá dựa trên việc capability có tạo ra đủ giá trị để tao chủ động sử dụng nó để ghi lại, xem lại và reflection hay không.

---

## 8. V1 Scope

### In Scope

#### SC-JRN-001 — Capture Written Content

Tao có thể ghi lại suy nghĩ, ý tưởng và trải nghiệm dưới dạng nội dung viết.

#### SC-JRN-002 — Format Content

Tao có thể định dạng nội dung để nội dung có cấu trúc, gọn gàng và dễ đọc lại.

#### SC-JRN-003 — Revisit Content

Tao có thể xem lại những nội dung đã ghi trước đây.

#### SC-JRN-004 — Preserve Emotional Context

Tao có thể ghi nhận cảm xúc tại thời điểm ghi để giữ lại emotional context của nội dung.

#### SC-JRN-005 — Explicit Completion

Tao có thể chủ động chốt một nội dung khi cảm thấy mình đã viết xong.

---

## 9. Out of Scope

Các capability sau không thuộc Desired Journal V1 Scope tại thời điểm baseline này:

- Tự động tạo insight từ nội dung đã viết.
- Liên kết Journal trực tiếp với Habit.
- Liên kết Journal trực tiếp với Routine.
- Chuyển nội dung Journal thành Memory.

Các capability hiện có trong implementation nhưng không nằm trong Desired V1 Scope sẽ được đánh giá riêng trong quá trình As-Is System Analysis và Gap Analysis.

Việc một capability đã tồn tại trong code không tự động có nghĩa capability đó thuộc Desired V1 Scope.

---

## 10. Seal Concept

Seal ban đầu xuất hiện trong quá trình thiết kế kỹ thuật của một implementation Journal trước đây.

Do nội dung được autosave trong quá trình viết, việc phát meaningful event trên mỗi lần autosave không phù hợp. Một explicit completion boundary vì vậy được đưa vào dưới dạng Seal.

Tuy nhiên, Seal không còn chỉ mang ý nghĩa kỹ thuật.

Đối với tao với tư cách user, Seal đại diện cho một **cú chốt**:

```text
Writing
   ↓
Draft
   ↓
"Tao viết xong rồi"
   ↓
Seal
   ↓
Completed Entry
```

Sau khi Seal, nội dung được coi là một entry hoàn chỉnh thay vì nội dung vẫn đang trong quá trình viết.

Do đó, mặc dù Seal có technical origin, explicit completion hiện có giá trị độc lập đối với user và được xem là một domain concept của Journal.

Các business rules cụ thể liên quan đến Seal, editing, reopening và state transition **chưa được xác định trong tài liệu này** và sẽ được phân tích riêng.

---

## 11. Analysis Principles

Journal V1 đã được implement trước khi formal BA documentation được xây dựng.

Tài liệu này vì vậy là một **reverse-analysis baseline**, không phải tài liệu requirement được tạo trước development.

Quá trình analysis tuân theo nguyên tắc:

```text
Existing code ≠ Requirement

Existing behavior
        ↓
Identify intent
        ↓
Trace to user need
        ↓
Validate
        ↓
Accepted V1 baseline
```

Không tạo requirement chỉ để hợp thức hóa một implementation đã tồn tại.

Nếu một existing capability không trace được về problem, user need, objective hoặc một requirement hợp lệ, capability đó sẽ được đánh dấu để review thay vì tự động đưa vào baseline.

---

## 12. Known Decisions

| ID          | Decision                                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| DEC-JRN-001 | Journal primarily records written thoughts, ideas and experiences.                                                         |
| DEC-JRN-002 | The relevant temporal context is when the entry is written, not necessarily when an event described by the entry occurred. |
| DEC-JRN-003 | Content formatting is desirable for readability; Markdown is the current solution choice.                                  |
| DEC-JRN-004 | Emotional context is meaningful when revisiting past writing.                                                              |
| DEC-JRN-005 | Explicit completion is meaningful to the user; Seal represents this completion boundary.                                   |
| DEC-JRN-006 | User motivation to write cannot be treated as behavior fully controlled by the system.                                     |

---

## 13. Open Analysis

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

These will be derived during the Journal V1 As-Is System Analysis rather than assumed from the current implementation.

---

## 14. Next Step

The next analysis phase is:

**Journal V1 — As-Is System Analysis & Gap Analysis**

The existing implementation will be examined to identify:

```text
Existing Capability
        ↓
Actual Behavior
        ↓
State Transition
        ↓
Business Rule Candidate
        ↓
User Need / Scope Trace
        ↓
Gap / Open Question
```

The resulting analysis will become the basis for subsequent:

- Functional Requirements
- Business Rules
- State Model
- Use Cases
- Acceptance Criteria
- Requirements Traceability
