# Forge Temporal History — BA Overview

> **Status:** Candidate / Draft
>
> **Domain:** Forge (Habit, Routine)
>
> **Purpose:** Xác định vì sao Forge cần lưu lịch sử thay đổi của Habit và Routine thay vì ghi đè trạng thái hiện tại, phạm vi của thay đổi này, và những gì cố ý không làm.

---

## 0. Ghi chú về nguồn gốc tài liệu

Tài liệu này là **phân tích xuôi**, viết trước khi implement, phát sinh từ buổi rà soát thiết kế Chronicle (2026-10-08). Khi phân tích cơ chế snapshot của Chronicle (`../../chronicle/02-domain-analysis.md` §4), người phụ trách sản phẩm phát hiện rằng số liệu Habit/Routine của một tháng đã qua phụ thuộc vào **thời điểm tháng đó được mở xem lần đầu** — vì Forge chỉ giữ trạng thái hiện tại. Sau khi so sánh giải pháp tối thiểu (thêm `archivedAt`) với giải pháp lưu lịch sử đầy đủ, hướng lưu lịch sử đầy đủ được chọn.

---

## 1. Related Documentation

- `../habit/v1/*`, `../habit/v2/*` — baseline Habit (BUILD/QUIT, check-in, relapse). Tài liệu này mở rộng, không thay thế.
- Routine chưa có bộ BA riêng; hành vi hiện tại được mô tả trực tiếp trong tài liệu này ở mức cần thiết (§2).
- `../../chronicle/01-ba-overview.md`, `../../chronicle/02-domain-analysis.md` — consumer chính của lịch sử này.
- `../../crucible/project/*` — `ProjectLifecycleTransition`, pattern lịch sử đã có trong repo mà tài liệu này tái sử dụng.

---

## 2. Context

Forge hiện lưu Habit và Routine theo kiểu **ghi đè trạng thái**:

```text
Archive / khôi phục Habit     → đổi Habit.isActive true ↔ false
Archive / khôi phục Routine   → đổi Routine.isActive true ↔ false
Đổi tần suất Habit BUILD      → ghi đè Habit.frequencyType/frequencyDays
Thêm Habit vào Routine        → tạo dòng RoutineHabit
Gỡ Habit khỏi Routine         → xóa dòng RoutineHabit
```

Sau mỗi thao tác, trạng thái trước đó **mất hẳn**. Với các màn hình "hôm nay" (Today, check-in) điều này không sao — chúng chỉ cần trạng thái hiện tại.

Ngược lại, những gì đã là lịch sử thì đã được lưu đúng:

```text
HabitCheckIn   — mỗi check-in gắn với đúng ngày lịch của owner, chỉ
                 tạo được cho hôm nay (không ghi lùi) → bất biến
HabitRelapse   — mỗi lần tái phạm gắn với ngày → bất biến
```

---

## 3. Problem Statement

```text
Chronicle cần trả lời "trong tháng X, Habit/Routine của tôi đã thế
nào?". Để tính được, nó phải biết TẠI TỪNG NGÀY trong tháng X:

  - Habit/Routine này có đang hoạt động không?
  - Habit BUILD này đến hạn vào những ngày nào (tần suất lúc đó)?
  - Routine này gồm những Habit nào?

Forge chỉ trả lời được 3 câu hỏi đó cho HÔM NAY. Hệ quả khi xem lại
một tháng cũ:

  - Habit đã archive biến mất khỏi các tháng nó từng hoạt động —
    tỷ lệ hoàn thành, bestStreak, mostConsistentHabit đều sai.
  - Habit đã đổi tần suất bị tính "ngày đến hạn" của tháng cũ theo
    tần suất mới — tỷ lệ hoàn thành sai.
  - Routine đã thêm/gỡ Habit bị tính tháng cũ theo thành phần mới.

Snapshot của Chronicle chỉ "đóng băng" số liệu tại lần xem đầu tiên,
nên mức độ sai phụ thuộc vào việc người dùng mở tháng đó sớm hay muộn
— cùng một tháng có thể cho ra hai kết quả khác nhau tùy thời điểm.

Quan trọng hơn: lịch sử không được ghi lại hôm nay thì mất vĩnh viễn.
Mỗi ngày Forge còn ghi đè là thêm dữ liệu không bao giờ khôi phục được.
```

---

## 4. User Needs

```text
UN-FTH-001 — Honest Past
Người dùng cần nhìn lại một tháng đã qua và thấy đúng những gì mình
đã thực sự làm trong tháng đó — kể cả với Habit/Routine đã archive
hoặc đã thay đổi sau đó.

UN-FTH-002 — Stable Past
Người dùng cần một tháng đã qua cho ra cùng một kết quả bất kể họ mở
xem lúc nào — không phụ thuộc thứ tự hay thời điểm xem.

UN-FTH-003 — Change Without Fear
Người dùng cần được archive, khôi phục, đổi tần suất, sắp xếp lại
Routine thoải mái mà không lo làm "hỏng" số liệu của quá khứ.
```

---

## 5. Product Objective

Forge ghi lại mọi thay đổi có ảnh hưởng tới việc "một ngày có được tính hay không" dưới dạng **lịch sử có ngày hiệu lực**, để bất kỳ consumer nào (trước hết là Chronicle) dựng lại được trạng thái của Habit/Routine tại một ngày bất kỳ trong quá khứ.

---

## 6. Scope

### In Scope

