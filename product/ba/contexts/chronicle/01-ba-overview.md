# Chronicle — BA Overview

> **Status:** Candidate / Draft
>
> **Domain:** Chronicle
>
> **Purpose:** Establish a BA baseline for Chronicle V1 by documenting
> its problem, user needs, desired outcomes, intended scope, and
> product/domain intent before implementation.

---

## 1. Context

Chronicle là context thứ tư của Magnum Opus, bên cạnh:

```text
Reflection  → Ghi lại những gì đang xảy ra
Forge       → Duy trì những gì lặp đi lặp lại
Crucible    → Theo đuổi những gì có chủ đích
Chronicle   → Nhìn lại những gì đã xảy ra
```

Chronicle tồn tại để aggregate và synthesis data từ tất cả contexts
khác theo một khoảng thời gian xác định — giúp người dùng hiểu mình
đã sống như thế nào trong một period cụ thể.

Chronicle không ghi nhận dữ liệu mới. Nó chỉ đọc và tổng hợp dữ liệu
đã tồn tại ở các context khác.

```text
Reflection ──┐
Forge      ──┤──→ Chronicle ──→ "Tháng này tôi đã sống thế nào?"
Crucible   ──┘
```

Reflection context đã có `Timeline` — một read model xuyên
Journal/Memory. Chronicle **không thay thế** Timeline; hai cái trả
lời hai câu hỏi khác nhau (chi tiết ở KD-CHR-008 §8).

---

## 2. Problem Statement

Magnum Opus hiện có đủ data để hiểu cuộc sống của người dùng:

```text
Habit check-ins     → Forge
Project lifecycle   → Crucible
Journal entries     → Reflection
Mood logs           → Reflection
Memories            → Reflection
Routine completions → Forge
```

Nhưng tất cả data đó tồn tại rời rạc trong từng module riêng biệt.

Không có nơi nào để người dùng nhìn thấy bức tranh tổng thể của
một tháng:

```text
"Tháng 8/2026 tôi đã:
→ Duy trì Habit tốt đến mức nào?
→ Theo đuổi Project nào?
→ Viết Journal bao nhiêu lần?
→ Cảm thấy thế nào?
→ Tạo ra Memory gì?"
```

Để trả lời câu hỏi đó, người dùng phải mở từng module, xem từng
thứ riêng lẻ, và tự tổng hợp trong đầu.

Nếu không có Chronicle, bức tranh tổng thể của cuộc sống theo tháng
không bao giờ được nhìn thấy một cách có cấu trúc.

---

## 3. User Needs

```text
UN-CHR-001 — See Monthly Overview
Người dùng cần có khả năng nhìn thấy tổng quan về một tháng cụ thể
— bao gồm data từ tất cả modules — tại một nơi duy nhất.

UN-CHR-002 — Navigate Between Months
Người dùng cần có khả năng di chuyển giữa các tháng để so sánh
và nhìn lại theo thời gian.

UN-CHR-003 — View Current Month in Progress
Người dùng cần có khả năng xem tháng hiện tại dù data chưa complete
— để biết mình đang ở đâu trong tháng này.

UN-CHR-004 — See Empty State for Months Without Data
Người dùng cần có khả năng navigate về các tháng trước khi Magnum
Opus tồn tại mà không bị lỗi — hệ thống hiển thị empty state với
zeros thay vì block navigation.
```

---

## 4. Product Objective

Chronicle V1 nhằm cung cấp cho người dùng một nơi duy nhất để nhìn
lại một tháng cụ thể — tổng hợp data từ tất cả modules của Magnum
Opus thành một bức tranh có cấu trúc.

```text
Raw data từ nhiều modules
        ↓
Chronicle aggregates
        ↓
"Tháng này tôi đã sống thế nào?"
```

Chronicle không thay thế bất kỳ module nào. Nó chỉ synthesis data
đã tồn tại.

---

## 5. Desired Outcomes

```text
DO-CHR-001 — Monthly Picture
Người dùng có thể nhìn vào Chronicle và hiểu ngay tháng đó họ đã
sống như thế nào — không cần mở từng module riêng lẻ.

DO-CHR-002 — Free Navigation Across Months
Người dùng có thể tự do di chuyển giữa các tháng để tự xem lại và
tự so sánh trong đầu. Chronicle không tính toán hay hiển thị bất kỳ
so sánh/xu hướng nào giữa các tháng — mỗi lần xem chỉ hiển thị số
liệu của đúng 1 tháng đang chọn (nhất quán với Out of Scope §7:
không có cross-month comparison hay trend chart trong V1).

DO-CHR-003 — Current Awareness
Người dùng biết mình đang ở đâu trong tháng hiện tại — "tuần còn
lại của tháng tôi cần làm gì để đạt được những gì mình muốn".
```

