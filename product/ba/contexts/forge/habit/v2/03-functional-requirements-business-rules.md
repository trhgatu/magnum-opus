# Habit V2 — Functional Requirements & Business Rules (Quit-Type Habit)

> **Status:** Implemented (Backend PR #96, Frontend PR #97)
>
> **Domain:** Forge / Habit

---

## 1. Related Documentation

`01-ba-overview.md`, `02-lifecycle-behavior-analysis.md` (V2).

---

# 2. Functional Requirements

## FR-HAB2-001 — Create Quit-Type Habit

Hệ thống phải cho phép người dùng tạo một Habit thuộc loại QUIT với `title` (bắt buộc), `description` (tùy chọn), `quitStartedAt` (bắt buộc, mặc định hôm nay).

### Traceability

```text
UN-HAB-006, UN-HAB-007
```

## FR-HAB2-002 — Log a Relapse

Hệ thống phải cho phép người dùng ghi nhận một lần tái phạm cho Habit thuộc loại QUIT, tại bất kỳ thời điểm nào, không giới hạn số lần/ngày.

### Traceability

```text
UN-HAB-009
```

## FR-HAB2-003 — View Time Since Last Relapse

Hệ thống phải cho phép người dùng xem "đã bao lâu không tái phạm" cho Habit thuộc loại QUIT.

### Traceability

```text
UN-HAB-008
```

## FR-HAB2-004 — Filter Habits by Type

Hệ thống phải cho phép người dùng lọc danh sách Habit theo loại (BUILD / QUIT).

### Traceability

```text
UN-HAB-006
```

## FR-HAB2-005 — Update Quit-Type Habit

Hệ thống phải cho phép người dùng cập nhật `title`, `description`, `quitStartedAt` của một Habit QUIT đang hoạt động (`KD-HAB2-009`).

## FR-HAB2-006 — Archive/Restore Quit-Type Habit

Hệ thống phải cho phép người dùng tạm ngưng/khôi phục theo dõi một Habit QUIT, dùng chung cơ chế Archive/Restore đã có (`FR-HAB-005`/`006`).

---

# 3. Business Rules

## BR-HAB2-001 — QUIT-Type Has No Frequency

Habit thuộc loại QUIT không có `frequency`. Trường này không áp dụng và không được yêu cầu khi tạo/sửa.

## BR-HAB2-002 — QUIT-Type Requires a Quit Start Date

Habit thuộc loại QUIT bắt buộc phải có `quitStartedAt` tại thời điểm tạo. Mặc định là ngày tạo nếu người dùng không chỉ định khác.

## BR-HAB2-003 — Relapse Logging Is Append-Only

Mỗi lần ghi nhận tái phạm tạo một bản ghi mới, độc lập, có `occurredAt`. Không có giới hạn số bản ghi trong 1 ngày, không có cơ chế idempotent theo ngày (khác `HabitCheckIn`).

## BR-HAB2-004 — Progress Derives from the Most Recent Relapse On or After Quit Start

"Ngày không tái phạm" được tính bằng thời điểm hiện tại trừ đi bản ghi relapse gần nhất **có `occurredAt >= quitStartedAt` hiện tại**; nếu không có relapse nào thỏa điều kiện đó (kể cả khi có relapse cũ hơn `quitStartedAt`), tính từ `quitStartedAt`.

Hệ quả: nếu `quitStartedAt` được sửa lùi về sau (thành ngày muộn hơn 1 relapse đã ghi trước đó), relapse đó tự động bị bỏ qua khi tính "since" — được hiểu là thuộc về lần cố gắng cai trước, không phải lỗi dữ liệu cần chặn. Không cần validate chéo giữa `quitStartedAt` và relapse đã có khi tạo/sửa Habit — chỉ cần tính đúng công thức này ở phía đọc.

**Ranh giới ngày (timezone):** `occurredAt` là instant đầy đủ (giờ/phút/giây), còn `quitStartedAt` chỉ là ngày (`@db.Date`, không có thời gian) — "daysSince" là hiệu số **ngày lịch** (calendar day), không phải hiệu số 24h thô. Ranh giới ngày lịch xác định theo timezone của owner, nhất quán với cách `Today` context đã làm (`resolveTodayCalendarDate(instant, owner.timeZone)`) — không dùng UTC hay giờ server. Ví dụ: relapse lúc 23:50 giờ địa phương của owner và "hôm nay" lúc 00:10 hôm sau (giờ địa phương) → `daysSince = 1`, dù khoảng cách tuyệt đối chưa tới 20 phút.

## BR-HAB2-005 — Quit Start Date Cannot Be in the Future

`quitStartedAt` không được là ngày sau ngày hiện tại — QUIT-type luôn có hiệu lực kể từ bây giờ, không có khái niệm "sẽ bắt đầu cai từ tương lai".

## BR-HAB2-006 — Relapse Logging Requires Active State and QUIT Type

Chỉ Habit đang `ACTIVE` **và** thuộc loại QUIT mới ghi nhận relapse được — nhất quán với `HabitCheckIn` (chỉ Habit `ACTIVE` mới check-in được, `HABIT_CHECK_IN_FORBIDDEN`).

## BR-HAB2-007 — Check-In Requires BUILD Type

Ngược lại `BR-HAB2-006`: check-in (`HabitCheckIn`) chỉ áp dụng cho Habit thuộc loại BUILD. Gọi check-in trên Habit QUIT-type bị từ chối — `HabitCheckInContextService`/`OwnedHabitReader` đã được mở rộng thêm kiểm tra `type` (bên cạnh `isActive`), tương tự cách `RoutineHabitReadModel` đã được mở rộng cho `KD-HAB2-005` (xem `06-domain-analysis.md` §6b).

## BR-HAB2-008 — Type Is Immutable After Creation

Một khi Habit đã được tạo với loại BUILD hoặc QUIT, loại này không thể thay đổi (`KD-HAB2-008`) — cả 2 chiều đổi loại đều để lại dữ liệu cũ (check-in/frequency hoặc relapse/quitStartedAt) không có cách xử lý rõ ràng.

## BR-HAB2-009 — QUIT-Type Reuses BUILD-Type's Archive/Restore Rules

`BR-HAB-003` (Archive Eligibility) và `BR-HAB-004` (Restore Eligibility) áp dụng nguyên vẹn cho QUIT-type, không có rule riêng. Archive/Restore chỉ mang đúng 1 ý nghĩa cho mọi loại Habit — tạm ngưng/khôi phục theo dõi hằng ngày, không xóa dữ liệu, đảo ngược được — **không phải** trạng thái "đã cai thành công/hoàn thành". QUIT-type không có khái niệm "hoàn thành" (nhất quán với việc nó không có lifecycle kết thúc — xem `01-ba-overview.md`).

Khi QUIT-type đang `ARCHIVED`: không nhận relapse mới (`BR-HAB2-006`), không sửa được (`title`/`quitStartedAt`), nhưng relapse cũ và `quitStartedAt` giữ nguyên — Restore lại thì "since" tính tiếp bình thường theo `BR-HAB2-004`.

## BR-HAB2-010 — QUIT-Type Cannot Be Added to a Routine

Routine chỉ chấp nhận Habit thuộc loại BUILD. Cố thêm một Habit QUIT vào Routine là hành động không hợp lệ.

## BR-HAB2-011 — QUIT-Type Is Excluded from Today

Truy vấn "hôm nay cần làm gì" chỉ xét Habit có `frequency` khớp ngày hiện tại. Vì QUIT-type không có `frequency` (`BR-HAB2-001`), nó không bao giờ xuất hiện trong Today — đây là hệ quả tự nhiên, không phải rule cần enforce riêng.

## BR-HAB2-012 — Existing Habits Default to BUILD

Habit đã tồn tại trước khi V2 triển khai được gán `type = BUILD` khi migrate dữ liệu.

---

# 4. Out of Scope

Xem `01-ba-overview.md` §8.

---

# 5. Next Step

```text
04. Use Cases & Acceptance Criteria (Habit V2)
```