```text
SC-FTH-001 — Habit Lifecycle History
Mỗi lần archive / khôi phục Habit được ghi thành 1 transition có ngày
hiệu lực.

SC-FTH-002 — Routine Lifecycle History
Mỗi lần archive / khôi phục Routine được ghi thành 1 transition có
ngày hiệu lực.

SC-FTH-003 — Habit Schedule History
Mỗi tần suất của Habit BUILD là 1 phiên bản có khoảng hiệu lực
[từ ngày, đến ngày). Đổi tần suất đóng phiên bản cũ, mở phiên bản mới.

SC-FTH-004 — Routine Membership History
Mỗi lần 1 Habit nằm trong 1 Routine là 1 khoảng [ngày thêm, ngày gỡ).

SC-FTH-005 — Backfill
Dữ liệu đã có trước khi tính năng này chạy được điền lịch sử gần đúng
(xem 02-domain-analysis.md §6), chấp nhận sai số cho quá khứ trước
thời điểm migration.
```

### Out of Scope

```text
- Thay đổi hành vi của bất kỳ màn hình hiện có (Today, Habit, Routine,
  check-in, relapse) — chúng vẫn đọc trạng thái hiện tại.
- API mới để người dùng xem lịch sử thay đổi của Habit/Routine.
  Lịch sử V1 chỉ phục vụ consumer nội bộ (Chronicle).
- Lịch sử cho thay đổi không ảnh hưởng tới việc tính ngày: đổi tên,
  mô tả, thứ tự Habit trong Routine.
- Lịch sử cho `Habit.quitStartedAt` — đây là sửa lại một sự thật
  ("tôi bắt đầu bỏ từ ngày nào"), không phải thay đổi theo thời gian;
  giá trị mới đúng cho cả quá khứ.
- Event sourcing toàn bộ Habit/Routine — quá tay so với nhu cầu.
- Cho phép sửa/xóa lịch sử, kể cả bởi admin.
```

---

## 7. Known Decisions

```text
KD-FTH-001 — History Is Append-Only and Owned by Forge
Lịch sử được ghi bởi chính Forge, trong cùng transaction với thao tác
gây ra nó, và không bao giờ bị sửa/xóa qua application layer — ngoại
lệ duy nhất là đóng khoảng hiệu lực đang mở (ghi `effectiveTo` /
`removedOn` từ null thành 1 ngày, đúng 1 lần). Chronicle chỉ đọc.

KD-FTH-002 — Reuse the Project Transition Pattern
Lifecycle history của Habit/Routine theo đúng pattern của
ProjectLifecycleTransition (aggregate phát sự kiện, repository ghi
trong cùng transaction) — không phát minh cơ chế mới.

KD-FTH-003 — Effective Dates Are the Owner's Calendar Dates
Mọi mốc hiệu lực được chốt thành NGÀY LỊCH của owner tại thời điểm
ghi (theo User.timeZone lúc đó), giống HabitCheckIn.date — không quy
đổi lại khi đọc. Nhờ vậy đổi múi giờ sau này không làm dịch lịch sử.

KD-FTH-004 — Current-State Tables Stay As They Are
Habit.isActive, Habit.frequencyType/frequencyDays, Routine.isActive,
RoutineHabit tiếp tục là nguồn sự thật cho trạng thái hiện tại. Lịch
sử là bảng bổ sung, không thay thế — các màn hình hiện có không cần
sửa. Thay đổi duy nhất trên bảng hiện có là thêm cột `createdOn`
(ngày lịch tạo) cho Habit và Routine (02 §3.5).

KD-FTH-005 — The Change Day Belongs to the New State
Thay đổi xảy ra trong ngày D có hiệu lực từ chính ngày D (hôm nay
tính theo trạng thái mới), nhất quán với Today vốn đọc trạng thái
hiện tại. Riêng archive: ngày D không còn được tính là ngày đến hạn —
không phạt người dùng vì một ngày họ đã quyết định dừng.

KD-FTH-006 — Same-Day Changes: Last One Wins, Nothing Is Rewritten
Nhiều thay đổi cùng loại trong cùng 1 ngày lịch: trạng thái cuối cùng
của ngày đó là trạng thái của cả ngày. Lịch sử vẫn ghi đủ từng thay
đổi — khoảng hiệu lực bị thay thế ngay trong ngày trở thành khoảng
rỗng [D, D), tự động không khớp với ngày nào khi đọc. Nhờ vậy lịch sử
chỉ có 2 thao tác ghi: thêm dòng mới, và đóng khoảng đang mở — không
bao giờ sửa ngược hay xóa dòng cũ.
```

---

## 8. Assumptions

```text
ASM-FTH-001 — Low Write Volume
Archive/khôi phục/đổi tần suất/thêm-gỡ Habit là thao tác hiếm; ghi
thêm 1 dòng lịch sử mỗi lần không ảnh hưởng hiệu năng.

ASM-FTH-002 — Backfill Approximation Is Acceptable
App hiện chỉ có dữ liệu của số ít người dùng, giai đoạn trước
migration ngắn. Dùng createdAt/updatedAt để điền lịch sử gần đúng là
chấp nhận được; sai số chỉ nằm trong quá khứ trước migration.
```

---

## 9. Next Step

```text
01. BA Overview        ✓ (tài liệu này)
02. Domain Analysis    → 02-domain-analysis.md
03. Database Schema    → 03-database-schema.md
04. Implementation     — 3 PR, mỗi PR xong trước reader Chronicle cần nó:
      PR 1: Habit + Routine lifecycle history
      PR 2: Habit schedule history
      PR 3: Routine membership history
```