---

## 6. V1 Scope

### In Scope

```text
SC-CHR-001 — Monthly Chronicle View
Người dùng có thể xem Chronicle của một tháng cụ thể.

SC-CHR-002 — Month Navigation
Người dùng có thể navigate giữa các tháng bằng:
→ Previous / Next month controls
→ Calendar / month picker

SC-CHR-003 — Current Month View
Người dùng có thể xem tháng hiện tại dù chưa kết thúc.

SC-CHR-004 — Empty State
Tháng không có data hiển thị empty state với zeros,
không block navigation.

SC-CHR-005 — Habit Section
→ BUILD-type: completion rate, best streak, most consistent habit
→ QUIT-type: days since last relapse per habit

SC-CHR-006 — Project Section
→ Projects active trong tháng
→ Projects completed trong tháng
→ Projects stopped trong tháng

SC-CHR-007 — Journal Section
→ Số Journal entries trong tháng

SC-CHR-008 — Mood Section
→ Mood distribution trong tháng
→ Dominant mood

SC-CHR-009 — Memory Section
→ Số Memories được tạo trong tháng

SC-CHR-010 — Routine Section
→ Routine completion rate trong tháng
```

---

## 7. Out of Scope

```text
- Weekly / Quarterly / Yearly Chronicle.
- User-written reflection trong Chronicle
  (Chronicle là read-only, không có user input).
- Seal / lock mechanism (không cần vì read-only).
- Cross-month comparison trong cùng một view.
- AI-generated summary hay insight.
- Trend charts so sánh nhiều tháng.
- Export Chronicle ra PDF hay file.
- Notification nhắc nhở xem Chronicle.
- Task stats (Task module chưa tồn tại).
- Goal stats (Goal module chưa tồn tại).
- Habit trend so sánh tháng này vs tháng trước
  (chỉ show stats của tháng được chọn).
```

---

## 8. Known Decisions

```text
KD-CHR-001 — Chronicle Is Read-Only
Chronicle không nhận input từ người dùng. Toàn bộ data được
compute từ các modules khác. Không có create, update, delete.

KD-CHR-002 — Live Compute for the Current Month, Frozen Snapshot for Closed Months
Tháng hiện tại (chưa kết thúc) luôn compute real-time — không có gì
để "đóng băng" vì data còn đang tích lũy. Một tháng đã kết thúc (theo
owner's time zone, KD-CHR-011) được compute **đúng 1 lần** rồi persist
lại thành snapshot; những lần xem sau chỉ đọc lại snapshot đó, không
tính lại. Snapshot được tạo **lazy** — vào lần đầu tiên có request xem
tháng đã đóng đó, không phải qua scheduled job (tránh phải chọn giờ
"đóng tháng" chung cho mọi owner ở nhiều time zone khác nhau). Chronicle
vì vậy **có** một bảng lưu snapshot riêng (khác với bản nháp V1 ban đầu
nói "không có storage") — nhưng vẫn không có bất kỳ create/update/delete
nào do người dùng khởi tạo (KD-CHR-001 vẫn đúng).

KD-CHR-003 — Current Month Is Always Accessible
Người dùng không bị chặn xem tháng hiện tại dù chưa kết thúc.
Data được compute đến thời điểm hiện tại.

KD-CHR-004 — Empty State Uses Zeros
Tháng không có data (trước khi Magnum Opus tồn tại) hiển thị
zeros cho tất cả metrics, không block navigation, không throw error.

KD-CHR-005 — Chronicle Aggregates All Existing Modules
V1 aggregate tất cả modules đã tồn tại:
Habit, Routine, Project, Journal, Mood, Memory.
Module mới (Task, Goal) được thêm vào Chronicle khi chúng tồn tại.

KD-CHR-006 — Chronicle Is a Separate Context
Chronicle không thuộc Forge, Reflection hay Crucible.
Nó là context riêng với dependency một chiều:
Chronicle đọc từ các contexts khác,
không context nào depend vào Chronicle.

KD-CHR-007 — No Future Month Navigation
Người dùng không thể navigate về tháng trong tương lai.
Upper bound của navigation là tháng hiện tại.

KD-CHR-008 — Chronicle Coexists with Timeline, Does Not Replace It
Timeline trả lời "điều gì đã xảy ra" (event-based, granularity ngày,
chronological feed, không aggregation — giống nhật ký sự kiện).
Chronicle trả lời "tôi đã sống thế nào" (stats-based, granularity
tháng, aggregated view, có computation — giống báo cáo định kỳ).
Cùng nguồn dữ liệu ở phía Reflection (Journal/Memory), nhưng hai
read model độc lập, không cái nào thay thế cái kia.

KD-CHR-009 — Only the Current Month Can Drift
Nhờ KD-CHR-002 (snapshot khi tháng đã đóng), vấn đề "field mutable
sau khi tạo làm số liệu tháng cũ trôi theo thời gian" (isActive,
trashed state, title/description, nội dung Mood...) **chỉ còn xảy ra
với tháng hiện tại** — vì nó chưa có snapshot, vẫn compute real-time
mỗi lần xem. Ngay khi tháng đó kết thúc và snapshot đầu tiên được tạo,
số liệu đóng băng vĩnh viễn tại đúng state của các module lúc đó —
không cần cơ chế "point-in-time reconstruction" (lifecycle transition
log) cho field mutable nữa, vì không ai xem lại một tháng *đã đóng*
trước khi nó có snapshot. Rủi ro drift duy nhất còn lại: nếu người
dùng archive một Habit *trong chính tháng đó, trước khi tháng kết
thúc*, thì việc "Habit này có tính vào completion rate không" phụ
thuộc vào state tại đúng lúc snapshot được tạo (cuối tháng, theo
owner's time zone) — không phải một vấn đề xuyên nhiều tháng, xem
Open Analysis §10.

KD-CHR-010 — Chronicle Is Owner-Scoped
Mọi read model của Chronicle lọc theo `ownerId` của người dùng hiện
tại, nhất quán với mọi read model khác trong hệ thống (Timeline,
HabitReader, RoutineReader...). Không có chế độ xem chéo owner.

KD-CHR-011 — Month Boundary Uses the Owner's Time Zone
"Tháng hiện tại" và ranh giới đầu/cuối của một tháng được xác định
theo `User.timeZone` của owner, không phải UTC hay giờ server —
nhất quán với cách Today/Habit Check-in đã xác định "ngày nghiệp vụ"
(`resolveTodayCalendarDate`, xem `docs/modules/backend.md`).
```

---

## 9. Assumptions

```text
ASM-CHR-001 — Monthly Granularity Is Sufficient for V1
Người dùng muốn nhìn lại theo tháng trước khi cần weekly hay
yearly view. Monthly là granularity có giá trị nhất để bắt đầu.

ASM-CHR-002 — Read-Only Is Sufficient for V1
Người dùng không cần viết reflection trong Chronicle ở V1.
Nếu muốn reflect, Journal đã đủ. Chronicle chỉ cần show data.

ASM-CHR-003 — Live Compute for the Current Month Is Fast Enough
Chỉ tháng hiện tại cần compute real-time mỗi lần xem (tháng đã đóng
đọc snapshot, KD-CHR-002) — nên rủi ro hiệu năng thu hẹp lại đúng 1
tháng/owner tại một thời điểm, không phải toàn bộ lịch sử. Giả định
này vẫn chưa kiểm chứng bằng data thật, nhưng phạm vi rủi ro đã nhỏ
hơn nhiều so với thiết kế "compute mọi tháng, mọi lần" ban đầu.
```

---

## 10. Open Analysis

Các câu hỏi sau đã được chốt tại `02-domain-analysis.md` §5 (ngữ nghĩa
reader) và §7 (out of scope), không còn mở nữa:

```text
✓ Định nghĩa "active trong tháng" cho Project — 02-domain-analysis.md §5
✓ Habit completion rate cho tháng hiện tại — 02-domain-analysis.md §5
✓ QUIT-type Habit hiển thị gì — 02-domain-analysis.md §5
✓ Routine completion rate — 02-domain-analysis.md §5
✓ Lower bound của navigation — 02-domain-analysis.md §5
✓ Cơ chế invalidate snapshot khi có bug — chấp nhận không có,
  02-domain-analysis.md §7
✓ Buffer quanh ranh giới tháng — chấp nhận rủi ro, không thiết kế
  cơ chế trì hoãn, 02-domain-analysis.md §7
```

Còn lại, chưa chốt:

```text
- Chronicle Snapshot có cần expose qua API một field "computedAt"
  (khác createdAt của snapshot) để UI có thể hiện "số liệu này được
  tính lúc nào" không, hay chỉ cần ẩn đi vì người dùng không cần biết
  đây là snapshot hay live — quyết định ở tầng API Contract
  (03-api-contract.md), không phải domain.
```

---

## 11. Next Step

```text
01. BA Overview          ✓ done
        ↓
02. Domain Analysis       ✓ done (xem 02-domain-analysis.md)
        ↓
03. API Contract
        ↓
04. Implementation
```
